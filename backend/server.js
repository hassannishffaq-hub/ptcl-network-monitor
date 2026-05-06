const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const ping = require('ping');
const { sendDiscordAlert } = require('./notifier');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());
app.use(express.static('../frontend/dist'));

// In-memory storage for ping results and status tracking
const pingHistory = new Map(); // ip -> array of last 5 ping results
const ipStatus = new Map(); // ip -> current status
const consecutiveStatus = new Map(); // ip -> consecutive count for debounce
const lastNotificationTime = new Map(); // ip -> last notification timestamp

// WebSocket clients
const clients = new Set();

// Broadcast to all connected clients
function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Calculate packet loss and statistics
function calculateStats(history) {
  if (history.length === 0) return { loss: 100, avg: 0, min: 0, max: 0 };
  
  const successful = history.filter(p => p.alive);
  const loss = ((history.length - successful.length) / history.length) * 100;
  
  if (successful.length === 0) {
    return { loss: 100, avg: 0, min: 0, max: 0 };
  }
  
  const times = successful.map(p => p.time);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  // Filter out extreme outliers for more stable readings
  const filteredTimes = times.filter(t => t > 0 && t < 200);
  const stableAvg = filteredTimes.length > 0 ? 
    filteredTimes.reduce((a, b) => a + b, 0) / filteredTimes.length : avg;
  
  return { loss, avg: stableAvg, min, max };
}

// Determine severity based on thresholds
function determineSeverity(stats, settings) {
  if (stats.loss === 100) return 'DOWN';
  if (stats.avg < settings.warning_ms) return 'UP';
  if (stats.avg > settings.critical_ms) return 'CRITICAL';
  if (stats.avg >= settings.warning_ms) return 'WARNING';
  return 'UP';
}

// Send Discord notification for status change
async function notifyStatusChange(ip, label, oldStatus, newStatus, stats) {
  const webhookUrl = await db.getSetting('discord_webhook');
  console.log(`Discord webhook URL: ${webhookUrl ? 'SET' : 'NOT SET'}`);
  if (!webhookUrl) {
    console.log('Skipping Discord notification - webhook not configured');
    return;
  }

  const colors = {
    UP: 65280,      // Green
    WARNING: 16776960, // Yellow
    CRITICAL: 16711680, // Red
    DOWN: 16711680     // Red
  };

  // Get current ping value from history
  const history = pingHistory.get(ip) || [];
  const currentPing = history.length > 0 ? Math.round(history[history.length - 1].time) : 0;

  const messages = {
    WARNING: `⚠️ **${label}** \`${ip}\` — High latency detected | Current: ${currentPing}ms | Loss: ${Math.round(stats.loss)}%`,
    CRITICAL: `🔴 **${label}** \`${ip}\` — Critical latency | Current: ${currentPing}ms | Loss: ${Math.round(stats.loss)}% | Check immediately`,
    DOWN: `🚨 **${label}** \`${ip}\` — **OUTAGE DETECTED** | 100% packet loss | Fix immediately`,
    UP: `✅ **${label}** \`${ip}\` — Service restored | Back online | Current: ${currentPing}ms`
  };

  const embed = {
    title: `Network Status Change: ${newStatus}`,
    description: messages[newStatus],
    color: colors[newStatus],
    timestamp: new Date().toISOString()
  };

  await sendDiscordAlert(webhookUrl, embed);
}

