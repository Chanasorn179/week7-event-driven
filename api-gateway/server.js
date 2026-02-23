// api-gateway/server.js
// Single entry point — routes requests to correct service
//
// /api/tasks/*          → task-service:3001
// /api/notifications/*  → notification-service:3002
// /api/audit/*          → audit-service:3003

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(morgan('short'));

// Serve frontend static files
app.use(express.static('public'));

// ===== Route Configuration =====

// /api/tasks/* → Task Service
app.use('/api/tasks', createProxyMiddleware({
    target: process.env.TASK_SERVICE_URL || 'http://task-service:3001',
    changeOrigin: true,
    pathRewrite: { '^/api/tasks': '/api/tasks' }
}));

// /api/notifications/* → Notification Service
app.use('/api/notifications', createProxyMiddleware({
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3002',
    changeOrigin: true,
    pathRewrite: { '^/api/notifications': '/api/notifications' }
}));

// /api/audit/* → Audit Service
app.use('/api/audit', createProxyMiddleware({
    target: process.env.AUDIT_SERVICE_URL || 'http://audit-service:3003',
    changeOrigin: true,
    pathRewrite: { '^/api/audit': '/api/audit' }
}));

// Gateway health — aggregate all services
app.get('/api/health', async (req, res) => {
    const services = {};
    const urls = {
        'task-service': 'http://task-service:3001/health',
        'notification-service': 'http://notification-service:3002/health',
        'audit-service': 'http://audit-service:3003/health'
    };

    for (const [name, url] of Object.entries(urls)) {
        try {
            const response = await fetch(url);
            const data = await response.json();
            services[name] = data.status || 'ok';
        } catch {
            services[name] = 'unreachable';
        }
    }

    res.json({
        gateway: 'api-gateway',
        status: 'ok',
        services,
        timestamp: new Date().toISOString()
    });
});

// Fallback — serve index.html
app.get('*', (req, res) => {
    res.sendFile('public/index.html', { root: __dirname });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🌐 API Gateway running on port ${PORT}`);
    console.log(`   /api/tasks/*          → task-service:3001`);
    console.log(`   /api/notifications/*  → notification-service:3002`);
    console.log(`   /api/audit/*          → audit-service:3003\n`);
});
