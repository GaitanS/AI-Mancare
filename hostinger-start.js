// Wrapper script for Hostinger deployment
// Loads .env before starting Next.js server

// Load environment variables FIRST
require('dotenv').config();

// Log that we loaded env
console.log('[Hostinger] Environment loaded. DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

// Now load the actual Next.js server
require('./server.next.js');
