import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from './config/database.js';
import monitorService from './services/monitorService.js';
import serverRoutes from './routes/serverRoutes.js';
import * as serverController from './controllers/serverController.js';

// Load environment variables
dotenv.config();

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sentinel-pulse';

// ========== MIDDLEWARE ==========
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== PAGE ROUTES (EJS VIEWS) ==========
// Dashboard page
app.get('/', async (req, res) => {
  try {
    // Create a mock response object to capture API response
    const mockRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.body = data;
        return this;
      },
      statusCode: 200,
      body: null
    };

    // Call the controller directly
    await serverController.getDashboardStats(req, mockRes);
    const dashboardData = mockRes.body;
    
    const { summary = {}, servers = [], recentLogs = [] } = dashboardData.data || {};
    
    res.render('index', { 
      active: 'home',
      summary: {
        totalServers: summary.totalServers || 0,
        upServers: summary.upServers || 0,
        downServers: summary.downServers || 0,
        unknownServers: summary.unknownServers || 0,
        overallUptime: summary.overallUptime || 0,
        avgResponseTime: summary.avgResponseTime || 0
      },
      servers: servers || [],
      recentLogs: recentLogs || []
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error.message);
    res.render('index', { 
      active: 'home',
      summary: { totalServers: 0, upServers: 0, downServers: 0, unknownServers: 0, overallUptime: 0, avgResponseTime: 0 },
      servers: [],
      recentLogs: []
    });
  }
});

// Nodes page
app.get('/nodes', async (req, res) => {
  try {
    const response = await fetch('http://localhost:' + PORT + '/api/servers');
    const serversData = await response.json();
    res.render('nodes', { 
      active: 'nodes',
      servers: serversData.data || []
    });
  } catch (error) {
    console.error('Error fetching servers:', error.message);
    res.render('nodes', { 
      active: 'nodes',
      servers: []
    });
  }
});

// Logs page
app.get('/logs', async (req, res) => {
  try {
    const response = await fetch('http://localhost:' + PORT + '/api/servers');
    const serversData = await response.json();
    res.render('logs', { 
      active: 'logs',
      servers: serversData.data || []
    });
  } catch (error) {
    console.error('Error fetching servers:', error.message);
    res.render('logs', { 
      active: 'logs',
      servers: []
    });
  }
});

// Provision page
app.get('/provision', (req, res) => {
  res.render('provision', { active: 'config' });
});

// ========== API ROUTES ==========
// Server API routes
app.use('/api/servers', serverRoutes);

// ========== ERROR HANDLING ==========
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// ========== SERVER STARTUP ==========
const startServer = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await connectDB(MONGODB_URI);

    // Start Express server
    const server = app.listen(PORT, HOST, () => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🚀 Sentinel Pulse Server Running`);
      console.log(`${'='.repeat(60)}`);
      console.log(`📍 Server: http://${HOST}:${PORT}`);
      console.log(`📊 Dashboard: http://localhost:${PORT}`);
      console.log(`📡 API: http://localhost:${PORT}/api/servers`);
      console.log(`${'='.repeat(60)}\n`);
    });

    // Initialize monitoring service for all servers
    setTimeout(() => {
      monitorService.initializeMonitoring();
    }, 2000);

    // Graceful shutdown
    const gracefulShutdown = async () => {
      console.log('\n\n🛑 Shutting down gracefully...');
      monitorService.stopAllMonitoring();
      await disconnectDB();
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();
