import { Socket,Server } from 'net';
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

  format?: 'json' | 'binary';
}

/**
 * Represents a WebSocket server.
 * Extends Node.js's EventEmitter to handle events.
 */
export declare class CreamSocketServer extends EventEmitter {
  server: Server;
  clients: Set<Socket>;
  parser: CreamSocketParser;
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
   * Sends a message to a specific client.
   * @param socket - The target client socket.
   * @param message - The message to send. Can be a string or an object.
   */
   sendMessage(socket: Socket, message: string | object): void;

   /**
    * Sends a notification to a specific client.
    * @param socket - The target client socket.
    * @param notification - The notification to send. Can be a string or an object.
    */
   sendNotification(socket: Socket, notification: string | object): void;
 
   /**
    * Broadcasts a message to all connected clients.
    * @param message - The message to broadcast. Can be a string or an object.
    */
   broadcast(message: string | object): void;
 
   /**
    * Broadcasts a notification to all connected clients.
    * @param notification - The notification to broadcast. Can be a string or an object.
    */
   broadcastNotification(notification: string | object): void;
 

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
   /**
   * Event listener for 'connection' events.
   * @param socket - The connected client socket.
   */
   on(event: 'connection', listener: (socket: Socket) => void): this;

   /**
    * Event listener for 'message' events.
    * @param socket - The client socket.
    * @param data - The received message data.
    */
   on(event: 'message', listener: (socket: Socket, data: any) => void): this;
 
   /**
    * Event listener for 'notification' events.
    * @param socket - The client socket.
    * @param data - The received notification data.
    */
   on(event: 'notification', listener: (socket: Socket, data: any) => void): this;
 
   /**
    * Event listener for 'close' events.
    */
   on(event: 'close', listener: () => void): this;
 
   /**
    * Event listener for 'disconnection' events.
    * @param socket - The disconnected client socket.
    */
   on(event: 'disconnection', listener: (socket: Socket) => void): this;
 
   /**
    * Sends a Pong frame in response to a Ping.
    * @param socket - The target client socket.
    * @param payload - The payload from the Ping.
    */
   _sendPong(socket: Socket, payload: string): void;
 
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
  off(event: 'message', listener: (socket: Socket, message: string|object) => void): this;
  off(event: 'notification', listener: (socket: Socket, notification: string|object) => void): this;
  off(event: 'disconnection', listener: (socket: Socket) => void): this;
  off(event: 'close', listener: () => void): this;
  off(event: string, listener: Function): this;
  /**
   * Overrides the EventEmitter's emit method for type safety.
   */
  emit(event: 'listening'): boolean;
  emit(event: 'connection', socket: Socket): boolean;
  emit(event: 'message', socket: Socket, message: string|object): boolean;
  emit(event: 'notification', socket: Socket, notification: string|object): boolean;
  emit(event: 'disconnection', socket: Socket): boolean;
  emit(event: 'close'): boolean;
}
