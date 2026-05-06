module.exports = {
  apps: [{
    name: 'ptcl-monitor',
    script: 'backend/server.js',
    watch: false,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/monitor-error.log',
    out_file: './logs/monitor.log',
    log_file: './logs/monitor-combined.log',
    time: true
  }]
};