// Ping engine
async function pingAllIPs() {
  console.log('Starting ping cycle...');
  const ips = await db.getAllIPs();
  const settings = await db.getAllSettings();
  console.log(`Pinging ${ips.length} IPs:`, ips.map(ip => ip.ip));
  
  for (const ipData of ips) {
    try {
      console.log(`Pinging ${ipData.ip} (${ipData.label})...`);
      const result = await ping.promise.probe(ipData.ip, {
        timeout: 2,
        extra: ['-n', '1']
      });
      
      console.log(`Ping result for ${ipData.ip}: alive=${result.alive}, time=${result.time}ms`);

      // Update history
      if (!pingHistory.has(ipData.ip)) {
        pingHistory.set(ipData.ip, []);
      }
      const history = pingHistory.get(ipData.ip);
      history.push({
        alive: result.alive,
        time: result.time || 0,
        timestamp: Date.now()
      });

      // Keep only last 5 results
      if (history.length > 5) {
        history.shift();
      }

      // Calculate stats
      const stats = calculateStats(history);
      const newStatus = determineSeverity(stats, settings);
      const oldStatus = ipStatus.get(ipData.ip) || 'UP';

      // Update consecutive counter for debounce
      const currentConsecutive = consecutiveStatus.get(ipData.ip) || 0;
      
      if (newStatus !== oldStatus) {
        consecutiveStatus.set(ipData.ip, currentConsecutive + 1);
      } else {
        consecutiveStatus.set(ipData.ip, 1);
      }

      // Only trigger status change after 3 consecutive same-status pings
      if (consecutiveStatus.get(ipData.ip) >= 3 && newStatus !== oldStatus) {
        ipStatus.set(ipData.ip, newStatus);
        await notifyStatusChange(ipData.ip, ipData.label, oldStatus, newStatus, stats);
        console.log(`Status changed: ${ipData.ip} from ${oldStatus} to ${newStatus}`);
        lastNotificationTime.set(ipData.ip, Date.now());
      }
      
      // Send UP notification when internet restores
      if (newStatus === 'UP' && consecutiveStatus.get(ipData.ip) >= 3 && oldStatus !== 'UP') {
        const lastNotif = lastNotificationTime.get(ipData.ip) || 0;
        const now = Date.now();
        
        // Only send UP notification if last notification was at least 10 seconds ago
        if (now - lastNotif >= 10000) {
          await notifyStatusChange(ipData.ip, ipData.label, oldStatus, newStatus, stats);
          console.log(`Internet restored notification sent: ${ipData.ip} - ${newStatus}`);
          lastNotificationTime.set(ipData.ip, now);
        }
      }
      
      // Send continuous notifications every 1 minute while status is WARNING/DOWN/CRITICAL
      if ((newStatus === 'DOWN' || newStatus === 'CRITICAL' || newStatus === 'WARNING') && consecutiveStatus.get(ipData.ip) >= 3) {
        const lastNotif = lastNotificationTime.get(ipData.ip) || 0;
        const now = Date.now();
        
        // Send notification every 1 minute (60000ms)
        if (now - lastNotif >= 60000) {
          await notifyStatusChange(ipData.ip, ipData.label, oldStatus, newStatus, stats);
          console.log(`Continuous notification sent: ${ipData.ip} - ${newStatus}`);
          lastNotificationTime.set(ipData.ip, now);
        }
      }

      // Broadcast update to clients
      broadcast({
        type: 'ping_update',
        data: {
          id: ipData.id,
          ip: ipData.ip,
          label: ipData.label,
          status: ipStatus.get(ipData.ip) || newStatus,
          stats,
          history: history.slice(-20) // Send last 20 for sparkline
        }
      });

      // Add to live log
      const logEntry = `[${new Date().toLocaleTimeString()}] ${ipData.label.padEnd(20)} (${ipData.ip}) → ${result.alive ? 'UP' : 'DOWN'} | ${result.alive ? `${Math.round(result.time).toString().padStart(3)}ms` : 'N/A'.padEnd(4)} | TTL=${result.output ? (result.output.match(/ttl=(\d+)/i)?.[1] || 'N/A') : 'N/A'} | Loss=${Math.round(stats.loss).toString().padStart(2)}%`;
      
      broadcast({
        type: 'log_entry',
        data: logEntry
      });

    } catch (error) {
      console.error(`Error pinging ${ipData.ip}:`, error.message);
    }
  }
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  clients.add(ws);
  
  // Send current data to new client
  (async () => {
    const ips = await db.getAllIPs();
    const initialData = ips.map(ip => {
      const history = pingHistory.get(ip.ip) || [];
      const stats = calculateStats(history);
      return {
        id: ip.id,
        ip: ip.ip,
        label: ip.label,
        status: ipStatus.get(ip.ip) || 'UP',
        stats,
        history: history.slice(-20)
      };
    });

    ws.send(JSON.stringify({
      type: 'initial_data',
      data: initialData
    }));
  })();

  ws.on('close', () => {
    clients.delete(ws);
  });
});

