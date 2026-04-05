import axios from 'axios';
import Server from '../models/Server.js';
import Log from '../models/Log.js';

// Map to store monitoring intervals per server
const activeIntervals = new Map();

/**
 * Perform a single health check for a server
 * @param {Object} server - Server document from database
 * @param {number} attemptNumber - Current attempt number (for retries)
 * @returns {Object} Check result with status and details
 */
const performHealthCheck = async (server, attemptNumber = 1) => {
  const startTime = Date.now();

  try {
    const response = await axios.get(server.url, {
      timeout: server.timeout,
      validateStatus: () => true, // Accept any status code
      headers: {
        'User-Agent': 'Sentinel-Pulse-Monitor/1.0',
      },
    });

    const responseTime = Date.now() - startTime;

    // Determine status based on response code
    const isHealthy = response.status >= 200 && response.status < 300;
    const status = isHealthy ? 'UP' : 'DOWN';

    return {
      status,
      responseCode: response.status,
      responseTime,
      message: `HTTP ${response.status}`,
      errorType: null,
      retry: false,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    // Determine error type
    let errorType = 'UNKNOWN';
    let shouldRetry = attemptNumber < server.retryAttempts;

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      errorType = 'TIMEOUT';
      shouldRetry = true;
    } else if (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'EHOSTUNREACH'
    ) {
      errorType = 'CONNECTION_ERROR';
    } else if (error.response) {
      errorType = 'HTTP_ERROR';
    }

    return {
      status: 'DOWN',
      responseCode: error.response?.status || null,
      responseTime,
      message: error.message,
      errorType,
      retry: shouldRetry,
      errorDetails: error.toString(),
    };
  }
};

/**
 * Monitor a single server with retry logic
 * @param {string} serverId - MongoDB Server ID
 */
const monitorServer = async (serverId) => {
  try {
    // Fetch latest server configuration
    const server = await Server.findById(serverId);

    if (!server) {
      console.log(`Server ${serverId} not found, stopping monitor`);
      stopMoniotring(serverId);
      return;
    }

    if (!server.isMonitoring) {
      console.log(`Monitoring disabled for server: ${server.name}`);
      return;
    }

    console.log(`[MONITOR] Checking ${server.name} (${server.url})`);

    let result = await performHealthCheck(server, 1);

    // Retry logic
    if (result.retry && result.status === 'DOWN') {
      for (let attempt = 2; attempt <= server.retryAttempts; attempt++) {
        console.log(
          `[MONITOR] Retry ${attempt}/${server.retryAttempts} for ${server.name}`
        );

        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));

        result = await performHealthCheck(server, attempt);
        if (result.status === 'UP') {
          result.retry = false;
          break;
        }
      }
    }

    // Update server status
    const previousStatus = server.status;
    server.status = result.status;
    server.responseTime = result.responseTime;
    server.lastChecked = new Date();

    // Track consecutive failures
    if (result.status === 'DOWN') {
      server.consecutiveFailures += 1;
    } else {
      server.consecutiveFailures = 0;
    }

    // Record status change time
    if (previousStatus !== result.status) {
      server.lastStatusChange = new Date();
      console.log(
        `[STATUS_CHANGE] ${server.name}: ${previousStatus} → ${result.status}`
      );
    }

    await server.save();

    // Create log entry
    const log = new Log({
      serverId: server._id,
      status: result.status === 'UP' ? 'UP' : result.errorType || 'ERROR',
      responseCode: result.responseCode,
      responseTime: result.responseTime,
      message: result.message,
      errorType: result.errorType,
      errorDetails: result.errorDetails,
      retryCount: result.retry ? server.retryAttempts - 1 : 0,
    });

    await log.save();

    console.log(
      `[MONITOR] ${server.name} - Status: ${result.status} - Response: ${result.responseTime}ms`
    );
  } catch (error) {
    console.error(`[ERROR] Monitor error for server ${serverId}:`, error.message);
  }
};

/**
 * Start monitoring a server at specified interval
 * @param {string} serverId - MongoDB Server ID
 * @param {number} interval - Interval in seconds
 */
const startMonitoring = (serverId, interval) => {
  // Clear existing interval if any
  if (activeIntervals.has(serverId)) {
    clearInterval(activeIntervals.get(serverId));
  }

  // Run health check immediately
  monitorServer(serverId);

  // Then run at specified interval
  const intervalId = setInterval(() => {
    monitorServer(serverId);
  }, interval * 1000);

  activeIntervals.set(serverId, intervalId);
  console.log(`[SCHEDULER] Started monitoring for server ${serverId} (${interval}s interval)`);
};

/**
 * Stop monitoring a server
 * @param {string} serverId - MongoDB Server ID
 */
const stopMoniotring = (serverId) => {
  if (activeIntervals.has(serverId)) {
    clearInterval(activeIntervals.get(serverId));
    activeIntervals.delete(serverId);
    console.log(`[SCHEDULER] Stopped monitoring for server ${serverId}`);
  }
};

/**
 * Initialize monitoring for all active servers
 * Call this on application startup
 */
const initializeMonitoring = async () => {
  try {
    console.log('=== Initializing Server Monitoring ===');

    const servers = await Server.find({ isMonitoring: true });

    if (servers.length === 0) {
      console.log('[INFO] No servers configured for monitoring');
      return;
    }

    for (const server of servers) {
      startMonitoring(server._id.toString(), server.monitoringInterval);
    }

    console.log(`[SCHEDULER] Monitoring initialized for ${servers.length} servers`);
  } catch (error) {
    console.error('[ERROR] Failed to initialize monitoring:', error.message);
  }
};

/**
 * Cleanup all monitoring intervals
 * Call this on application shutdown
 */
const stopAllMonitoring = () => {
  console.log('=== Stopping All Monitoring ===');

  for (const [serverId, intervalId] of activeIntervals.entries()) {
    clearInterval(intervalId);
    console.log(`[SCHEDULER] Stopped monitoring for server ${serverId}`);
  }

  activeIntervals.clear();
};

/**
 * Update monitoring interval for a server
 * @param {string} serverId - MongoDB Server ID
 * @param {number} newInterval - New interval in seconds
 */
const updateMonitoringInterval = (serverId, newInterval) => {
  stopMoniotring(serverId);
  startMonitoring(serverId, newInterval);
};

export default {
  startMonitoring,
  stopMoniotring,
  initializeMonitoring,
  stopAllMonitoring,
  updateMonitoringInterval,
  monitorServer,
};
