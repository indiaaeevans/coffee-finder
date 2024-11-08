// server/index.js
const app = require('./app');
const config = require('./config');

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  throw error;
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  throw error;
});

async function startServer() {
  try {
    const port = config.port || 4000;
    const host = config.host || 'localhost';

    app.listen(port, host, () => {
      console.log(`Server running at http://${host}:${port}`);
      console.log('Environment:', process.env.NODE_ENV || 'development');
    });

  } catch (error) {
    console.error('Error starting server:', error);
    throw error;
  }
}

startServer();
