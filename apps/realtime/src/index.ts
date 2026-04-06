import { Server } from 'socket.io';
import { subscribeAgentEvents } from '@hollywood/queue';
import type { ServerToClientEvents, ClientToServerEvents } from '@hollywood/types';

const PORT = parseInt(process.env.REALTIME_PORT ?? '3001', 10);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(PORT, {
  cors: {
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Handle client connections
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Clients join a project room to receive events for that project
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

// Subscribe to Redis Pub/Sub and relay events to Socket.io rooms
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
console.log(`   Relaying agent events from Redis → Socket.io`);
