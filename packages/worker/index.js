const cron = require('node-cron');

console.log('Worker started');

// Placeholder for garbage collection job
cron.schedule('*/5 * * * *', () => {
  console.log('Running garbage collection...');
  // TODO: Implement expired message cleanup
});

console.log('Garbage collection scheduled every 5 minutes');