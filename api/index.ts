import type { IncomingMessage, ServerResponse } from 'http';

// Simple serverless handler for Vercel
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const url = req.url || '';

  // Health check endpoints
  if (url === '/health' || url === '/api/health') {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: 'vercel-serverless',
      message: 'API is running. Connect a PostgreSQL database for full functionality.'
    }));
    return;
  }

  // API info endpoint
  if (url === '/api' || url === '/api/') {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({
      name: 'JGI Boardroom Booking API',
      version: '1.0.0',
      status: 'Serverless mode - limited functionality',
      note: 'For full API, deploy backend to Railway/Render with PostgreSQL'
    }));
    return;
  }

  // For any other API routes, return info about backend setup
  if (url.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 503;
    res.end(JSON.stringify({
      success: false,
      message: 'Backend API not fully configured',
      note: 'The frontend is deployed. To enable login and full functionality, deploy the backend to Railway or Render with a PostgreSQL database.',
      docs: 'See DEPLOY.md for backend setup instructions'
    }));
    return;
  }

  // 404 for unknown routes
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 404;
  res.end(JSON.stringify({ success: false, message: 'Not found' }));
}
