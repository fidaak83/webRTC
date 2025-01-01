import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
// Initialize Express app
const app = express();
// Serve static files from the "public" directory
app.use(express.static('public'));

// Polyfill for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Create HTTP server from the Express app
const server = http.createServer(app);

// Initialize Socket.IO server with CORS support
const io = new Server(server, {
    cors: {
        origin: "*",  // You can modify this to restrict which origins can connect
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Set to keep track of connected users
let connectedUsers = [];

// WebSocket signaling events
io.on('connection', (socket) => {
    // Add user to the connected users list
    connectedUsers[socket.id] = socket.id;
    // Send the list of connected users to the new user
    socket.emit('users', Object.values(connectedUsers));
    console.log('new', socket.id)

    // Listen for offer from client
    socket.on('offer', (data) => {
        socket.to(data.target).emit('offer', { sdp: data.sdp, sender: socket.id });
    });

    // Listen for answer from client
    socket.on('answer', (data) => {
        socket.to(data.target).emit('answer', { sdp: data.sdp, sender: socket.id });
    });

    // Listen for candidate from client
    socket.on('candidate', (data) => {
        socket.to(data.target).emit('candidate', { candidate: data.candidate, sender: socket.id });
    });

    socket.on('endCall', ({ target }) => {
        socket.to(target).emit('callEnded');
      });

    // Listen for disconnect
    socket.on('disconnect', () => {
        // console.log(`User disconnected: ${socket.id}`);
        delete connectedUsers[socket.id];
        socket.emit('user:disconnect', Object.values(connectedUsers));
    });
});

// Set up a simple route to serve your EJS file
app.set('view engine', 'ejs');
app.set('views', './views');

// Serve the EJS file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'room.html'));
    // res.render('room');
});

// Use environment variable for port, or fallback to 3000 if not set
const PORT = process.env.PORT || 3000;

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on PORT: ${PORT}`);
});
