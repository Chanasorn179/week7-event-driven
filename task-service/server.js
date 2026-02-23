// task-service/server.js
require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const taskRoutes = require('./src/routes/taskRoutes');
const { connect: connectRabbitMQ } = require('./shared/events/rabbitmq');

const app = express();
const PORT = process.env.TASK_SERVICE_PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(morgan('short'));

// Health check
app.get('/health', (req, res) => {
    res.json({ service: 'task-service', status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api', taskRoutes);

// Error handler
app.use((err, req, res, next) => {
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: err.message });
});

// Start
async function start() {
    try {
        await connectRabbitMQ();
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n🚀 Task Service running on port ${PORT}`);
            console.log(`📤 Event Publisher ready\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start Task Service:', error.message);
        process.exit(1);
    }
}
start();
