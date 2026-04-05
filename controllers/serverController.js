import Server from '../models/Server.js';
import Log from '../models/Log.js';
import monitorService from '../services/monitorService.js';

/**
 * Get all servers
 * @route GET /api/servers
 */
export const getAllServers = async (req, res) => {
  try {
    const servers = await Server.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: servers.length,
      data: servers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get single server by ID
 * @route GET /api/servers/:id
 */
export const getServer = async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);

    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    res.status(200).json({
      success: true,
      data: server,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Create new server
 * @route POST /api/servers
 */
export const createServer = async (req, res) => {
  try {
    const { name, url, monitoringInterval, retryAttempts, timeout, notes } = req.body;

    // Validation
    if (!name || !url) {
      return res.status(400).json({
        success: false,
        message: 'Name and URL are required',
      });
    }

    // Check URL format
    const urlRegex = /^https?:\/\/.+/;
    if (!urlRegex.test(url)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL format. Must start with http:// or https://',
      });
    }

    // Check if URL already exists
    const existingServer = await Server.findOne({ url });
    if (existingServer) {
      return res.status(400).json({
        success: false,
        message: 'A server with this URL already exists',
      });
    }

    const serverData = {
      name,
      url,
      monitoringInterval: monitoringInterval || 30,
      retryAttempts: retryAttempts || 2,
      timeout: timeout || 10000,
      notes: notes || '',
      isMonitoring: true,
    };

    const server = await Server.create(serverData);

    // Start monitoring this new server
    monitorService.startMonitoring(
      server._id.toString(),
      server.monitoringInterval
    );

    res.status(201).json({
      success: true,
      message: 'Server created and monitoring started',
      data: server,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update server configuration
 * @route PUT /api/servers/:id
 */
export const updateServer = async (req, res) => {
  try {
    const { name, url, monitoringInterval, retryAttempts, timeout, isMonitoring, notes } =
      req.body;

    const server = await Server.findById(req.params.id);

    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    // Update fields
    if (name) server.name = name;
    if (url) {
      // Validate URL format
      const urlRegex = /^https?:\/\/.+/;
      if (!urlRegex.test(url)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid URL format',
        });
      }

      // Check if new URL already exists
      if (url !== server.url) {
        const existingServer = await Server.findOne({ url });
        if (existingServer) {
          return res.status(400).json({
            success: false,
            message: 'A server with this URL already exists',
          });
        }
      }

      server.url = url;
    }

    if (monitoringInterval) {
      server.monitoringInterval = monitoringInterval;
    }

    if (retryAttempts !== undefined) {
      server.retryAttempts = retryAttempts;
    }

    if (timeout) {
      server.timeout = timeout;
    }

    if (notes !== undefined) {
      server.notes = notes;
    }

    // Handle monitoring status change
    const previousMonitoringStatus = server.isMonitoring;
    if (isMonitoring !== undefined) {
      server.isMonitoring = isMonitoring;

      if (previousMonitoringStatus !== isMonitoring) {
        if (isMonitoring) {
          monitorService.startMonitoring(server._id.toString(), server.monitoringInterval);
        } else {
          monitorService.stopMoniotring(server._id.toString());
        }
      }
    }

    // If monitoring interval changed, update the scheduler
    if (monitoringInterval && previousMonitoringStatus) {
      monitorService.updateMonitoringInterval(server._id.toString(), monitoringInterval);
    }

    await server.save();

    res.status(200).json({
      success: true,
      message: 'Server updated successfully',
      data: server,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete server
 * @route DELETE /api/servers/:id
 */
export const deleteServer = async (req, res) => {
  try {
    const server = await Server.findByIdAndDelete(req.params.id);

    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    // Stop monitoring
    monitorService.stopMoniotring(req.params.id);

    // Delete related logs
    await Log.deleteMany({ serverId: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Server and related logs deleted successfully',
      data: server,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get logs for a server
 * @route GET /api/servers/:id/logs
 */
export const getServerLogs = async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const logs = await Log.find({ serverId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Log.countDocuments({ serverId: req.params.id });

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get server statistics
 * @route GET /api/servers/:id/stats
 */
export const getServerStats = async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);

    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    // Get logs from last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stats = await Log.aggregate([
      {
        $match: {
          serverId: server._id,
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

    // Calculate uptime percentage
    const totalChecks = await Log.countDocuments({
      serverId: server._id,
      createdAt: { $gte: twentyFourHoursAgo },
    });

    const upChecks = await Log.countDocuments({
      serverId: server._id,
      status: 'UP',
      createdAt: { $gte: twentyFourHoursAgo },
    });

    const uptime = totalChecks > 0 ? ((upChecks / totalChecks) * 100).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      data: {
        server: {
          id: server._id,
          name: server.name,
          url: server.url,
          status: server.status,
          responseTime: server.responseTime,
          lastChecked: server.lastChecked,
        },
        stats: {
          totalChecks,
          upChecks,
          downChecks: stats.find((s) => s._id === 'DOWN')?.count || 0,
          timeoutChecks: stats.find((s) => s._id === 'TIMEOUT')?.count || 0,
          uptime: parseFloat(uptime),
          avgResponseTime: Math.round(
            stats.reduce((sum, s) => sum + (s.avgResponseTime || 0), 0) / stats.length
          ),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Manually trigger health check for a server
 * @route POST /api/servers/:id/check
 */
export const manualHealthCheck = async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);

    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    // Trigger immediate health check
    await monitorService.monitorServer(req.params.id);

    // Fetch updated server
    const updatedServer = await Server.findById(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Health check completed',
      data: updatedServer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get dashboard statistics
 * @route GET /api/dashboard
 */
export const getDashboardStats = async (req, res) => {
  try {
    const servers = await Server.find();

    const totalServers = servers.length;
    const upServers = servers.filter((s) => s.status === 'UP').length;
    const downServers = servers.filter((s) => s.status === 'DOWN').length;
    const unknownServers = servers.filter((s) => s.status === 'UNKNOWN').length;

    // Get recent logs
    const recentLogs = await Log.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('serverId', 'name url');

    // Calculate overall uptime
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const totalChecks = await Log.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } });
    const upChecks = await Log.countDocuments({
      status: 'UP',
      createdAt: { $gte: twentyFourHoursAgo },
    });
    const overallUptime = totalChecks > 0 ? ((upChecks / totalChecks) * 100).toFixed(2) : 0;

    // Average response time
    const avgResponseTimeResult = await Log.aggregate([
      {
        $match: { createdAt: { $gte: twentyFourHoursAgo } },
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$responseTime' },
        },
      },
    ]);

    const avgResponseTime = Math.round(avgResponseTimeResult[0]?.avgTime || 0);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalServers,
          upServers,
          downServers,
          unknownServers,
          overallUptime: parseFloat(overallUptime),
          avgResponseTime,
        },
        servers: servers.map((s) => ({
          id: s._id,
          name: s.name,
          url: s.url,
          status: s.status,
          statusColor: s.statusColor,
          responseTime: s.responseTime,
          lastChecked: s.lastChecked,
          lastCheckedAgo: s.lastCheckedAgo,
          interval: s.monitoringInterval,
          isMonitoring: s.isMonitoring,
        })),
        recentLogs: recentLogs.map((log) => ({
          id: log._id,
          serverName: log.serverId?.name,
          status: log.status,
          responseCode: log.responseCode,
          responseTime: log.responseTime,
          message: log.message,
          timestamp: log.createdAt,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
