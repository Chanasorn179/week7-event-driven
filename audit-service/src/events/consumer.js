// audit-service/src/events/consumer.js
// Subscribe to task.events → audit_queue
// บันทึกทุก Event เป็น Audit Log

const { getChannel } = require('../../shared/events/rabbitmq');
const { EXCHANGE_NAME, QUEUES } = require('../../shared/events/eventTypes');

// In-memory audit log (production จะเก็บใน DB/Elasticsearch)
const auditLogs = [];

async function startConsumer() {
    const channel = getChannel();
    if (!channel) throw new Error('RabbitMQ channel not available');

    await channel.assertQueue(QUEUES.AUDIT, { durable: true });
    await channel.bindQueue(QUEUES.AUDIT, EXCHANGE_NAME, '');

    console.log(`📥 Audit Service: Listening on queue "${QUEUES.AUDIT}"`);

    channel.consume(QUEUES.AUDIT, (msg) => {
        if (!msg) return;
        try {
            const event = JSON.parse(msg.content.toString());

            const auditEntry = {
                id: auditLogs.length + 1,
                eventId: event.id,
                eventType: event.type,
                entityType: 'Task',
                entityId: event.data.id,
                action: event.type.replace('TASK_', '').toLowerCase(),
                data: event.data,
                source: event.metadata.source,
                timestamp: event.metadata.timestamp,
                processedAt: new Date().toISOString()
            };

            auditLogs.push(auditEntry);

            console.log(`📝 AUDIT LOG #${auditEntry.id}: ${event.type} | Task #${event.data.id} "${event.data.title}" | ${event.metadata.timestamp}`);

            channel.ack(msg);
        } catch (error) {
            console.error('❌ Audit processing failed:', error.message);
            channel.nack(msg, false, false);
        }
    });
}

function getAuditLogs(filters = {}) {
    let logs = [...auditLogs].reverse();
    if (filters.eventType) logs = logs.filter(l => l.eventType === filters.eventType);
    if (filters.entityId) logs = logs.filter(l => l.entityId === parseInt(filters.entityId));
    return logs;
}

module.exports = { startConsumer, getAuditLogs };
