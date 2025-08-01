import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socketHandlers.js';
import { logger, onLog } from './logger.js';
import { loadPromise } from './config.js';
import { fileURLToPath } from 'url';

export async function startServer(port: number = Number(process.env.PORT) || 3001) {
  logger.debug('server', 'Starting server', { port });
  logger.debug('server', 'Waiting for config load');
  await loadPromise;
  logger.debug('server', 'Config loaded');
  if (process.env.NODE_ENV !== 'production') {
    onLog(entry => process.stdout.write(`[${entry.level}] ${entry.message}\n`));
  }
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
  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
  });
  app.use(express.json());

  logger.debug('server', 'Creating HTTP server');
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  if (process.env.NODE_ENV !== 'production') {
    onLog(entry => io.emit('server_log', entry));
  }

  app.get('/logs', (_req, res) => {
    logger.debug('server', 'GET /logs');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({ logs: logger.getLogs() });
  });

  logger.debug('server', 'Registering socket handlers');
  const cleanupTimer = registerSocketHandlers(io, app);
  httpServer.on('close', () => {
    clearInterval(cleanupTimer);
    logger.debug('server', 'Cleanup timer cleared');
  });

  logger.debug('server', 'Starting HTTP server listen', { port });
  httpServer.listen(port, () => {
    logger.debug('server', 'HTTP server listening', { port });
    logger.info(`Server listening on ${port}`);
  });

  return httpServer;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}
