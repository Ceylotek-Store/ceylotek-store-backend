const nodemailer = require('nodemailer');

// 1. Configure the Transporter (Connects to Mailpit VM)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || '192.168.56.50', // Tools VM IP
    port: Number(process.env.SMTP_PORT) || 1025,     // Mailpit SMTP Port
    secure: false, // Mailpit uses unencrypted SMTP
    ignoreTLS: true, // Prevent certificate errors in dev
    auth: {
        user: process.env.SMTP_USER || 'any', // Mailpit accepts anything
        pass: process.env.SMTP_PASS || 'any'
    }
});

// 2. HTML Template Generator (Kept your logic)
const generateOrderTemplate = (order) => {
    const itemsHtml = order.items.map(item => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.product.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">Rs. ${item.price}</td>
        </tr>
    `).join('');

    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #00ADB5;">Thank you for your order!</h1>
            <p>Hi ${order.user.name},</p>
            <p>We have received your order <strong>#${order.id}</strong> and it is now being processed.</p>
            
            <h3>Order Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        <th style="text-align: left; padding: 8px;">Product</th>
                        <th style="text-align: left; padding: 8px;">Qty</th>
                        <th style="text-align: left; padding: 8px;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            
            <h3 style="text-align: right; margin-top: 20px;">Total: Rs. ${order.totalAmount}</h3>
            
            <hr>
            <p><strong>Shipping to:</strong><br>
            ${order.shippingAddress}<br>
            ${order.contactPhone}</p>
        </div>
    `;
};

// 3. The Send Function
const sendOrderConfirmation = async (order) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"Ceylotek Store" <noreply@ceylotek.com>',
            to: order.user.email, 
            subject: `Order Confirmation #${order.id}`,
            html: generateOrderTemplate(order)
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("📧 Email sent: %s", info.messageId);
        return true;
    } catch (error) {
        console.error("❌ Email failed:", error);
        return false;
    }
};

module.exports = { sendOrderConfirmation };


// const nodemailer = require('nodemailer');

// // 1. Configure the Transporter (The Postman)
// const transporter = nodemailer.createTransport({
//     service: 'gmail', 
//     auth: {
//         user: process.env.EMAIL_USER, // Your Gmail address
//         pass: process.env.EMAIL_PASS  // Your Gmail APP PASSWORD (not login password)
//     }
// });

// // 2. HTML Template Generator
// const generateOrderTemplate = (order) => {
//     const itemsHtml = order.items.map(item => `
//         <tr>
//             <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.product.name}</td>
//             <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
//             <td style="padding: 8px; border-bottom: 1px solid #ddd;">Rs. ${item.price}</td>
//         </tr>
//     `).join('');

//     return `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//             <h1 style="color: #00ADB5;">Thank you for your order!</h1>
//             <p>Hi ${order.user.name},</p>
//             <p>We have received your order <strong>#${order.id}</strong> and it is now being processed.</p>
            
//             <h3>Order Summary</h3>
//             <table style="width: 100%; border-collapse: collapse;">
//                 <thead>
//                     <tr style="background-color: #f8f9fa;">
//                         <th style="text-align: left; padding: 8px;">Product</th>
//                         <th style="text-align: left; padding: 8px;">Qty</th>
//                         <th style="text-align: left; padding: 8px;">Price</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//                     ${itemsHtml}
//                 </tbody>
//             </table>
            
//             <h3 style="text-align: right; margin-top: 20px;">Total: Rs. ${order.totalAmount}</h3>
            
//             <hr>
//             <p><strong>Shipping to:</strong><br>
//             ${order.shippingAddress}<br>
//             ${order.contactPhone}</p>
//         </div>
//     `;
// };

// // 3. The Send Function
// const sendOrderConfirmation = async (order) => {
//     try {
//         const mailOptions = {
//             from: '"Ceylotek Store" <your-email@gmail.com>',
//             to: order.user.email, // The customer's email
//             subject: `Order Confirmation #${order.id}`,
//             html: generateOrderTemplate(order)
//         };

//         const info = await transporter.sendMail(mailOptions);
//         console.log("📧 Email sent: %s", info.messageId);
//         return true;
//     } catch (error) {
//         console.error("❌ Email failed:", error);
//         return false;
//     }
// };

// module.exports = { sendOrderConfirmation };