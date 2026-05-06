# PTCL Network Monitor

A professional-grade network monitoring application that provides real-time ping monitoring, Discord notifications, and a beautiful responsive web interface.

## Features

- **Real-time Monitoring**: Ping multiple IP addresses continuously with configurable intervals
- **WebSocket Updates**: Live, instant updates without page refresh
- **Discord Notifications**: Get alerted when network status changes (UP/WARNING/CRITICAL/DOWN)
- **Professional UI**: Clean, responsive design that works on desktop and mobile
- **Live Terminal Log**: Real-time ping results in a terminal-style interface
- **Statistics Dashboard**: Network health overview with visual indicators
- **Persistent Storage**: SQLite database for IP addresses and settings
- **Production Ready**: PM2 process management for 24/7 operation

## Requirements

- Node.js 18+ 
- npm
- pm2 (for production deployment)

## Quick Setup

1. **Install Dependencies**
   ```bash
   # Backend dependencies
   cd backend
   npm install

   # Frontend dependencies  
   cd ../frontend
   npm install
   ```

2. **Start Development Servers**
   ```bash
   # Terminal 1 - Start backend
   cd backend
   npm run dev

   # Terminal 2 - Start frontend
   cd frontend  
   npm run dev
   ```

3. **Open in Browser**
   - Desktop: http://localhost:5173
   - The app will automatically connect to the backend server

## Production Deployment

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start with PM2**
   ```bash
   cd ..
   pm2 start ecosystem.config.js
   ```

3. **Access the Application**
   - http://localhost:3001
   - The app runs on port 3001 in production mode

## Mobile Access

To access the monitor on your phone:

1. Ensure your phone and computer are on the same WiFi network
2. Find your computer's local IP address:
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux  
   ifconfig
   ```
3. Open http://[YOUR_LOCAL_IP]:3001 on your phone's browser

## Discord Webhook Setup

1. Create a Discord server or use an existing one
2. Go to Server Settings → Integrations → Webhooks
3. Create a new webhook and copy the URL
4. In the app, click Settings → enter the webhook URL → Save
5. Click "Test" to verify the webhook works

## PM2 Commands

```bash
# Start the application
pm2 start ecosystem.config.js

# Stop the application  
pm2 stop ptcl-monitor

# Restart the application
pm2 restart ptcl-monitor

# View logs
pm2 logs ptcl-monitor

# Monitor status
pm2 status

# View detailed info
pm2 show ptcl-monitor
```

## Settings Configuration

The app includes these configurable settings:

- **Discord Webhook URL**: For status change notifications
- **Ping Interval**: 5/10/15/30 seconds
- **Warning Threshold**: Latency in ms for warning status (default: 100ms)
- **Critical Threshold**: Latency in ms for critical status (default: 300ms)  
- **Loss Warning %**: Packet loss percentage for warning (default: 10%)
- **Loss Critical %**: Packet loss percentage for critical (default: 50%)

## Status Logic

- **UP**: Packet loss < 10% AND average latency < 100ms
- **WARNING**: Average latency 100-300ms OR packet loss 10-50%
- **CRITICAL**: Average latency > 300ms OR packet loss 50-99%
- **DOWN**: 100% packet loss for 3 consecutive pings

## Default IP

The app comes with Google DNS (8.8.8.8) pre-configured and cannot be deleted. This ensures you always have at least one IP to monitor.

## File Structure

```
ptcl-network-monitor/
├── backend/
│   ├── server.js          # Main server with ping engine and WebSocket
│   ├── db.js              # SQLite database operations
│   ├── notifier.js        # Discord webhook sender
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── IPCard.jsx
│   │   │   ├── LiveLog.jsx
│   │   │   ├── StatsBar.jsx
│   │   │   └── Settings.jsx
│   │   └── index.css
│   ├── package.json
│   └── index.html
├── ecosystem.config.js    # PM2 configuration
└── README.md
```

## Troubleshooting

**WebSocket Connection Issues:**
- Ensure the backend is running on port 3001
- Check for firewall blocking port 3001
- Verify both frontend and backend are on the same network

**Ping Issues:**
- On Windows, you may need to run Command Prompt as administrator
- Some networks may block ICMP ping requests
- Check that target IPs are accessible from your network

**Discord Notifications Not Working:**
- Verify the webhook URL is correct and active
- Check Discord server permissions for webhooks
- Use the "Test" button in Settings to verify connectivity

## License

MIT License - feel free to use and modify for your network monitoring needs.
