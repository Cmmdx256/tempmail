const fastify = require('fastify')({ logger: true });

// CORS configuration for GitHub Pages
fastify.register(require('@fastify/cors'), {
  origin: true, // Allow all origins for development, restrict in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Create new temporary email address
fastify.post('/v1/create', async (request, reply) => {
  const { ttl = 3600 } = request.body; // Default 1 hour

  // Generate random local part
  const localPart = Math.random().toString(36).substring(2, 15);
  const domain = process.env.DOMAIN_LIST?.split(',')[0] || 'example.com';
  const fullAddress = `${localPart}@${domain}`;

  // Calculate expiration
  const expiresAt = new Date(Date.now() + ttl * 1000);

  // TODO: Save to database
  const addressData = {
    id: Math.random().toString(36).substring(2, 15),
    address: fullAddress,
    created_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
    token: Math.random().toString(36).substring(2, 15)
  };

  return addressData;
});

// Get messages for an address
fastify.get('/v1/messages', async (request, reply) => {
  const { address } = request.query;

  if (!address) {
    return reply.code(400).send({ error: 'Address parameter required' });
  }

  // TODO: Fetch from database
  // For now, return empty array
  return [];
});

// WebSocket for real-time updates (placeholder)
fastify.get('/ws', { websocket: true }, (connection, req) => {
  console.log('WebSocket connection established');

  connection.socket.on('message', (message) => {
    console.log('Received message:', message);
  });

  connection.socket.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

// Start server
const start = async () => {
  try {
    const port = process.env.API_PORT || 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`API server listening on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();