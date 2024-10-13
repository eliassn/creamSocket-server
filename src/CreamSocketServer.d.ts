import { Socket } from 'net';
import { EventEmitter } from 'events';

/**
 * Options for initializing the CreamSocketServer.
 */
export interface CreamSocketServerOptions {
  /**
   * Port number on which the server listens.
   */
  port: number;

  /**
   * Host address on which the server listens. Defaults to 'localhost'.
   */
  host?: string;
}

/**
 * Represents a WebSocket server.
 * Extends Node.js's EventEmitter to handle events.
 */
export declare class CreamSocketServer extends EventEmitter {
  /**
   * Creates an instance of CreamSocketServer.
   *
   * @param {CreamSocketServerOptions} options - Server configuration options.
   */
  constructor(options: CreamSocketServerOptions);

  /**
   * Starts the WebSocket server, making it listen for incoming connections.
   *
   * @returns {void}
   */
  start(): void;

  /**
   * Stops the WebSocket server, closing all active connections.
   *
   * @returns {void}
   */
  stop(): void;

  /**
   * Sends a text message to a specific client.
   *
   * @param {Socket} socket - The target client's socket.
   * @param {string} message - The message to send.
   * @returns {void}
   */
  sendMessage(socket: Socket, message: string): void;
   /**
   * Sends a notification to a specific client.
   *
   * @param {Socket} socket - The target client's socket.
   * @param {string} notification - The notification to send.
   * @returns {void}
   */
  sendNotification(socket: Socket, notification: string): void;
  /**
   * Broadcasts a message to all connected clients.
   *
   * @param {string} message - The message to broadcast.
   * @returns {void}
   */
  broadcast(message: string): void;

  /**
   * Emits a 'listening' event when the server starts listening.
   *
   * @event CreamSocketServer#listening
   */
  on(event: 'listening', listener: () => void): this;
  /**
   * Emits a 'connection' event when a new client connects.
   *
   * @event CreamSocketServer#connection
   * @param {Socket} socket - The connected client's socket.
   */
  on(event: 'connection', listener: (socket: Socket) => void): this;
  /**
   * Emits a 'message' event when a message is received from a client.
   *
   * @event CreamSocketServer#message
   * @param {Socket} socket - The client's socket.
   * @param {string} message - The received message.
   */
  on(event: 'message', listener: (socket: Socket, message: string) => void): this;
  /**
   * Emits a 'notification' event when a notification is received from a client.
   *
   * @event CreamSocketServer#notification
   * @param {Socket} socket - The client's socket.
   * @param {string} notification - The received notification.
   */
  on(event: 'notification', listener: (socket: Socket, notification: string) => void): this;
  /**
   * Emits a 'disconnection' event when a client disconnects.
   *
   * @event CreamSocketServer#disconnection
   * @param {Socket} socket - The disconnected client's socket.
   */
  on(event: 'disconnection', listener: (socket: Socket) => void): this;
  /**
   * Emits a 'close' event when the server is closed.
   *
   * @event CreamSocketServer#close
   */
  on(event: 'close', listener: () => void): this;
  /**
   * Overrides the EventEmitter's emit method for type safety.
   */
    /**
   * Removes a listener for the specified event.
   *
   * @param {string} event - The event name.
   * @param {Function} listener - The listener function to remove.
   * @returns {this}
   */
  off(event: 'listening', listener: () => void): this;
  off(event: 'connection', listener: (socket: Socket) => void): this;
  off(event: 'message', listener: (socket: Socket, message: string) => void): this;
  off(event: 'notification', listener: (socket: Socket, notification: string) => void): this;
  off(event: 'disconnection', listener: (socket: Socket) => void): this;
  off(event: 'close', listener: () => void): this;
  off(event: string, listener: Function): this;
  /**
   * Overrides the EventEmitter's emit method for type safety.
   */
  emit(event: 'listening'): boolean;
  emit(event: 'connection', socket: Socket): boolean;
  emit(event: 'message', socket: Socket, message: string): boolean;
  emit(event: 'notification', socket: Socket, notification: string): boolean;
  emit(event: 'disconnection', socket: Socket): boolean;
  emit(event: 'close'): boolean;
}
