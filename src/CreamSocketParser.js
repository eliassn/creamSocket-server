/**
 * Represents a parser for encoding and decoding messages and notifications.
 */
export class CreamSocketParser {
  /**
   * Creates an instance of CreamSocketParser.
   * @param {string} format - The data format ('json' or 'binary').
   */
  constructor(format = 'json') {
    this.format = format;
    this.buffer = new Uint8Array(); // Use a Buffer for accumulating data
  }

  /**
   * Encodes data based on the specified format.
   * @param {string | object} data - The data to encode.
   * @param {number} [opcode=0x1] - The WebSocket opcode (0x1 for text, 0x2 for binary, etc.).
   * @returns {Buffer} - The encoded frame as a Buffer.
   */
  encode(data, opcode = 0x1) {
    let payload;

    if (this.format === 'json') {
      payload = new TextEncoder().encode(typeof data === 'object' ? JSON.stringify(data) : String(data));
    } else if (this.format === 'binary') {
      payload = data instanceof Uint8Array ? data : new TextEncoder().encode(data);
    }

    const payloadLength = payload.length;
    const frame = [0x80 | opcode]; // First byte: FIN and opcode

    if (payloadLength < 126) {
      frame.push(payloadLength);
    } else if (payloadLength < 65536) {
      frame.push(126, (payloadLength >> 8) & 0xff, payloadLength & 0xff);
    } else {
      frame.push(127);
      for (let i = 7; i >= 0; i--) {
        frame.push((payloadLength >> (i * 8)) & 0xff);
      }
    }

    // Combine frame and payload into a single Uint8Array
    const frameBuffer = new Uint8Array(frame.length + payloadLength);
    frameBuffer.set(new Uint8Array(frame), 0);
    frameBuffer.set(payload, frame.length);

    return frameBuffer; // Return as Uint8Array
  }

  /**
   * Decodes data based on the specified format.
   * @param {Buffer} data - The data to decode.
   * @returns {object | string | Buffer | null} - The decoded data.
   */
  decode(data) {
    // Ensure incoming data is a Uint8Array
    if (!(data instanceof Uint8Array)) {
      console.error('Expected a Uint8Array, but received:', data);
      return null; // Exit if the data is not a Uint8Array
    }

    // Append new data to the existing buffer
    this.buffer = new Uint8Array([...this.buffer, ...data]);

    // Check if we have enough data to process
    while (this.buffer.length > 0) {
      const frameHeader = this.buffer[0]; // Read the first byte
      const opcode = frameHeader & 0x0F; // Extract the opcode
      const payloadLength = this.buffer[1] & 0x7F; // Read the payload length

      // Determine full payload length
      let fullPayloadLength = payloadLength;
      let offset = 2; // Start reading after the first two bytes

      if (payloadLength === 126) {
        fullPayloadLength = this.buffer.readUInt16BE(offset); // 16-bit length
        offset += 2;
      } else if (payloadLength === 127) {
        fullPayloadLength = this.buffer.readBigUInt64BE(offset); // 64-bit length
        offset += 8;
      }

      // Ensure we have the entire payload
      if (this.buffer.length < offset + fullPayloadLength) {
        return null; // Not enough data to process the frame yet
      }

      // Extract the payload
      const payload = this.buffer.slice(offset, offset + fullPayloadLength);

      // Clear the buffer for the next frame
      this.buffer = this.buffer.slice(offset + fullPayloadLength);

      let decodedData;

      // Handle the decoding based on the opcode
      if (opcode === 0x1) { // Text frame
        const text = new TextDecoder('utf-8').decode(payload);
        decodedData = JSON.parse(text);
      } else if (opcode === 0x2) { // Binary frame
        decodedData = payload; // Return raw binary data
      } else {
        console.warn('Unhandled opcode:', opcode);
        continue; // Skip unhandled opcodes
      }

      return decodedData; // Return the decoded data
    }

    return null; // If no valid frame is processed, return null
  }
  /**
   * Handles incoming messages.
   * @param {Buffer | string} data - The received message data.
   * @param {net.Socket} socket - The client's socket for potential response.
   * @returns {object | string | null} - The processed message or null if invalid.
   */
  handleMessage(data, socket) {
    // Check if data is already a Uint8Array
    if (typeof data === 'object' && !(data instanceof Uint8Array)) {
      // Attempt to convert to Uint8Array, assuming it might be JSON
      try {
        const jsonData = JSON.stringify(data);
        data = new TextEncoder().encode(jsonData);
      } catch (e) {
        console.error('Failed to convert message to Uint8Array:', e);
        return null;
      }
    }

    const message = this.decode(data);
    if (!message) {
      console.error('Invalid message format.');
      return null;
    }

    if (message.type === 'message') {
      console.log('Message received:', message.payload);
      return message.payload;
    } else if (message.type === 'notification') {
      return this.handleNotification(message, socket);
    } else {
      console.warn('Unknown message type:', message);
      return null;
    }
  }


  /**
   * Handles incoming notifications.
   * @param {object} notification - The received notification object.
   * @param {net.Socket} socket - The client's socket for potential response.
   * @returns {object | null} - The processed notification or null if missing payload.
   */
  handleNotification(notification, socket) {
    if (!notification.payload) {
      console.error('Notification payload missing.');
      return null;
    }

    console.log('Notification received:', notification.payload);

    if (notification.responseRequired) {
      const acknowledgment = {
        type: 'ack',
        message: 'Notification received successfully'
      };
      socket.write(this.encode(acknowledgment));
    }

    return notification.payload;
  }

  /**
   * Handles sending a message.
   * @param {net.Socket} socket - The target client's socket.
   * @param {string | object} message - The message to send.
   */
  sendMessage(socket, message) {
    const frame = this.encode({
      type: 'message',
      payload: message
    });
    socket.write(frame);
  }

  /**
   * Handles sending a notification.
   * @param {net.Socket} socket - The target client's socket.
   * @param {string | object} notification - The notification to send.
   */
  sendNotification(socket, notification) {
    const frame = this.encode({
        type: 'notification',
        payload: notification,
        responseRequired: true
      },
      0x2 // 0x2 for binary data if needed
    );
    socket.write(frame);
  }
}