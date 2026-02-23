// notification-service/src/events/consumer.js
// Subscribe to task.events exchange → notification_queue
//
// เมื่อมี Event เข้ามา → สร้าง Notification (จำลองส่ง email)

const { getChannel } = require('../../shared/events/rabbitmq');
const { EXCHANGE_NAME, QUEUES, EVENT_TYPES } = require('../../shared/events/eventTypes');

// In-memory notification store (จำลอง — production จะเก็บใน DB)
const notifications = [];

// Template สำหรับ Notification แต่ละ Event Type
const TEMPLATES = {
    [EVENT_TYPES.TASK_CREATED]: (data) => ({
        icon: '📝',
        title: 'Task Created',
        message: `New task "${data.title}" has been created with ${data.priority} priority`
    }),
    [EVENT_TYPES.TASK_UPDATED]: (data) => ({
        icon: '✏️',
        title: 'Task Updated',
        message: `Task "${data.title}" has been updated`
    }),
    [EVENT_TYPES.TASK_COMPLETED]: (data) => ({
        icon: '🎉',
        title: 'Task Completed!',
        message: `Task "${data.title}" has been completed! (was: ${data.previousStatus})`
    }),
    [EVENT_TYPES.TASK_DELETED]: (data) => ({
        icon: '🗑️',
        title: 'Task Deleted',
        message: `Task "${data.title}" has been deleted`
    })
};

async function startConsumer() {
    const channel = getChannel();
    if (!channel) throw new Error('RabbitMQ channel not available');

    // สร้าง Queue (ถ้ายังไม่มี)
    await channel.assertQueue(QUEUES.NOTIFICATION, { durable: true });

    // Bind Queue กับ Exchange
    await channel.bindQueue(QUEUES.NOTIFICATION, EXCHANGE_NAME, '');

    console.log(`📥 Notification Service: Listening on queue "${QUEUES.NOTIFICATION}"`);

    // Consume messages
    channel.consume(QUEUES.NOTIFICATION, (msg) => {
        if (!msg) return;

        try {
            const event = JSON.parse(msg.content.toString());
            console.log(`\n📨 EVENT RECEIVED: ${event.type}`);

            // สร้าง Notification จาก Template
            const template = TEMPLATES[event.type];
            if (template) {
                const notif = {
                    id: notifications.length + 1,
                    eventId: event.id,
                    ...template(event.data),
                    eventType: event.type,
                    timestamp: event.metadata.timestamp,
                    read: false
                };

                notifications.push(notif);
                console.log(`${notif.icon} NOTIFICATION: ${notif.message}`);
                console.log(`   Total notifications: ${notifications.length}`);
            }

            // Acknowledge message (บอก RabbitMQ ว่าประมวลผลสำเร็จ)
            channel.ack(msg);

        } catch (error) {
            console.error('❌ Failed to process event:', error.message);
            // Reject and don't requeue (ป้องกัน infinite loop)
            channel.nack(msg, false, false);
        }
    });
}

function getNotifications() {
    return [...notifications].reverse();  // ใหม่สุดก่อน
}

function getUnreadCount() {
    return notifications.filter(n => !n.read).length;
}

module.exports = { startConsumer, getNotifications, getUnreadCount };
