// PM2 Ecosystem Configuration for CatalogSmart
// Isolated configuration for multi-app VPS deployment

module.exports = {
  apps: [
    {
      name: 'catalogsmart',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/var/www/catalogsmart.ro',
      
      // Instance configuration
      instances: 2,           // Use 2 instances for 2 CPU cores
      exec_mode: 'cluster',   // Cluster mode for load balancing
      
      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3001,           // Unique port for this app
      },
      
      // Memory management
      max_memory_restart: '1G',  // Restart if memory exceeds 1GB
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/catalogsmart-error.log',
      out_file: '/var/log/pm2/catalogsmart-out.log',
      merge_logs: true,
      
      // Auto-restart configuration
      autorestart: true,
      watch: false,           // Don't watch files in production
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
