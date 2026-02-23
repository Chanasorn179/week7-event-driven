// shared/events/rabbitmq.js
// RabbitMQ Connection + Channel Helper
// ใช้ร่วมกันทั้ง Publisher และ Consumer

const amqplib = require('amqplib');
const { EXCHANGE_NAME, EXCHANGE_TYPE } = require('./eventTypes');

let connection = null;
let channel = null;

// เชื่อมต่อ RabbitMQ (พร้อม retry)
async function connect(retries = 10, delay = 3000) {
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';

    for (let i = 1; i <= retries; i++) {
        try {
            console.log(`🐰 Connecting to RabbitMQ... (attempt ${i}/${retries})`);
            connection = await amqplib.connect(url);
            channel = await connection.createChannel();

            // สร้าง Exchange (ถ้ายังไม่มี)
            await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
                durable: true   // Exchange ยังอยู่แม้ RabbitMQ restart
            });

            console.log(`✅ Connected to RabbitMQ | Exchange: ${EXCHANGE_NAME} (${EXCHANGE_TYPE})`);

            // Handle connection close
            connection.on('close', () => {
                console.log('⚠️  RabbitMQ connection closed');
                channel = null;
                connection = null;
            });

            return channel;
        } catch (error) {
            console.error(`❌ RabbitMQ attempt ${i} failed: ${error.message}`);
            if (i < retries) {
                console.log(`⏳ Retrying in ${delay / 1000}s...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    throw new Error('Failed to connect to RabbitMQ after all retries');
}

function getChannel() {
    return channel;
}

async function close() {
    if (channel) await channel.close();
    if (connection) await connection.close();
}

module.exports = { connect, getChannel, close };
