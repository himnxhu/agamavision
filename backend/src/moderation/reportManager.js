const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

const REPORT_THRESHOLD = 3; // Number of reports before action
const BAN_DURATION = 3600; // 1 hour in seconds

const reportUser = async (targetId, reporterId) => {
  // In a real app, we would resolve targetId to an IP or Fingerprint
  // For MVP, we'll just track reports on the current connection
  const reportKey = `reports:${targetId}`;
  const count = await redis.incr(reportKey);
  await redis.expire(reportKey, 86400); // Reset reports after 24h

  console.log(`User ${targetId} reported by ${reporterId}. Total reports: ${count}`);

  if (count >= REPORT_THRESHOLD) {
    return true; // Should be banned/disconnected
  }
  return false;
};

const isBanned = async (id) => {
  const banKey = `ban:${id}`;
  const banned = await redis.get(banKey);
  return !!banned;
};

const banUser = async (id) => {
  const banKey = `ban:${id}`;
  await redis.set(banKey, 'true', 'EX', BAN_DURATION);
  console.log(`User ${id} banned for ${BAN_DURATION}s`);
};

module.exports = {
  reportUser,
  isBanned,
  banUser
};
