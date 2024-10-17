import net from 'net';
import crypto from 'crypto';
import EventEmitter from 'events';
import {
  CreamSocketParser
} from './CreamSocketParser';

/**
 * Represents a WebSocket server.
 */
export class CreamSocketServer extends EventEmitter {
  /**
   * Creates an instance of CreamSocketServer.
   * @param {Object} options - Server options.
   * @param {number} options.port - Port number to listen on.
   * @param {string} [options.host='localhost'] - Host address.
   * @param {string} [options.format='json'] - Data format (e.g., 'json' or 'binary').
   */
  constructor({
    port,
    host = 'localhost',
    format = 'json'
  }) {
    super();
    this.port = port;
    this.host = host;
    this.parser = new CreamSocketParser(format); // Initialize parser with format
    this.server = net.createServer(this._handleConnection.bind(this));
    this.clients = new Set();
  }

  /**
   * Starts the WebSocket server.
   */
  start() {
    this.server.listen(this.port, this.host, () => {
      console.log(`WebSocket server listening on ${this.host}:${this.port}`);
      this.emit('listening');
    });
  }

  /**
   * Stops the WebSocket server.
   */
  stop() {
    this.server.close(() => {
      console.log('WebSocket server stopped.');
      this.emit('close');
    });
    this.clients.forEach((client) => client.destroy());
    this.clients.clear();
  }

  /**
   * Handles incoming TCP connections.
   * @param {net.Socket} socket - The connected socket.
   */
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

  /**
   * Checks if the incoming request is a WebSocket upgrade request.
   * @param {string} request - The raw HTTP request.
   * @returns {boolean} - True if it's a WebSocket upgrade request.
   */
  _isWebSocketRequest(request) {
    return request.includes('Upgrade: websocket');
  }

  /**
   * Performs the WebSocket handshake.
   * @param {net.Socket} socket - The connected socket.
   * @param {string} request - The raw HTTP request.
   */
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

  /**
   * Parses HTTP headers from the request.
   * @param {string} request - The raw HTTP request.
   * @returns {Object} - Parsed headers as key-value pairs.
   */
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

  /**
   * Generates the Sec-WebSocket-Accept value.
   * @param {string} key - The Sec-WebSocket-Key from the client.
   * @returns {string} - The Sec-WebSocket-Accept value.
   */
  _generateAcceptValue(key) {
    return crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');
  }

  /**
   * Handles incoming WebSocket frames.
   * @param {net.Socket} socket - The connected socket.
   * @param {Buffer} data - The received data.
   */
  _handleFrame(socket, data) {
    const frame = this._decodeFrame(data);
    if (!frame) return;

    const decodedPayload = this.parser.decode(frame.payload);

    switch (frame.opcode) {
      case 0x1: // Text frame
        this.emit('message', socket, decodedPayload);
        break;
      case 0x2: // Notification frame
        this.emit('notification', socket, decodedPayload);
        break;
      case 0x8: // Connection close
        socket.end();
        break;
      case 0x9: // Ping
        this._sendPong(socket, frame.payload);
        break;
      case 0xA: // Pong
        // Handle pong if implementing heartbeat
        break;
      default:
        console.log(`Unhandled opcode: ${frame.opcode}`);
    }
  }

  /**
   * Decodes a WebSocket frame.
   * @param {Buffer} buffer - The received data buffer.
   * @returns {Object|null} - Decoded frame or null if invalid.
   */
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
      payload: decodedPayload.toString()
    };
  }

  /**
   * Encodes a message into a WebSocket frame.
   * @param {string} message - The message to send.
   * @returns {Buffer} - The encoded frame.
   */
  _encodeFrame(message, opcode = 0x1) {
    const payload = Buffer.from(this.parser.encode(message));
    const payloadLength = payload.length;

    let frame = [];

    // First byte: FIN and opcode (0x1 for text, 0x2 for notification)
    frame.push(0x80 | opcode);

    // Determine payload length
    if (payloadLength < 126) {
      frame.push(payloadLength);
    } else if (payloadLength < 65536) {
      frame.push(126);
      frame.push((payloadLength >> 8) & 0xff);
      frame.push(payloadLength & 0xff);
    } else {
      // Note: JavaScript can't handle integers larger than 2^53 - 1
      frame.push(127);
      // Push 8 bytes (64 bits) for payload length
      for (let i = 7; i >= 0; i--) {
        frame.push((payloadLength >> (i * 8)) & 0xff);
      }
    }

    return Buffer.concat([Buffer.from(frame), payload]);
  }

  /**
   * Sends a text message to a specific client.
   * @param {net.Socket} socket - The target socket.
   * @param {string | object} message - The message to send.
   */
  sendMessage(socket, message) {
    const frame = this._encodeFrame(message, 0x1);
    socket.write(frame);
  }

  /**
   * Sends a notification to a specific client.
   * @param {net.Socket} socket - The target socket.
   * @param {string | object} notification - The notification to send.
   */
  sendNotification(socket, notification) {
    const frame = this._encodeFrame(notification, 0x2); // Assuming opcode 0x2 for notifications
    socket.write(frame);
  }

  /**
   * Broadcasts a message to all connected clients.
   * @param {string | object} message - The message to broadcast.
   */
  broadcast(message) {
    for (const client of this.clients) {
      this.sendMessage(client, message);
    }
  }

  /**
   * Sends a Pong frame in response to a Ping.
   * @param {net.Socket} socket - The target socket.
   * @param {Buffer} payload - The ping payload to reply with.
   */
  _sendPong(socket, payload) {
    const pongFrame = this._encodeFrame(payload, 0xA); // Opcode 0xA for Pong
    socket.write(pongFrame);
  }
}