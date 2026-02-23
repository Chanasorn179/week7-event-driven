// shared/events/eventTypes.js
// === Event Contract ===
// ทุก Service ใช้ไฟล์นี้เป็น "สัญญา" ว่า Event หน้าตาเป็นยังไง

const EVENT_TYPES = {
    TASK_CREATED: 'TASK_CREATED',
    TASK_UPDATED: 'TASK_UPDATED',
    TASK_COMPLETED: 'TASK_COMPLETED',
    TASK_DELETED: 'TASK_DELETED'
};

// Exchange name สำหรับ RabbitMQ
const EXCHANGE_NAME = 'task.events';
const EXCHANGE_TYPE = 'fanout';   // ส่งไปทุก queue ที่ bind

// Queue names
const QUEUES = {
    NOTIFICATION: 'notification_queue',
    AUDIT: 'audit_queue'
};

// สร้าง Event object มาตรฐาน
function createEvent(type, data, metadata = {}) {
    return {
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: type,
        data: data,
        metadata: {
            timestamp: new Date().toISOString(),
            source: metadata.source || 'task-service',
            version: '1.0',
            ...metadata
        }
    };
}

module.exports = { EVENT_TYPES, EXCHANGE_NAME, EXCHANGE_TYPE, QUEUES, createEvent };
