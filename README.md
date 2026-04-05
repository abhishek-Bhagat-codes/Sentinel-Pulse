# Sentinel Pulse - Open Source Server Monitoring System

A real-time infrastructure monitoring system that continuously monitors your servers' health, performance, and availability. Built with Node.js, Express, MongoDB, and a modern responsive UI.

![Version](https://img.shields.io/badge/version-0.0.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node.js](https://img.shields.io/badge/node-%3E%3D16.0-green)

## Features

✨ **Real-Time Monitoring**
- Continuous health checks for your servers (customizable intervals)
- Live status updates and response time tracking
- Automatic retry logic with exponential backoff

📊 **Comprehensive Dashboard**
- System status overview with uptime metrics
- Real-time network fleet visualization
- Performance analytics and trends
- Recent activity feed

🖥️ **Server Management**
- Easy server provisioning and configuration
- Monitor multiple servers simultaneously
- Customize health check intervals and timeout settings
- Enable/disable monitoring per server

📈 **Detailed Logging**
- Complete event history with timestamps
- Response code tracking
- Error classification and analysis
- Searchable logs with filtering options

🎨 **Modern UI**
- Dark theme with responsive design
- Mobile-friendly interface
- Real-time data visualization
- Smooth animations and transitions

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16.0 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v4.0 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **npm** or **yarn** - Comes with Node.js

## Installation

### Step 1: Clone or Download the Repository

```bash
# Clone from git
git clone https://github.com/yourusername/sentinel-pulse.git
cd sentinel-pulse

# Or extract the downloaded files
cd sentinel-pulse
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages:
- **express** - Web framework
- **mongoose** - MongoDB ODM
- **ejs** - Template engine
- **axios** - HTTP client for health checks
- **dotenv** - Environment variable management

### Step 3: Set Up Environment Variables

Create a `.env` file in the root directory and configure:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
HOST=0.0.0.0

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/sentinel-pulse

# Monitoring Configuration
DEFAULT_MONITORING_INTERVAL=30
DEFAULT_RETRY_ATTEMPTS=2
DEFAULT_TIMEOUT=10000

# Frontend Configuration
HOST=0.0.0.0

# Application
APP_NAME=Sentinel Pulse
```

**Configuration Details:**
- `PORT` - Server port (default: 3000)
- `MONGODB_URI` - MongoDB connection string
- `DEFAULT_MONITORING_INTERVAL` - Health check interval in seconds
- `DEFAULT_RETRY_ATTEMPTS` - Number of retry attempts for failed checks
- `DEFAULT_TIMEOUT` - Request timeout in milliseconds

### Step 4: Start MongoDB

Make sure MongoDB is running:

```bash
# On Windows
mongod

# On macOS
brew services start mongodb-community

# On Linux
sudo systemctl start mongod
```

Verify MongoDB is running by checking the connection string in your `.env` file.

### Step 5: Start the Application

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

You should see:
```
============================================================
🚀 Sentinel Pulse Server Running
============================================================
📍 Server: http://0.0.0.0:3000
📊 Dashboard: http://localhost:3000
📡 API: http://localhost:3000/api/servers
============================================================
```

Visit `http://localhost:3000` in your browser to access the dashboard.

## Adding Servers to Monitor

### Via Web Interface

1. Open the application in your browser: `http://localhost:3000`
2. Navigate to the "Config" tab (bottom menu)
3. Fill in the server details:
   - **Server Name** - Friendly name (e.g., "API Server", "Database Server")
   - **URL** - Full HTTP/HTTPS endpoint (e.g., `https://api.example.com/health`)
   - **Monitoring Interval** - Check frequency in seconds (default: 30)
   - **Retry Attempts** - Retries on failure (default: 2)
   - **Timeout** - Request timeout in milliseconds (default: 10000)
   - **Notes** - Optional description
4. Click "Add Server" to start monitoring

### Via API

```bash
curl -X POST http://localhost:3000/api/servers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API Server",
    "url": "https://api.example.com/health",
    "monitoringInterval": 30,
    "retryAttempts": 2,
    "timeout": 10000,
    "notes": "Production API endpoint"
  }'
```

## Project Structure

```
sentinel-pulse/
├── config/
│   └── database.js           # MongoDB connection
├── controllers/
│   └── serverController.js   # API logic
├── models/
│   ├── Server.js             # Server schema
│   └── Log.js                # Activity logs schema
├── routes/
│   └── serverRoutes.js       # API routes
├── services/
│   └── monitorService.js     # Monitoring engine
├── views/
│   ├── index.ejs             # Dashboard page
│   ├── nodes.ejs             # Servers list
│   ├── logs.ejs              # Activity logs
│   ├── provision.ejs         # Add servers
│   └── partials/
│       ├── head.ejs          # HTML head
│       └── nav.ejs           # Bottom navigation
├── public/
│   ├── css/                  # Stylesheets
│   └── js/                   # Client scripts
├── .env                      # Environment variables
├── package.json              # Dependencies
└── server.js                 # Entry point
```

## API Endpoints

### Get Dashboard Statistics
```
GET /api/servers/dashboard
Response: Summary, servers list, recent logs
```

### Get All Servers
```
GET /api/servers
Response: Array of servers with current status
```

### Create New Server
```
POST /api/servers
Body: { name, url, monitoringInterval, retryAttempts, timeout, notes }
```

### Get Server Details
```
GET /api/servers/:id
Response: Server configuration and status
```

### Update Server
```
PUT /api/servers/:id
Body: { name, url, monitoringInterval, retryAttempts, timeout, notes, isMonitoring }
```

### Delete Server
```
DELETE /api/servers/:id
```

### Get Server Logs
```
GET /api/servers/:id/logs
Response: Activity history for server
```

### Get Server Stats
```
GET /api/servers/:id/stats
Response: Performance metrics and uptime
```

### Manual Health Check
```
POST /api/servers/:id/check
Response: Immediate check result
```

## How Monitoring Works

1. **Initialization** - On startup, all active servers are loaded from MongoDB
2. **Health Checks** - Each server is checked at its configured interval
3. **Status Determination** - Response codes 200-299 = UP, others = DOWN
4. **Retry Logic** - Failed checks trigger automatic retries with exponential backoff
5. **Data Logging** - Results are stored with timestamps and response metrics
6. **Dashboard Update** - Real-time data feeds the dashboard UI

### Health Check Logic

```
Check Request
    ↓
Response Time < Timeout?
    ↓ YES: Status Code 200-299?
    ↓       ↓ YES: Mark UP ✓
    ↓       ↓ NO: Mark DOWN ✗ → Retry (if enabled)
    ↓ NO: Timeout Error → Mark DOWN ✗ → Retry
```

## Monitoring Intervals

Configure different check frequencies per server:
- **5 seconds** - Critical production APIs
- **30 seconds** - Standard servers (default)
- **5 minutes** - Non-critical services
- **1 hour** - Background services

## Troubleshooting

### MongoDB Connection Failed
```
Error: connect ECONNREFUSED
```
**Solution:** Ensure MongoDB is running and `MONGODB_URI` in `.env` is correct.

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution:** Kill the process or change `PORT` in `.env`:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### Server Not Responding to Health Checks
- Ensure the URL is accessible from your machine
- Check firewall settings
- Verify the endpoint returns HTTP status codes
- Increase `timeout` value if server is slow

### No Data Appearing on Dashboard
- Wait 30+ seconds for first health check to complete
- Check MongoDB connection
- Verify servers were added correctly
- Check browser console for errors (F12)

## Performance Tips

1. **Adjust Monitoring Intervals**
   - Don't check more frequently than necessary
   - Recommended minimum: 30 seconds

2. **Database Optimization**
   - Indexes are automatically created
   - Old logs can be pruned periodically

3. **Server Selection**
   - Use health check endpoints that respond quickly
   - Avoid heavy computations on check endpoints

## Development

### Running in Development Mode

```bash
npm run dev
```

This uses `nodemon` for automatic restart on file changes.

### Building for Production

```bash
npm start
```

### Project Dependencies

- **express** ^4.21.2 - Web framework
- **mongoose** ^8.0.3 - MongoDB ODM
- **ejs** ^3.1.10 - Template engine
- **axios** ^1.6.2 - HTTP client
- **dotenv** ^17.2.3 - Environment configuration

## Deployment

### Deploy to Vercel

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy

### Deploy to Heroku

```bash
heroku create your-app-name
git push heroku main
```

### Deploy to Self-Hosted Server

```bash
# SSH into your server
ssh user@your-server.com

# Clone repository
git clone https://github.com/yourusername/sentinel-pulse.git
cd sentinel-pulse

# Install dependencies
npm install

# Setup .env file
nano .env

# Start with PM2
npm install -g pm2
pm2 start server.js --name "sentinel-pulse"
pm2 startup
pm2 save
```

## Security Considerations

For production use:
1. Change `NODE_ENV` to `production`
2. Use strong `JWT_SECRET` (if adding auth)
3. Set up HTTPS/SSL certificates
4. Use environment-specific `.env` files
5. Keep dependencies updated (`npm audit`)
6. Use strong MongoDB passwords and IP whitelisting
7. Implement rate limiting for API endpoints

## Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

- [ ] Email notifications on server down
- [ ] Slack/Discord integration
- [ ] User authentication and roles
- [ ] Custom alerting rules
- [ ] Performance trending graphs
- [ ] SSL certificate monitoring
- [ ] Uptime SLA tracking
- [ ] Custom health check scripts

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation
- Review troubleshooting section

## Acknowledgments

Built with:
- [Node.js](https://nodejs.org/) - JavaScript runtime
- [Express.js](https://expressjs.com/) - Web framework
- [MongoDB](https://www.mongodb.com/) - Database
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Material Symbols](https://fonts.google.com/icons) - Icons

## Version History

### v0.0.1 (Current)
- Initial release
- Basic server monitoring
- Dashboard and logs
- API endpoints
- MongoDB integration

---

**Made with ❤️ for the open source community**

For the latest updates and information, visit the [GitHub repository](https://github.com/yourusername/sentinel-pulse)