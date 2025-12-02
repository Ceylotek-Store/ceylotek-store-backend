const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient()

async function main() {

    // ------------------ ADMIN USER ------------------
    const hashedPassword = await bcrypt.hash('password123', 10);

    await prisma.user.upsert({
        where: { email: 'admin@shop.com' },
        update: {},
        create: {
            email: 'admin@shop.com',
            name: 'Super Admin',
            password: hashedPassword,
            role: 'SHOP_OWNER',
        },
    });

    console.log('Admin user created!')

    // ------------------ SMART WATCHES ------------------
    await prisma.product.createMany({
        data: [
            { name: 'AeroSync Pro S1', description: 'Premium smartwatch with edge-to-edge AMOLED display', price: 45990.00, stock: 20, category: 'SMARTWATCH', imageUrl: '/uploads/aerosync-pro-s1.png' },
            { name: 'ChronoWave X7', description: 'Titanium body smartwatch with futuristic neon UI', price: 52990.00, stock: 15, category: 'SMARTWATCH', imageUrl: '/uploads/chronowave-x7.png' },
            { name: 'VitaPulse Sense 5', description: 'Health-focused OLED smartwatch with HR tracking', price: 38990.00, stock: 25, category: 'SMARTWATCH', imageUrl: '/uploads/vitapulse-sense-5.png' },
            { name: 'NeoTrack Edge R3', description: 'Rugged outdoor smartwatch with activity dashboard', price: 48990.00, stock: 18, category: 'SMARTWATCH', imageUrl: '/uploads/neotrack-edge-r3.png' }
        ]
    })

    // ------------------ HEADPHONES ------------------
    await prisma.product.createMany({
        data: [
            { name: 'SonicWave H300', description: 'Premium over-ear headphones with memory foam cushions', price: 19990.00, stock: 20, category: 'HEADPHONE', imageUrl: '/uploads/sonicwave-h300.png' },
            { name: 'EchoBeats Fusion X1', description: 'Wireless headphones with LED ring accents', price: 21990.00, stock: 15, category: 'HEADPHONE', imageUrl: '/uploads/echobeats-fusion-x1.png' },
            { name: 'BassCore Pro 7', description: 'Bass-boosted noise isolation headphone', price: 17990.00, stock: 30, category: 'HEADPHONE', imageUrl: '/uploads/basscore-pro-7.png' },
            { name: 'AuraSound Lite S2', description: 'Lightweight wireless headphones in pastel blue', price: 14990.00, stock: 25, category: 'HEADPHONE', imageUrl: '/uploads/aurasound-lite-s2.png' }
        ]
    })

    // ------------------ SPEAKERS & SUBWOOFERS ------------------
    await prisma.product.createMany({
        data: [
            { name: 'ThunderBox Sub S900', description: 'Premium home-theatre subwoofer', price: 54990.00, stock: 12, category: 'SPEAKER', imageUrl: '/uploads/thunderbox-s900.png' },
            { name: 'PulseStream Duo BT40', description: 'Dual Bluetooth speakers with LED ring design', price: 24990.00, stock: 18, category: 'SPEAKER', imageUrl: '/uploads/pulsestream-bt40.png' },
            { name: 'MegaTune StudioBar X5', description: 'Compact soundbar with metal grille design', price: 31990.00, stock: 10, category: 'SPEAKER', imageUrl: '/uploads/megatune-x5.png' }
        ]
    })

    // ------------------ EARBUDS ------------------
    await prisma.product.createMany({
        data: [
            { name: 'AirPulse Mini T1', description: 'True wireless earbuds with glossy white finish', price: 8990.00, stock: 40, category: 'EARBUD', imageUrl: '/uploads/airpulse-t1.png' },
            { name: 'BassDrop NeoPods X3', description: 'Bass-boost matte black earbuds', price: 10990.00, stock: 35, category: 'EARBUD', imageUrl: '/uploads/neopods-x3.png' },
            { name: 'EchoFit Lite Buds S20', description: 'Lightweight fitness earbuds with soft silicone tips', price: 7990.00, stock: 50, category: 'EARBUD', imageUrl: '/uploads/echofit-s20.png' },
            { name: 'WaveBeat Pro Buds ZX', description: 'ANC earbuds with LED indicators', price: 12990.00, stock: 30, category: 'EARBUD', imageUrl: '/uploads/wavebeat-zx.png' }
        ]
    })

    // ------------------ PC ACCESSORIES ------------------
    await prisma.product.createMany({
        data: [
            { name: 'LumiBar Pro M1', description: 'Premium monitor light bar with adjustable brightness', price: 12990.00, stock: 20, category: 'PC_ACCESSORY', imageUrl: '/uploads/lumibar-pro-m1.png' },
            { name: 'FlexMount Arm A200', description: 'Adjustable gas-spring monitor mounting arm with cable management', price: 21990.00, stock: 15, category: 'PC_ACCESSORY', imageUrl: '/uploads/flexmount-arm-a200.png' },
            { name: 'GlowLine RGB Strip LUX50', description: 'Flexible RGB LED light strip for PC with controller', price: 8990.00, stock: 25, category: 'PC_ACCESSORY', imageUrl: '/uploads/glowline-rgb-lux50.png' }
        ]
    })

    console.log('All products including PC accessories inserted successfully!')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
