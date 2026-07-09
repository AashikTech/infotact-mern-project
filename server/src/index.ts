import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import http from 'http';
import path from 'path';
import { config } from './config';
import authRoutes from './routes/authRoutes';
import workspaceRoutes from './routes/workspaceRoutes';
import channelRoutes from './routes/channelRoutes';
import messageRoutes from './routes/messageRoutes';
import docRoutes from './routes/docRoutes';
import { initSockets } from './sockets';
import { connectRedis } from './utils/cache';

const app = express();

app.use(cors({ origin: config.clientUrl }));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/', (_req, res) => {
  res.json({ message: 'Collaboration Workspace API' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/docs', docRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
};

app.use(errorHandler);

const server = http.createServer(app);

mongoose
  .connect(config.mongoUri)
  .then(async () => {
    console.log('✅ MongoDB connected');
    connectRedis();
    await initSockets(server);
    server.listen(config.port, () => {
      console.log(`🚀 Server running on http://localhost:${config.port}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
