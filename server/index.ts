import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socketHandlers.js';
import { logger } from './logger.js';
import { loadPromise } from './config.js';
import { fileURLToPath } from 'url';

export async function startServer(port: number = Number(process.env.PORT) || 3001) {
  await loadPromise;
  const app = express();
  const corsOptions = {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: '*'
  };
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  app.use((_, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    next();
  });
  app.use(express.json());

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  app.get('/logs', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({ logs: logger.getLogs() });
  });

  registerSocketHandlers(io, app);

  httpServer.listen(port, () => {
    logger.info(`Server listening on ${port}`);
  });

  return httpServer;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}
