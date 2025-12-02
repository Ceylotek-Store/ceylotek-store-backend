const amqp = require('amqplib');

let channel = null;

const connectRabbitMQ = async () => {
    const rabbitUrl = process.env.RABBITMQ_URL;
    try {
        const connection = await amqp.connect(rabbitUrl);
        channel = await connection.createChannel();
        await channel.assertQueue('ORDER_QUEUE');
        console.log("🐰 Connected to RabbitMQ");
    } catch (error) {
        console.error("RabbitMQ Connection Error:", error);
    }
};

const sendToQueue = async (queue, data) => {
    if (!channel) await connectRabbitMQ();
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)));
};

module.exports = { connectRabbitMQ, sendToQueue };