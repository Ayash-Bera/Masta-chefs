const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Check if DATABASE_URL is provided
    if (!process.env.DATABASE_URL) {
      console.warn('⚠️  Warning: DATABASE_URL not provided. Running without database connection.');
      console.warn('⚠️  Some features requiring persistent storage will not work.');
      return null;
    }

    const conn = await mongoose.connect(process.env.DATABASE_URL, {
      // Remove deprecated options that are now default
      // useNewUrlParser and useUnifiedTopology are deprecated and default to true
    });

    console.log(`📁 MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);

    // In development, continue without database
    if (process.env.NODE_ENV === 'development') {
      console.warn('🔧 Development mode: Continuing without database...');
      return null;
    }

    // In production, exit if database connection fails
    process.exit(1);
  }
};

module.exports = connectDB;