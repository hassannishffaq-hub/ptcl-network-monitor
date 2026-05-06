import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import StatsBar from './components/StatsBar';
import IPCard from './components/IPCard';
import LiveLog from './components/LiveLog';
import Settings from './components/Settings';

const App = () => {
  const [ips, setIps] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, up: 0, down: 0, health: 100 });
  const [settings, setSettings] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [newIP, setNewIP] = useState({ ip: '', label: '' });
  const [addError, setAddError] = useState('');
  const [ws, setWs] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    try {
      const wsUrl = `ws://${window.location.hostname}:3001`;
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log('WebSocket connected');
        setReconnectAttempts(0);
      };

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'initial_data':
              setIps(message.data);
              break;
            case 'ping_update':
              setIps(prevIps => 
                prevIps.map(ip => 
                  ip.id === message.data.id ? { ...ip, ...message.data } : ip
                )
              );
              break;
            case 'log_entry':
              setLogs(prevLogs => {
                const newLogs = [...prevLogs, message.data];
                return newLogs.slice(-200); // Keep only last 200 logs, newest at bottom
              });
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      websocket.onclose = () => {
        console.log('WebSocket disconnected');
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          connectWebSocket();
        }, 3000);
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      setWs(websocket);

      return () => {
        websocket.close();
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      // Fallback to HTTP polling
      setTimeout(() => connectWebSocket(), 5000);
    }
  }, []);

  // Initialize WebSocket and load initial data
  useEffect(() => {
    const cleanup = connectWebSocket();
    
    // Load initial data
    loadInitialData();
    
    return cleanup;
  }, [connectWebSocket]);

  const loadInitialData = async () => {
    try {
      // Try to load data with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      );

      const [ipsResponse, statsResponse, settingsResponse] = await Promise.race([
        Promise.all([
          axios.get('/api/ips'),
          axios.get('/api/stats'),
          axios.get('/api/settings')
        ]),
        timeoutPromise
      ]);
      
      setIps(ipsResponse.data);
      setStats(statsResponse.data);
      setSettings(settingsResponse.data);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      // Set default values so the app doesn't crash
      setStats({ total: 0, up: 0, down: 0, health: 100 });
      setSettings({
        discord_webhook: '',
        ping_interval: '5',
        warning_ms: '100',
        critical_ms: '300',
        loss_warning: '10',
        loss_critical: '50'
      });
    }
  };

  const handleAddIP = async (e) => {
    e.preventDefault();
    setAddError('');

    if (!newIP.ip || !newIP.label) {
      setAddError('Both IP address and label are required');
      return;
    }

    // Validate IP format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(newIP.ip)) {
      setAddError('Invalid IP address format');
      return;
    }

    try {
      const response = await axios.post('/api/ips', newIP);
      setIps(prev => [...prev, response.data]);
      setNewIP({ ip: '', label: '' });
      
      // Update stats
      const statsResponse = await axios.get('/api/stats');
      setStats(statsResponse.data);
    } catch (error) {
      setAddError(error.response?.data?.error || 'Failed to add IP');
    }
  };

  const handleDeleteIP = async (id) => {
    try {
      await axios.delete(`/api/ips/${id}`);
      setIps(prev => prev.filter(ip => ip.id !== id));
      
      // Update stats
      const statsResponse = await axios.get('/api/stats');
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Failed to delete IP:', error);
    }
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      await axios.post('/api/settings', newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-ptcl-green rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>PTCL Network Monitor</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleDarkMode}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title="Toggle Dark Mode"
              >
                {darkMode ? '🌙' : '☀️'}
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 bg-ptcl-green text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <StatsBar stats={stats} darkMode={darkMode} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Add IP Form */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 mb-6`}>
          <form onSubmit={handleAddIP} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="IP Address (e.g., 8.8.8.8)"
              value={newIP.ip}
              onChange={(e) => setNewIP(prev => ({ ...prev, ip: e.target.value }))}
              className={`flex-1 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-ptcl-green focus:border-transparent ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'border-gray-300'
              }`}
            />
            <input
              type="text"
              placeholder="Label (e.g., Google DNS)"
              value={newIP.label}
              onChange={(e) => setNewIP(prev => ({ ...prev, label: e.target.value }))}
              className={`flex-1 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-ptcl-green focus:border-transparent ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'border-gray-300'
              }`}
            />
            <button
              type="submit"
              className="px-6 py-2 bg-ptcl-green text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Add IP
            </button>
          </form>
          {addError && (
            <div className={`mt-2 text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
              {addError}
            </div>
          )}
        </div>

        {/* Connection Status */}
        {ws?.readyState !== WebSocket.OPEN && (
          <div className={`${darkMode ? 'bg-yellow-900 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} rounded-lg p-4 mb-6`}>
            <div className="flex items-center">
              <svg className={`w-5 h-5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'} mr-2`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className={darkMode ? 'text-yellow-300' : 'text-yellow-800'}>
                {reconnectAttempts > 0 
                  ? `Reconnecting to server... (Attempt ${reconnectAttempts})`
                  : 'Connecting to server...'}
              </span>
            </div>
          </div>
        )}

        {/* IP Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {ips.map(ip => (
            <IPCard
              key={ip.id}
              ipData={ip}
              onDelete={handleDeleteIP}
              darkMode={darkMode}
            />
          ))}
        </div>

        {ips.length === 0 && (
          <div className="text-center py-12">
            <div className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} mb-4`}>
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>No IPs to monitor</h3>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Add your first IP address above to start monitoring.</p>
          </div>
        )}
      </main>

      {/* Live Log */}
      <LiveLog logs={logs} onClear={handleClearLogs} darkMode={darkMode} />

      {/* Settings Modal */}
      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
};

export default App;
