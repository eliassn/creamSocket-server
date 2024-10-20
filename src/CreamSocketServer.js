import net from 'net';
import crypto from 'crypto';
import EventEmitter from 'events';
import {
  CreamSocketParser
} from './CreamSocketParser.js';

/**
 * Represents a CreamSocket server.
 */
export class CreamSocketServer extends EventEmitter {
  constructor({
    port,
    host = 'localhost',
    format = 'json'
  }) {
    super();
    this.port = port;
    this.host = host;
    this.parser = new CreamSocketParser(format);
    this.server = net.createServer(this._handleConnection.bind(this));
    this.clients = new Set();
  }

  start() {
    this.server.listen(this.port, this.host, () => {
      console.log(`CreamSocket server listening on ${this.host}:${this.port}`);
      this.emit('listening');
    });
  }

  stop() {
    this.server.close(() => {
      console.log('CreamSocket server stopped.');
      this.emit('close');
    });
    this.clients.forEach(client => client.destroy());
    this.clients.clear();
  }

  _handleConnection(socket) {
    console.log('New TCP connection established.');

    socket.once('data', (data) => {
      const request = data.toString();
      if (this._isWebSocketRequest(request)) {
        this._performHandshake(socket, request);
      } else {
        console.log('Received non-WebSocket connection. Destroying socket.');
        socket.destroy();
      }
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
    });
  }

  _isWebSocketRequest(request) {
    return request.includes('Upgrade: websocket');
  }

  _performHandshake(socket, request) {
    const headers = this._parseHeaders(request);
    const secWebSocketKey = headers['sec-websocket-key'];
    const secWebSocketAccept = this._generateAcceptValue(secWebSocketKey);

    const responseHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${secWebSocketAccept}`,
      '\r\n',
    ];

    socket.write(responseHeaders.join('\r\n'));
    console.log('WebSocket handshake completed.');

    this.clients.add(socket);
    this.emit('connection', socket);

    socket.on('data', (data) => this._handleFrame(socket, data));
    socket.on('close', () => {
      console.log('Client disconnected.');
      this.clients.delete(socket);
      this.emit('disconnection', socket);
    });
  }

  _parseHeaders(request) {
    const lines = request.split('\r\n');
    const headers = {};
    lines.forEach((line) => {
      const [key, value] = line.split(': ');
      if (key && value) {
        headers[key.toLowerCase()] = value;
      }
    });
    return headers;
  }

  _generateAcceptValue(key) {
    return crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');
  }

  _handleFrame(socket, data) {
    const frame = this._decodeFrame(data);
    if (!frame) return;

    // Handle different opcodes
    if (frame.opcode === 0x1) {
      // Text frame
      const decodedPayload = this.parser.decode(frame.payload.toString('utf8'));
      this.emit('message', socket, decodedPayload);
    } else if (frame.opcode === 0x2) {
      // Binary frame (e.g., notifications)
      const decodedPayload = this.parser.decode(frame.payload);
      this.emit('notification', socket, decodedPayload);
    } else if (frame.opcode === 0x8) {
      socket.end(); // Connection close
    } else if (frame.opcode === 0x9) {
      this._sendPong(socket, frame.payload); // Ping
    } else if (frame.opcode === 0xA) {
      // Pong - no action needed
    } else {
      console.log(`Unhandled opcode: ${frame.opcode}`);
    }
  }
  _decodeFrame(buffer) {
    const firstByte = buffer.readUInt8(0);
    const secondByte = buffer.readUInt8(1);

    const fin = (firstByte & 0x80) >> 7;
    const opcode = firstByte & 0x0f;
    const masked = (secondByte & 0x80) >> 7;
    let payloadLength = secondByte & 0x7f;
    let offset = 2;

    if (payloadLength === 126) {
      payloadLength = buffer.readUInt16BE(2);
      offset += 2;
    } else if (payloadLength === 127) {
      payloadLength = buffer.readBigUInt64BE(2);
      offset += 8;
    }

    let maskingKey;
    if (masked) {
      maskingKey = buffer.slice(offset, offset + 4);
      offset += 4;
    }

    const payload = buffer.slice(offset, offset + Number(payloadLength));

    let decodedPayload = payload;
    if (masked) {
      decodedPayload = Buffer.alloc(payload.length);
      for (let i = 0; i < payload.length; i++) {
        decodedPayload[i] = payload[i] ^ maskingKey[i % 4];
      }
    }

    return {
      fin,
      opcode,
      payload: decodedPayload.toString(),
    };
  }

  _encodeFrame(message, opcode = 0x1) {
    const payload = Buffer.from(message, 'utf-8'); // Ensure UTF-8 encoding
    const payloadLength = payload.length;

    let frame = [];

    // First byte: FIN and opcode
    frame.push(0x80 | opcode);

    // Determine payload length
    if (payloadLength < 126) {
      frame.push(payloadLength);
    } else if (payloadLength < 65536) {
      frame.push(126);
      frame.push((payloadLength >> 8) & 0xff);
      frame.push(payloadLength & 0xff);
    } else {
      frame.push(127);
      for (let i = 7; i >= 0; i--) {
        frame.push((payloadLength >> (i * 8)) & 0xff);
      }
    }

    // Concatenate frame and payload
    return Buffer.concat([Buffer.from(frame), payload]);
  }

  sendMessage(socket, message) {
    const frame = this._encodeFrame(message, 0x1);
    socket.write(frame);
  }

  sendNotification(socket, notification) {
    const encodedNotification = this.parser.encode(notification);
    const frame = this._encodeFrame(encodedNotification, 0x2);
    socket.write(frame);
  }

  broadcast(message) {
    const encodedMessage = this.parser.encode(message);
    const frame = this._encodeFrame(encodedMessage);
    for (const client of this.clients) {
      client.write(frame);
    }
  }

  broadcastNotification(notification) {
    const encodedNotification = this.parser.encode(notification);
    const frame = this._encodeFrame(encodedNotification, 0x2);
    for (const client of this.clients) {
      client.write(frame);
    }
  }

  _sendPong(socket, payload) {
    const encodedPong = this.parser.encode(payload);
    const frame = this._encodeFrame(encodedPong, 0xA);
    socket.write(frame);
  }

  _sendCloseFrame(socket) {
    const frame = this._encodeFrame('', 0x8);
    socket.write(frame);
    socket.end();
  }
}