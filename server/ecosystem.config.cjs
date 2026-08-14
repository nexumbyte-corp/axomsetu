require('dotenv').config();

/**
 * PM2 Ecosystem Configuration
 * Defines production cluster management settings for axomsetu-backend
 */
module.exports = {
  apps: [
    {
      name: 'axomsetu-backend',
      script: './src/server.js',
      instances: 'max', // Scale across all available CPU cores in cluster mode
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 5000,
      },
      max_memory_restart: '500M',
      restart_delay: 2000,
      autorestart: true,
      watch: false,
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      merge_logs: true,
    },
  ],
};
