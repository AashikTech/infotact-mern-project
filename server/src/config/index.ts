import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET;

if (isProduction && (!jwtSecret || jwtSecret === 'dev_secret_change_me')) {
  throw new Error('JWT_SECRET must be set to a secure value in production');
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/collab',
  jwtSecret: jwtSecret || 'dev_secret_change_me',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
};
