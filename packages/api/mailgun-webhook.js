// Example Mailgun webhook integration
// Add this to your API server

const crypto = require('crypto');

function verifyMailgunWebhook(signature, timestamp, token, webhookSigningKey) {
  const encodedToken = crypto
    .createHmac('sha256', webhookSigningKey)
    .update(timestamp.concat(token))
    .digest('hex');

  return encodedToken === signature;
}

module.exports = async function handleMailgunWebhook(request, reply) {
  const { signature, timestamp, token } = request.headers;
  const webhookSigningKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;

  // Verify webhook authenticity
  if (!verifyMailgunWebhook(signature, timestamp, token, webhookSigningKey)) {
    return reply.code(401).send({ error: 'Invalid signature' });
  }

  const {
    event,
    recipient,
    sender,
    subject,
    'body-plain': bodyPlain,
    'body-html': bodyHtml,
    'stripped-html': strippedHtml,
    'message-headers': messageHeaders,
    timestamp: emailTimestamp
  } = request.body;

  console.log(`Received ${event} event for ${recipient}`);

  // Process different event types
  switch (event) {
    case 'delivered':
      // Email was delivered successfully
      break;

    case 'failed':
      // Email delivery failed
      break;

    case 'unsubscribed':
      // User unsubscribed
      break;

    default:
      // Handle other events
      break;
  }

  // Extract address from recipient (e.g., abc123@yourdomain.com)
  const [localPart, domain] = recipient.split('@');

  // Find the address in database
  // const address = await db.query('SELECT * FROM addresses WHERE local_part = $1 AND domain = $2', [localPart, domain]);

  // Parse message headers
  const headers = {};
  if (messageHeaders && Array.isArray(messageHeaders)) {
    messageHeaders.forEach(([key, value]) => {
      headers[key] = value;
    });
  }

  // Save message to database
  const messageData = {
    address_id: 'address-uuid', // From database lookup
    from_address: sender,
    subject: subject || '',
    headers: JSON.stringify(headers),
    body_text: bodyPlain || '',
    body_html: bodyHtml || strippedHtml || '',
    received_at: new Date(emailTimestamp * 1000),
    expires_at: new Date(Date.now() + 3600000) // 1 hour from now
  };

  // TODO: Save to database
  // await db.query('INSERT INTO messages (...) VALUES (...)', [...]);

  // TODO: Send WebSocket notification to frontend
  // wss.clients.forEach(client => {
  //   if (client.readyState === WebSocket.OPEN) {
  //     client.send(JSON.stringify({ type: 'new_message', data: messageData }));
  //   }
  // });

  return { status: 'ok' };
};

// Usage in main server file:
/*
fastify.post('/webhooks/mailgun', async (request, reply) => {
  return handleMailgunWebhook(request, reply);
});
*/