import mongoose from 'mongoose';

// Log Schema to track monitoring history
const logSchema = new mongoose.Schema(
  {
    // Reference to Server
    serverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Server',
      required: true,
      index: true,
    },

    // Check Details
    status: {
      type: String,
      enum: ['UP', 'DOWN', 'TIMEOUT', 'ERROR'],
      required: true,
    },

    // Response Information
    responseCode: {
      type: Number,
      default: null,
    },
    responseTime: {
      type: Number,
      default: 0, // milliseconds
    },
    message: {
      type: String,
      trim: true,
    },

    // Error Tracking
    errorType: {
      type: String,
      enum: ['CONNECTION_ERROR', 'TIMEOUT', 'HTTP_ERROR', 'UNKNOWN', null],
      default: null,
    },
    errorDetails: {
      type: String,
    },

    // Retry Information
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Index for efficient queries
logSchema.index({ serverId: 1, createdAt: -1 });
logSchema.index({ status: 1 });

// Static method to get daily statistics for a server
logSchema.statics.getDailyStats = async function (serverId) {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const stats = await this.aggregate([
    {
      $match: {
        serverId: mongoose.Types.ObjectId(serverId),
        createdAt: { $gte: twentyFourHoursAgo },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgResponseTime: { $avg: '$responseTime' },
      },
    },
  ]);

  return stats;
};

export default mongoose.model('Log', logSchema);
