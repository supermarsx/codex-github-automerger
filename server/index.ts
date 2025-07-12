// @ts-nocheck
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socketHandlers.js';
import { logger } from './logger.js';

const app = express();
app.use(express.json());
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

registerSocketHandlers(io, app);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  logger.info(`Server listening on ${PORT}`);
});
