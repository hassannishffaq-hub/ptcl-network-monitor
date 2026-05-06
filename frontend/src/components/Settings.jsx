import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Settings = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState({
    discord_webhook: '',
    ping_interval: '5',
    warning_ms: '100',
    critical_ms: '300'
  });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleInputChange = (key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    try {
      await onSave(localSettings);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleTestWebhook = async () => {
    if (!localSettings.discord_webhook.trim()) {
      setTestResult({ success: false, message: 'Please enter a Discord webhook URL' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await axios.post('/api/test-webhook');
      setTestResult({ success: true, message: 'Test notification sent successfully!' });
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: error.response?.data?.error || 'Failed to send test notification' 
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discord Webhook URL
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={localSettings.discord_webhook}
                  onChange={(e) => handleInputChange('discord_webhook', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ptcl-green focus:border-transparent"
                  placeholder="https://discord.com/api/webhooks/..."
                />
                <button
                  onClick={handleTestWebhook}
                  disabled={isTesting}
                  className="px-4 py-2 bg-ptcl-green text-white rounded-md hover:bg-green-600 disabled:bg-gray-400 transition-colors"
                >
                  {isTesting ? 'Testing...' : 'Test'}
                </button>
              </div>
              {testResult && (
                <div className={`mt-2 text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {testResult.message}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ping Interval
              </label>
              <select
                value={localSettings.ping_interval}
                onChange={(e) => handleInputChange('ping_interval', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ptcl-green focus:border-transparent"
              >
                <option value="5">5 seconds</option>
                <option value="10">10 seconds</option>
                <option value="15">15 seconds</option>
                <option value="30">30 seconds</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Warning Threshold (ms)
                </label>
                <input
                  type="number"
                  value={localSettings.warning_ms}
                  onChange={(e) => handleInputChange('warning_ms', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ptcl-green focus:border-transparent"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Critical Threshold (ms)
                </label>
                <input
                  type="number"
                  value={localSettings.critical_ms}
                  onChange={(e) => handleInputChange('critical_ms', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ptcl-green focus:border-transparent"
                  min="1"
                />
              </div>
            </div>

                      </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-ptcl-green text-white rounded-md hover:bg-green-600 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
