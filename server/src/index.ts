import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import http from 'http';
import { config } from './config';

const app = express();

app.use(cors({ origin: config.clientUrl }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'Collaboration Workspace API' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);

mongoose
  .connect(config.mongoUri)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(config.port, () => {
      console.log(`🚀 Server running on http://localhost:${config.port}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
