// src/events/publisher.js
// Publish events to RabbitMQ Exchange
//
// เมื่อ Task ถูกสร้าง/แก้ไข/ลบ → Publish Event ไปที่ Exchange
// Exchange จะ fanout (กระจาย) ไปทุก Queue ที่ bind อยู่

const { getChannel } = require('../../shared/events/rabbitmq');
const { EXCHANGE_NAME, createEvent } = require('../../shared/events/eventTypes');

async function publishEvent(eventType, data) {
    const channel = getChannel();
    if (!channel) {
        console.error('⚠️  Cannot publish event: RabbitMQ not connected');
        return false;
    }

    try {
        const event = createEvent(eventType, data, { source: 'task-service' });
        const message = Buffer.from(JSON.stringify(event));

        channel.publish(EXCHANGE_NAME, '', message, {
            persistent: true,        // Event ยังอยู่แม้ RabbitMQ restart
            contentType: 'application/json'
        });

        console.log(`📤 EVENT PUBLISHED: ${eventType} | ID: ${event.id}`);
        console.log(`   Data: ${JSON.stringify(data).slice(0, 100)}...`);

        return true;
    } catch (error) {
        console.error(`❌ Publish failed: ${error.message}`);
        return false;
    }
}

module.exports = { publishEvent };
