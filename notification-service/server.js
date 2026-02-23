// notification-service/server.js
require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { connect: connectRabbitMQ } = require('./shared/events/rabbitmq');
const { startConsumer, getNotifications, getUnreadCount } = require('./src/events/consumer');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());
app.use(morgan('short'));

// Health check
app.get('/health', (req, res) => {
    res.json({ service: 'notification-service', status: 'ok', timestamp: new Date().toISOString() });
});

// GET all notifications
app.get('/api/notifications', (req, res) => {
    const notifications = getNotifications();
    res.json({
        success: true,
        data: notifications,
        count: notifications.length,
        unread: getUnreadCount()
    });
});

// Error handler
app.use((err, req, res, next) => {
    res.status(500).json({ success: false, error: err.message });
});

// Start
async function start() {
    try {
        await connectRabbitMQ();
        await startConsumer();
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n🔔 Notification Service running on port ${PORT}`);
            console.log(`📥 Consuming events from RabbitMQ\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start:', error.message);
        process.exit(1);
    }
}
start();
