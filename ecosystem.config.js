// PM2 Configuration for Hostinger Cloud Startup
// 2 Core CPU, 4 GB RAM, 100 GB NVMe

module.exports = {
  apps: [
    {
      name: 'retete-ieftine-web',
      script: '.next/standalone/server.js',
      instances: 1, // Single instance pentru 2 core CPU
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '800M', // Restart if exceeds 800MB
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/web-error.log',
      out_file: './logs/web-app.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      // Health check
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
    },
    {
      name: 'cron-scraper',
      script: './scripts/cron-scraper.js',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 2 * * 1', // Every Monday at 2 AM
      autorestart: false, // Only run on cron
      watch: false,
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: './logs/scraper-error.log',
      out_file: './logs/scraper.log',
      merge_logs: true,
    },
    {
      name: 'cron-recipe-generator',
      script: './scripts/cron-recipe-generator.js',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 6 * * 1', // Every Monday at 6 AM
      autorestart: false,
      watch: false,
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: './logs/recipe-generator-error.log',
      out_file: './logs/recipe-generator.log',
      merge_logs: true,
    },
    {
      name: 'catalog-processor',
      script: './scripts/catalog-processor.js',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 4 * * 1', // Every Monday at 4 AM (după scraping)
      autorestart: false,
      watch: false,
      max_memory_restart: '1500M', // AI processing uses more memory
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: './logs/processor-error.log',
      out_file: './logs/processor.log',
      merge_logs: true,
    },
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'u123456789',
      host: 'retete-ieftine.ro',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/retete-ieftine.git',
      path: '/home/u123456789/domains/retete-ieftine.ro',
      'post-deploy': 'npm install --production && npx prisma migrate deploy && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production',
      },
    },
  },
};
