import { Server } from 'socket.io';
import { jwtVerify } from 'jose';
import { subscribeAgentEvents } from '@hollywood/queue';
import type { ServerToClientEvents, ClientToServerEvents } from '@hollywood/types';

const PORT = parseInt(process.env.REALTIME_PORT ?? '3001', 10);
const AUTH_SECRET = process.env.AUTH_SECRET;

const io = new Server<ClientToServerEvents, ServerToClientEvents>(PORT, {
  cors: {
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// ── Auth middleware ─────────────────────────────────────────────────
io.use(async (socket, next) => {
  // Skip auth if no AUTH_SECRET configured (dev mode)
  if (!AUTH_SECRET) {
    console.log(`  ⚠ No AUTH_SECRET — skipping auth for ${socket.id}`);
    return next();
  }

  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const secret = new TextEncoder().encode(AUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    // Attach user info to socket data for downstream use
    (socket.data as any).userId = payload.sub ?? payload.id;
    (socket.data as any).email = payload.email;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
});

// ── Connection handling ────────────────────────────────────────────
io.on('connection', (socket) => {
  const userId = (socket.data as any).userId ?? 'anonymous';
  console.log(`🔌 Client connected: ${socket.id} (user: ${userId})`);

  socket.on('project:join', ({ projectId }) => {
    socket.join(`project:${projectId}`);
    console.log(`   ${socket.id} joined project:${projectId}`);
  });

  socket.on('project:leave', ({ projectId }) => {
    socket.leave(`project:${projectId}`);
    console.log(`   ${socket.id} left project:${projectId}`);
  });

  // Canvas sync: relay node updates to other clients in the same project
  socket.on('canvas:nodeUpdate' as any, (data: { projectId: string; node: any; senderId: string }) => {
    socket.to(`project:${data.projectId}`).emit('canvas:nodeUpdated' as any, {
      node: data.node,
      senderId: data.senderId,
    });
  });

  socket.on('canvas:nodeCreate' as any, (data: { projectId: string; node: any; senderId: string }) => {
    socket.to(`project:${data.projectId}`).emit('canvas:nodeCreated' as any, {
      node: data.node,
      senderId: data.senderId,
    });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ── Redis Pub/Sub → Socket.io relay ────────────────────────────────
subscribeAgentEvents((event) => {
  const room = `project:${event.projectId}`;

  switch (event.type) {
    case 'progress':
      io.to(room).emit('agent:progress', {
        jobId: event.jobId,
        agentType: event.agentType as any,
        progress: event.progress,
        message: event.message,
      });
      break;

    case 'completed':
      io.to(room).emit('agent:completed', {
        jobId: event.jobId,
        agentType: event.agentType as any,
        result: event.result as any,
      });
      break;

    case 'failed':
      io.to(room).emit('agent:failed', {
        jobId: event.jobId,
        agentType: event.agentType as any,
        error: event.error,
      });
      break;
  }
});

console.log(`🎬 Hollywood Realtime server listening on port ${PORT}`);
console.log(`   Auth: ${AUTH_SECRET ? 'JWT verification enabled' : 'DISABLED (no AUTH_SECRET)'}`);
console.log(`   Relaying agent events from Redis → Socket.io`);