// REST API Routes
app.get('/api/ips', async (req, res) => {
  try {
    const ips = await db.getAllIPs();
    const result = ips.map(ip => ({
      ...ip,
      status: ipStatus.get(ip.ip) || 'UP',
      stats: calculateStats(pingHistory.get(ip.ip) || [])
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch IPs' });
  }
});

app.post('/api/ips', async (req, res) => {
  try {
    const { ip, label } = req.body;
    
    if (!ip || !label) {
      return res.status(400).json({ error: 'IP and label are required' });
    }

    // Validate IP format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(ip)) {
      return res.status(400).json({ error: 'Invalid IP address format' });
    }

    const result = await db.addIP(ip, label);
    res.json({ id: result.lastInsertRowid, ip, label });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'IP address already exists' });
    } else {
      res.status(500).json({ error: 'Failed to add IP' });
    }
  }
});

app.delete('/api/ips/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if it's Google DNS IP
    const ipData = await db.getIPById(id);
    if (ipData && ipData.ip === '8.8.8.8') {
      return res.status(403).json({ error: 'Cannot delete Google DNS IP' });
    }

    const result = await db.deleteIP(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'IP not found' });
    }
    
    // Clean up memory
    if (ipData) {
      pingHistory.delete(ipData.ip);
      ipStatus.delete(ipData.ip);
      consecutiveStatus.delete(ipData.ip);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete IP' });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.getAllSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const settings = req.body;
    
    for (const [key, value] of Object.entries(settings)) {
      await db.updateSetting(key, value.toString());
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const ips = await db.getAllIPs();
    let upCount = 0;
    let downCount = 0;
    
    ips.forEach(ip => {
      const status = ipStatus.get(ip.ip) || 'UP';
      if (status === 'DOWN') {
        downCount++;
      } else {
        upCount++;
      }
    });
    
    const health = ips.length > 0 ? (upCount / ips.length) * 100 : 100;
    
    res.json({
      total: ips.length,
      up: upCount,
      down: downCount,
      health: Math.round(health)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Test Discord webhook endpoint
app.post('/api/test-webhook', async (req, res) => {
  try {
    const webhookUrl = await db.getSetting('discord_webhook');
    if (!webhookUrl) {
      return res.status(400).json({ error: 'Discord webhook URL not configured' });
    }

    const embed = {
      title: 'Test Notification',
      description: '✅ PTCL Network Monitor is working correctly!',
      color: 65280,
      timestamp: new Date().toISOString()
    };

    await sendDiscordAlert(webhookUrl, embed);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// Serve test page
app.get('/test', (req, res) => {
  res.sendFile(require('path').join(__dirname, 'test.html'));
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(require('path').join(__dirname, '../frontend/dist/index.html'));
});

// Start ping engine
const startPingEngine = async () => {
  // Get ping interval from settings
  const interval = parseInt(await db.getSetting('ping_interval')) || 1;
  const ips = await db.getAllIPs();
  
  // Single staggered ping engine for all IPs - only log once per cycle
  setInterval(async () => {
    const currentTime = new Date().toLocaleTimeString();
    const allLogEntries = [];
    
    for (let i = 0; i < ips.length; i++) {
      const ipData = ips[i];
      
      // Small delay between each IP ping to avoid overlap
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        console.log(`Pinging ${ipData.ip} (${ipData.label})...`);
        const result = await ping.promise.probe(ipData.ip, {
          timeout: 2,
          extra: ['-n', '1']
        });
        
        console.log(`Ping result for ${ipData.ip}: alive=${result.alive}, time=${result.time}ms`);
        
        // Update history for this specific IP
        if (!pingHistory.has(ipData.ip)) {
          pingHistory.set(ipData.ip, []);
        }
        const history = pingHistory.get(ipData.ip);
        history.push({
          alive: result.alive,
          time: result.time || 0,
          timestamp: Date.now()
        });
        
        // Keep only last 5 results for this IP
        if (history.length > 5) {
          history.shift();
        }
        
        // Calculate stats for this IP
        const stats = calculateStats(history);
        const newStatus = determineSeverity(stats, await db.getAllSettings());
        const oldStatus = ipStatus.get(ipData.ip) || 'UP';
        
        // Update consecutive counter for this IP
        const currentConsecutive = consecutiveStatus.get(ipData.ip) || 0;
        
        if (newStatus !== oldStatus) {
          consecutiveStatus.set(ipData.ip, currentConsecutive + 1);
        } else {
          consecutiveStatus.set(ipData.ip, 1);
        }
        
        // Trigger status change immediately for testing (remove 3-consecutive requirement)
        if (newStatus !== oldStatus) {
          ipStatus.set(ipData.ip, newStatus);
          await notifyStatusChange(ipData.ip, ipData.label, oldStatus, newStatus, stats);
          console.log(`Status changed: ${ipData.ip} from ${oldStatus} to ${newStatus}`);
          lastNotificationTime.set(ipData.ip, Date.now());
        }
        
        // Send UP notification when internet restores for this IP
        if (newStatus === 'UP' && oldStatus !== 'UP') {
          const lastNotif = lastNotificationTime.get(ipData.ip) || 0;
          const now = Date.now();
          
          // Only send UP notification if last notification was at least 10 seconds ago
          if (now - lastNotif >= 10000) {
            await notifyStatusChange(ipData.ip, ipData.label, oldStatus, newStatus, stats);
            console.log(`Internet restored notification sent: ${ipData.ip} - ${newStatus}`);
            lastNotificationTime.set(ipData.ip, now);
          }
        }
        
        // Send continuous notifications every 1 minute while status is WARNING/DOWN/CRITICAL for this IP
        if (newStatus === 'DOWN' || newStatus === 'CRITICAL' || newStatus === 'WARNING') {
          const lastNotif = lastNotificationTime.get(ipData.ip) || 0;
          const now = Date.now();
          
          // Send notification every 1 minute (60000ms)
          if (now - lastNotif >= 60000) {
            await notifyStatusChange(ipData.ip, ipData.label, oldStatus, newStatus, stats);
            console.log(`Continuous notification sent: ${ipData.ip} - ${newStatus}`);
            lastNotificationTime.set(ipData.ip, now);
          }
        }
        
        // Collect log entry for this IP
        const logEntry = `[${currentTime}] ${ipData.label.padEnd(20)} (${ipData.ip}) → ${result.alive ? 'UP' : 'DOWN'} | ${result.alive ? `${Math.round(result.time).toString().padStart(3)}ms` : 'N/A'.padEnd(4)} | TTL=${result.output ? (result.output.match(/ttl=(\d+)/i)?.[1] || 'N/A') : 'N/A'} | Loss=${Math.round(stats.loss).toString().padStart(2)}%`;
        allLogEntries.push(logEntry);
        
        // Broadcast update to clients for this IP
        broadcast({
          type: 'ping_update',
          data: {
            id: ipData.id,
            ip: ipData.ip,
            label: ipData.label,
            status: ipStatus.get(ipData.ip) || newStatus,
            stats,
            history: history.slice(-20) // Send last 20 for sparkline
          }
        });
        
      } catch (error) {
        console.error(`Error pinging ${ipData.ip}:`, error.message);
      }
    }
    
    // Send individual log entries line by line
    if (allLogEntries.length > 0) {
      allLogEntries.forEach(logEntry => {
        broadcast({
          type: 'log_entry',
          data: logEntry
        });
      });
    }
    
    // Wait for remaining time before next cycle
    const remainingTime = (interval * 1000) - (ips.length * 100);
    if (remainingTime > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingTime));
    }
  }, interval * 1000);
  
  // Initial ping on startup
  await pingAllIPs();
};

// Initialize database and start server
async function startServer() {
  try {
    await db.initDatabase();
    
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`PTCL Network Monitor running on port ${PORT}`);
      console.log(`Access from other devices: http://192.168.1.8:${PORT}`);
      startPingEngine();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

startServer();
