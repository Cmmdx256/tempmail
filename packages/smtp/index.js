const { SMTPServer } = require('smtp-server');

const server = new SMTPServer({
  onData(stream, session, callback) {
    console.log('Received email for:', session.envelope.rcptTo);
    // Basic email processing placeholder
    stream.pipe(process.stdout);
    stream.on('end', callback);
  },
  disabledCommands: ['AUTH']
});

const port = process.env.SMTP_BIND_PORT || 2525;
server.listen(port, () => {
  console.log(`SMTP server listening on port ${port}`);
});