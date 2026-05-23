const Redis = require('ioredis');
require('dotenv').config();

const redisUrl = process.env.REDIS_URL;

// For production (like Upstash/Render), we often need to handle TLS and retries
const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // ioredis recommendation for some cloud providers
  connectTimeout: 10000,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

const QUEUE_PREFIX = 'queue:';

const addToQueue = async (language, socketId) => {
  const queueKey = `${QUEUE_PREFIX}${language}`;
  await redis.rpush(queueKey, socketId);
  console.log(`User ${socketId} added to ${language} queue`);
};

const removeFromQueue = async (language, socketId) => {
  const queueKey = `${QUEUE_PREFIX}${language}`;
  await redis.lrem(queueKey, 0, socketId);
  console.log(`User ${socketId} removed from ${language} queue`);
};

const findMatch = async (language, currentSocketId) => {
  const queueKey = `${QUEUE_PREFIX}${language}`;
  
  // Try to find another user in the queue
  // We use LPOP to get the first user in the queue
  let peerSocketId = await redis.lpop(queueKey);
  
  // If the popped user is the same as the current user (shouldn't happen with proper logic, but safe-guard)
  if (peerSocketId === currentSocketId) {
    peerSocketId = await redis.lpop(queueKey);
  }
  
  return peerSocketId;
};

module.exports = {
  addToQueue,
  removeFromQueue,
  findMatch
};
