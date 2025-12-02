require('dotenv').config();
const amqp = require('amqplib');
const prisma = require('./src/config/prisma');
const emailService = require('./src/services/emailService'); // Import the new service

const processOrder = async (data) => {
    console.log(`⚙️ Processing Order #${data.orderId}...`);

    try {
        // 1. Fetch Full Order Details (We need product names and user email for the receipt)
        const fullOrder = await prisma.order.findUnique({
            where: { id: data.orderId },
            include: {
                user: true, // Get customer email/name
                items: {
                    include: { product: true } // Get product names
                }
            }
        });

        if (!fullOrder) throw new Error("Order not found in DB");

        // 2. Send the Email
        await emailService.sendOrderConfirmation(fullOrder);

        // 3. Update Status to 'PROCESSING' or 'SHIPPED'
        await prisma.order.update({
            where: { id: data.orderId },
            data: { status: 'PROCESSING' } // Changed from SHIPPED (usually shipping is manual later)
        });

        console.log(`✅ Order #${data.orderId} Processed & Email Sent!`);

    } catch (err) {
        console.error("Processing Logic Failed:", err);
        // In a real app, you might move this to a "Dead Letter Queue"
    }
};

const startWorker = async () => {
    try {
        const rabbitUrl = process.env.RABBITMQ_URL;
        
        if (!rabbitUrl) {
            throw new Error("RABBITMQ_URL is missing in .env file");
        }

        console.log(`🔌 Connecting to RabbitMQ...`); // Good for debugging connection issues
        
        const connection = await amqp.connect(rabbitUrl);
        const channel = await connection.createChannel();
        const queue = 'ORDER_QUEUE';

        await channel.assertQueue(queue);
        console.log("👷 Worker waiting for orders...");

        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                const data = JSON.parse(msg.content.toString());
                await processOrder(data);
                channel.ack(msg);
            }
        });

        // Handle connection close
        connection.on('close', () => {
            console.error('RabbitMQ connection closed. Exiting...');
            process.exit(1); // PM2 will restart it
        });

    } catch (error) {
        console.error("Worker Error:", error.message);
        // Retry logic or exit so PM2 can restart
        setTimeout(() => process.exit(1), 5000);
    }
};

startWorker();