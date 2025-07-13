// @ts-nocheck
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socketHandlers.js';
import { logger } from './logger.js';
import { fileURLToPath } from 'url';

export function startServer(port: number = Number(process.env.PORT) || 3001) {
  const app = express();
  app.use(express.json());

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
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
