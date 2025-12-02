// config/redis.js
const Redis = require('ioredis');

// Prevent multiple connections in development
let redis;

if (!global.redis) {
  global.redis = new Redis(process.env.REDIS_URL);
}
redis = global.redis;

redis.on('connect', () => console.log('✅ Redis Connected'));
redis.on('error', (err) => console.error('❌ Redis Error', err));

module.exports = redis;