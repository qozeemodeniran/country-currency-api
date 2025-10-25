const app = require('./app');
const database = require('./config/database');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Initialize database
    await database.initDatabase();
    console.log('Database initialized successfully');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('JawsDB MySQL configuration loaded successfully');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();