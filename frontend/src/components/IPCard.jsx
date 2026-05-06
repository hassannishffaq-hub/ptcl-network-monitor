import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const IPCard = ({ ipData, onDelete, darkMode }) => {
  const { id, ip, label, status, stats, history } = ipData;
  const [isDeleting, setIsDeleting] = useState(false);

  const getStatusColor = () => {
    switch (status) {
      case 'UP': return 'bg-ptcl-green text-white';
      case 'WARNING': return 'bg-warning text-white';
      case 'CRITICAL': return 'bg-critical text-white';
      case 'DOWN': return 'bg-danger text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusBorderColor = () => {
    switch (status) {
      case 'UP': return 'border-ptcl-green';
      case 'WARNING': return 'border-warning';
      case 'CRITICAL': return 'border-critical';
      case 'DOWN': return 'border-danger';
      default: return 'border-gray-500';
    }
  };

  const formatHistory = () => {
    if (!history || history.length === 0) return [];
    
    return history.map((point, index) => ({
      index,
      time: point.time || 0,
      alive: point.alive
    }));
  };

  const handleDelete = async () => {
    if (ip === '8.8.8.8') return; // Cannot delete Google DNS
    
    setIsDeleting(true);
    try {
      await onDelete(id);
    } catch (error) {
      console.error('Failed to delete IP:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const chartData = formatHistory();
  const isGoogleDNS = ip === '8.8.8.8';

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md border-2 ${getStatusBorderColor()} transition-all duration-300 ${
      status !== 'UP' ? 'animate-pulse-slow' : ''
    }`}>
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{label}</h3>
            <p className={`text-lg font-mono font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{ip}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor()}`}>
              {status}
            </span>
            {!isGoogleDNS && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-500 hover:text-red-700 disabled:text-gray-400 transition-colors"
                title="Delete IP"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="text-center">
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Current</p>
            <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.avg > 0 ? `${Math.round(stats.avg)}ms` : 'N/A'}
            </p>
          </div>
          <div className="text-center">
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loss</p>
            <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {Math.round(stats.loss)}%
            </p>
          </div>
          <div className="text-center">
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Min</p>
            <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.min > 0 ? `${Math.round(stats.min)}ms` : 'N/A'}
            </p>
          </div>
          <div className="text-center">
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Max</p>
            <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.max > 0 ? `${Math.round(stats.max)}ms` : 'N/A'}
            </p>
          </div>
        </div>

        {chartData.length > 0 && (
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="index" 
                  tick={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  domain={[0, 'dataMax + 10']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                  formatter={(value) => [`${Math.round(value)}ms`, 'Latency']}
                />
                <Line 
                  type="monotone" 
                  dataKey="time" 
                  stroke="#00A651" 
                  strokeWidth={2}
                  dot={false}
                  name="Latency"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default IPCard;
