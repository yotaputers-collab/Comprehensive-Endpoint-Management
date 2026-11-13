import { Gateway, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { SecurityEvent } from '../interfaces/soc.interface';

@Gateway()
@WebSocketGateway(3001, { cors: { origin: '*' } })
export class SocGateway {
  @WebSocketServer()
  server: Server;

  handleSecurityEvent(event: SecurityEvent) {
    this.server.emit('security-event', event);
    this.logger.log(`Security event emitted: ${event.type}`);
  }

  getActiveIncidents(): any[] {
    // In production: query active incidents from database
    return [];
  }

  getIncidentHistory(hours: number): any[] {
    // In production: query incident history
    return [];
  }
}