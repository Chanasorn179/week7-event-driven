require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { connect: connectRabbitMQ } = require('./shared/events/rabbitmq');
const { startConsumer, getAuditLogs } = require('./src/events/consumer');

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());
app.use(morgan('short'));

app.get('/health', (req, res) => {
    res.json({ service: 'audit-service', status: 'ok', timestamp: new Date().toISOString() });
});

// GET audit logs (with optional filters)
app.get('/api/audit', (req, res) => {
    const logs = getAuditLogs({
        eventType: req.query.eventType,
        entityId: req.query.entityId
    });
    res.json({ success: true, data: logs, count: logs.length });
});

app.use((err, req, res, next) => {
    res.status(500).json({ success: false, error: err.message });
});

async function start() {
    try {
        await connectRabbitMQ();
        await startConsumer();
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n📋 Audit Service running on port ${PORT}`);
            console.log(`📥 Consuming events from RabbitMQ\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start:', error.message);
        process.exit(1);
    }
}
start();
