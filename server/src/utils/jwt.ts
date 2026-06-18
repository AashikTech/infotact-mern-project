import jwt from 'jsonwebtoken';
import { config } from '../config';

export function signToken(userId: string) {
  return jwt.sign({ id: userId }, config.jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, config.jwtSecret) as { id: string };
}
