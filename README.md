# creamSocketServer
- Click [Documentation](https://github.com/eliassn/creamSocket-server/wiki/CreamSocketServer)
- If you like consider sponsoring this project [:heart: Sponsor](https://github.com/sponsors/eliassn)
## CreamSocketServer has a parser so you can parse json binary etc ...
## if you are encountering typescript errors try adding the following line to your tsconfig.json file 
```json
"moduleResolution": "NodeNext"
```
- Example
```typescript
import { CreamSocketServer } from 'creamsocket-server';

// Server Setup
const server = new CreamSocketServer({ port: 8080, host: 'localhost' });

server.on('listening', () => {
  console.log('Server is listening on localhost:8080');
});

server.on('connection', (socket) => {
  console.log('New client connected.');

  socket.on('message', (msg: string) => {
    console.log('Received message from client:', msg);
    server.sendMessage(socket, { text: 'Hello, Client!' });
  });
  socket.on('notification', (notification: string | object) => {
    console.log('Received notification from client:', notification||notification.message);
    // Optionally, broadcast the notification to all clients
    server.broadcastNotification(`Broadcast: ${notification}`);
  });
});
server.start();
```
