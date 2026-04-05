import mongoose from 'mongoose';

/**
 * Connect to MongoDB
 * @param {string} mongoUri - MongoDB connection string from environment
 */
const connectDB = async (mongoUri) => {
  try {
    // Connection options
    const options = {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    };

    const conn = await mongoose.connect(mongoUri, options);

    console.log(`[DATABASE] MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[DATABASE ERROR] Connection failed: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB
 */
const disconnectDB = async () => {
  try {
    if (mongoose.conn.readyState) {
      await mongoose.disconnect();
      console.log('[DATABASE] MongoDB disconnected');
    }
  } catch (error) {
    console.error('[DATABASE ERROR] Disconnection failed:', error.message);
    process.exit(1);
  }
};

export { connectDB, disconnectDB };
