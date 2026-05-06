import React, { useState, useEffect, useRef } from 'react';

const LiveLog = ({ logs, onClear, darkMode }) => {
  const logContainerRef = useRef(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight; // Scroll to bottom for newest logs
    }
  }, [logs]);

  return (
    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-terminal-bg border-gray-300'} border-t`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3">
          <div className="flex justify-between items-center mb-3">
            <h3 className={`text-sm font-semibold uppercase tracking-wider ${darkMode ? 'text-green-400' : 'text-terminal-text'}`}>
              Live Ping Log
            </h3>
            <button
              onClick={onClear}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                darkMode 
                  ? 'bg-gray-700 text-green-400 hover:bg-gray-600' 
                  : 'bg-gray-700 text-terminal-text hover:bg-gray-600'
              }`}
            >
              Clear Log
            </button>
          </div>
          
          <div 
            ref={logContainerRef}
            className={`h-96 overflow-y-auto terminal-scroll rounded p-4 font-mono ${
              darkMode ? 'bg-black text-green-400' : 'bg-black text-terminal-text'
            }`}
            style={{ fontSize: '16px', lineHeight: '1.8', fontFamily: 'Consolas, Monaco, "Courier New", monospace' }}
          >
            {logs.length === 0 ? (
              <div className={`opacity-80 ${darkMode ? 'text-green-400' : 'text-terminal-text'}`} style={{ fontSize: '18px' }}>
                Waiting for ping data...
              </div>
            ) : (
              logs.map((log, index) => (
                <div 
                  key={index} 
                  className="py-3 font-mono border-b border-gray-800"
                  style={{
                    opacity: 0.4 + (index / logs.length) * 0.6, // Newer entries more visible
                    fontSize: '18px',
                    lineHeight: '1.8',
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    minHeight: '28px',
                    letterSpacing: '0.5px'
                  }}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveLog;
