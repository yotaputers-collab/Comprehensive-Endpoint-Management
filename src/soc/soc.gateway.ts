import { Logger, OnModuleInit } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { SecurityEvent } from './soc.interface';

@WebSocketGateway({ port: 3001, cors: { origin: '*' } })
export class SocGateway implements OnModuleInit {
  private readonly logger = new Logger(SocGateway.name);

  @WebSocketServer()
  server: Server;

  onModuleInit(): void {
    this.logger.log('SOC WebSocket gateway initialised on port 3001');
  }

  handleSecurityEvent(event: SecurityEvent): void {
    if (!this.server) {
      this.logger.warn('SOC gateway not ready, dropping security event');
      return;
    }
    this.server.emit('security-event', event);
    this.logger.log(`Security event emitted: ${event.type}`);
  }

  getActiveIncidents(): unknown[] {
    return [];
  }

  getIncidentHistory(): unknown[] {
    return [];
  }
}
