import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000', // Your frontend URL
    credentials: true,
  },
})
export class MistingRealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Emit when misting starts
  emitMistingStarted(data: any) {
    this.server.emit('misting-started', data);
    console.log('🔴 Emitted: misting-started', data);
  }

  // Emit when misting ends
  emitMistingEnded(data: any) {
    this.server.emit('misting-ended', data);
    console.log('🟢 Emitted: misting-ended', data);
  }

  // Emit sensor updates
  emitSensorUpdate(data: any) {
    this.server.emit('sensor-update', data);
  }
}