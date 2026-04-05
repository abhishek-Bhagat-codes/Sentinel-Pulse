import mongoose from 'mongoose';

// Server Schema for monitoring configuration
const serverSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, 'Server name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    url: {
      type: String,
      required: [true, 'Server URL is required'],
      trim: true,
      match: [/^https?:\/\/.+/, 'Please provide a valid HTTP/HTTPS URL'],
    },

    // Monitoring Configuration
    monitoringInterval: {
      type: Number,
      default: 30,
      min: [5, 'Interval must be at least 5 seconds'],
      max: [3600, 'Interval cannot exceed 3600 seconds'],
    },

    // Status Information
    status: {
      type: String,
      enum: ['UP', 'DOWN', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    lastChecked: {
      type: Date,
      default: null,
    },
    lastStatusChange: {
      type: Date,
      default: null,
    },

    // Response Metrics
    responseTime: {
      type: Number,
      default: 0, // milliseconds
    },
    consecutiveFailures: {
      type: Number,
      default: 0,
    },

    // Monitoring Configuration
    retryAttempts: {
      type: Number,
      default: 2,
      min: 0,
      max: 5,
    },
    timeout: {
      type: Number,
      default: 10000, // milliseconds
      min: 1000,
      max: 60000,
    },

    // Status History
    uptime: {
      type: Number,
      default: 100, // percentage
    },

    // Activity Tracking
    isMonitoring: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Create unique index on URL
serverSchema.index({ url: 1 });

// Virtual for human-readable status with color
serverSchema.virtual('statusColor').get(function () {
  switch (this.status) {
    case 'UP':
      return '#4edea3'; // primary green
    case 'DOWN':
      return '#fb7185'; // error red
    default:
      return '#94a3b8'; // gray
  }
});

// Virtual for last checked time in readable format
serverSchema.virtual('lastCheckedAgo').get(function () {
  if (!this.lastChecked) return 'Never';
  const seconds = Math.floor((Date.now() - this.lastChecked) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
});

// Ensure virtuals are serialized to JSON
serverSchema.set('toJSON', { virtuals: true });
serverSchema.set('toObject', { virtuals: true });

export default mongoose.model('Server', serverSchema);
