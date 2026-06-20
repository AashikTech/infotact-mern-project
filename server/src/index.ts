import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import http from 'http';
import { config } from './config';
import authRoutes from './routes/authRoutes';
import workspaceRoutes from './routes/workspaceRoutes';
import channelRoutes from './routes/channelRoutes';
import messageRoutes from './routes/messageRoutes';
import { initSockets } from './sockets';

const app = express();

app.use(cors({ origin: config.clientUrl }));
app.use(express.json());

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

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err: Error, _req: any, res: any, _next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const server = http.createServer(app);

mongoose
  .connect(config.mongoUri)
  .then(async () => {
    console.log('✅ MongoDB connected');
    await initSockets(server);
    server.listen(config.port, () => {
      console.log(`🚀 Server running on http://localhost:${config.port}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
