// Universal Webhook Handler for Multiple Temp-Mail Providers
// This handles webhooks from Mailgun, 1secmail, Mail.tm, and other providers

const crypto = require('crypto');

function verifyMailgunWebhook(signature, timestamp, token, webhookSigningKey) {
  const encodedToken = crypto
    .createHmac('sha256', webhookSigningKey)
    .update(timestamp.concat(token))
    .digest('hex');

  return encodedToken === signature;
}

function parseMailgunData(mailData) {
  return {
    from: mailData.sender || mailData.From || '',
    to: mailData.recipient || mailData.To || '',
    subject: mailData.subject || mailData.Subject || '',
    body_text: mailData['body-plain'] || mailData['body-plain'] || '',
    body_html: mailData['body-html'] || mailData['body-html'] || '',
    attachments: mailData.attachments || [],
    timestamp: mailData.timestamp || Date.now(),
    provider: 'mailgun'
  };
}

function parse1SecMailData(mailData) {
  return {
    from: mailData.from || '',
    to: mailData.to || '',
    subject: mailData.subject || '',
    body_text: mailData.text || '',
    body_html: mailData.html || '',
    attachments: mailData.attachments || [],
    timestamp: mailData.date || Date.now(),
    provider: '1secmail'
  };
}

function parseMailTmData(mailData) {
  return {
    from: mailData.from || '',
    to: mailData.to || '',
    subject: mailData.subject || '',
    body_text: mailData.text || '',
    body_html: mailData.html || '',
    attachments: mailData.attachments || [],
    timestamp: mailData.date || Date.now(),
    provider: 'mailtm'
  };
}

function extractLocalPart(emailAddress) {
  const [localPart] = emailAddress.split('@');
  return localPart;
}

async function triggerGitHubAction(address, mailData) {
  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = process.env.GITHUB_REPO || 'cmmdx256/cmmdx256.github.io';

  if (!githubToken) {
    console.error('GITHUB_TOKEN not configured');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${githubRepo}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_type: 'inbound_mail',
          client_payload: {
            address: address,
            mail_data: mailData
          }
        })
      }
    );

    if (!response.ok) {
      console.error('Failed to dispatch to GitHub:', await response.text());
      return false;
    }

    console.log(`Successfully dispatched mail for ${address}`);
    return true;

  } catch (error) {
    console.error('Error dispatching to GitHub:', error);
    return false;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userAgent = req.headers['user-agent'] || '';
    const contentType = req.headers['content-type'] || '';

    let mailData;
    let address;

    // Detect webhook provider and parse accordingly
    if (userAgent.includes('Mailgun') || req.headers['x-mailgun-signature']) {
      // Mailgun webhook
      const { signature, timestamp, token } = req.headers;
      const webhookSigningKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;

      if (webhookSigningKey && !verifyMailgunWebhook(signature, timestamp, token, webhookSigningKey)) {
        return res.status(401).json({ error: 'Invalid Mailgun signature' });
      }

      mailData = parseMailgunData(req.body);
      address = extractLocalPart(mailData.to);

    } else if (contentType.includes('1secmail') || userAgent.includes('1secmail')) {
      // 1secmail webhook
      mailData = parse1SecMailData(req.body);
      address = extractLocalPart(mailData.to);

    } else if (contentType.includes('mailtm') || userAgent.includes('mailtm')) {
      // Mail.tm webhook
      mailData = parseMailTmData(req.body);
      address = extractLocalPart(mailData.to);

    } else {
      // Generic webhook (try to parse as Mailgun format)
      mailData = parseMailgunData(req.body);
      address = extractLocalPart(mailData.to);
    }

    if (!address) {
      return res.status(400).json({ error: 'Could not extract address from webhook' });
    }

    // Trigger GitHub Action to process the email
    const success = await triggerGitHubAction(address, mailData);

    if (success) {
      res.status(200).json({
        status: 'ok',
        message: `Mail processed for ${address}`,
        provider: mailData.provider
      });
    } else {
      res.status(500).json({ error: 'Failed to process mail' });
    }

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};