import React from 'react';

const StatsBar = ({ stats, darkMode }) => {
  const { total, up, down, health } = stats;
  
  const getHealthColor = () => {
    if (health === 100) return 'text-ptcl-green';
    if (health >= 80) return 'text-warning';
    if (health >= 50) return 'text-critical';
    return 'text-danger';
  };

  const getHealthBg = () => {
    if (health === 100) return 'bg-ptcl-green';
    if (health >= 80) return 'bg-warning';
    if (health >= 50) return 'bg-critical';
    return 'bg-danger';
  };

  return (
    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-6 mb-3 sm:mb-0">
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total IPs:</span>
                <span className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{total}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>UP:</span>
                <span className="text-lg font-semibold text-ptcl-green">{up}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>DOWN:</span>
                <span className="text-lg font-semibold text-danger">{down}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Network Health:</span>
              <div className="flex items-center space-x-2">
                <div className={`w-32 rounded-full h-2 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${getHealthBg()}`}
                    style={{ width: `${health}%` }}
                  />
                </div>
                <span className={`text-lg font-bold ${getHealthColor()}`}>
                  {health}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsBar;
