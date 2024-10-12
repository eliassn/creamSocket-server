# creamSocketServer

example ws server with CreamSocketServer

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
    server.sendMessage(socket, `Server echo: ${msg}`);
  });
});
server.start();
```