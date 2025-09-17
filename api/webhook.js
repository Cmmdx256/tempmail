// GitHub Pages Webhook Handler for Mailgun
// This can be deployed to Vercel, Netlify Functions, or any serverless platform

const crypto = require('crypto');

function verifyMailgunWebhook(signature, timestamp, token, webhookSigningKey) {
  const encodedToken = crypto
    .createHmac('sha256', webhookSigningKey)
    .update(timestamp.concat(token))
    .digest('hex');

  return encodedToken === signature;
}

module.exports = async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { signature, timestamp, token } = req.headers;
    const webhookSigningKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;

    // Verify webhook authenticity (optional but recommended)
    if (webhookSigningKey && !verifyMailgunWebhook(signature, timestamp, token, webhookSigningKey)) {
      console.log('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const mailData = req.body;

    // Extract recipient address
    const recipient = mailData.recipient || mailData.To || '';
    const [localPart, domain] = recipient.split('@');

    if (!localPart || !domain) {
      return res.status(400).json({ error: 'Invalid recipient address' });
    }

    // Prepare data for GitHub repository dispatch
    const dispatchData = {
      event_type: 'inbound_mail',
      client_payload: {
        address: localPart,
        mail_data: {
          sender: mailData.sender || mailData.From || '',
          recipient: recipient,
          subject: mailData.subject || mailData.Subject || '',
          'body-plain': mailData['body-plain'] || mailData['body-plain'] || '',
          'body-html': mailData['body-html'] || mailData['body-html'] || '',
          'stripped-html': mailData['stripped-html'] || mailData['stripped-html'] || '',
          timestamp: mailData.timestamp || Date.now(),
          attachments: mailData.attachments || []
        }
      }
    };

    // GitHub Repository Dispatch API call
    const githubResponse = await fetch(
      `https://api.github.com/repos/${process.env.GITHUB_REPO}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dispatchData)
      }
    );

    if (!githubResponse.ok) {
      console.error('Failed to dispatch to GitHub:', await githubResponse.text());
      return res.status(500).json({ error: 'Failed to process mail' });
    }

    console.log(`Mail processed for ${recipient}`);
    res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};