const express = require("express");
const server = require('http').createServer();
const io = require('socket.io')(server,{
    cors: {origin : '*'}
});


const app = express();

server.listen('3000', ()=> {
    console.log("app running on port 3000");
});
var queue = [];    // list of sockets waiting for peers
var rooms = {};    // map socket.id => room
var names = {};    // map socket.id => name
var allUsers = {}; // map socket.id => socket


var findPeerForLoneSocket = function(socket) {
    // this is place for possibly some extensive logic
    // which can involve preventing two people pairing multiple times
    if (queue.length > 0 ) {
        // somebody is in queue, pair them!
        var peer = queue.pop();
        console.log(peer.id + 'was popped from queue')
        var room = socket.id + '#' + peer.id;
        console.log(queue);
        // join them both
        peer.join(room);
        socket.join(room);
        console.log(socket.id + ' and ' +peer.id + ' joined room ' + room);
        // register rooms to their names
        rooms[peer.id] = room;
        rooms[socket.id] = room;
        // exchange names between the two of them and start the chat
        peer.emit('chat start', {'name': names[socket.id], 'room':room});
        socket.emit('chat start', {'name': names[peer.id], 'room':room});
    } else {
        // queue is empty, add our lone socket
        queue.push(socket);
        console.log(socket.id + ' was pushed to queue');
        socket.emit('searching');
    }
}
const generateMessage = (text,username) => {
    return {
        text,
        username,
        createdAt : new Date().getTime()
    }
 }

io.on('connection', function (socket) {
    console.log('User '+socket.id + ' connected');
    socket.on('login', function (data) {
        names[socket.id] = data.username;
        allUsers[socket.id] = socket;
        console.log(socket)
        // now check if sb is in queue
        findPeerForLoneSocket(socket);
    });
    socket.on('message', (data) => {
        console.log("message trigeered");
        console.log(data.text);
        var room = rooms[socket.id];
      //  socket.broadcast.to(room).emit('message', generateMessage(data.text));
        io.to(room).emit('message', generateMessage(data.text, data.username));
    });
    socket.on('leave room', function () {
        console.log("leave room triggered");
        var room = rooms[socket.id];
        socket.broadcast.to(room).emit('chat end', 'has left the chatroom!!!');
        // var peerID = room.split('#');
        // peerID = peerID[0] === socket.id ? peerID[1] : peerID[0];
        // //add both current and peer to the queue
        // findPeerForLoneSocket(allUsers[peerID]);
        // findPeerForLoneSocket(socket);
    });
    socket.on('disconnect', function () {
        var room = rooms[socket.id];
        socket.broadcast.to(room).emit('chat end','has disconnected');
    //     queue.splice(socket.id,1);
    //     var peerID = room.split('#');
    //     peerID = peerID[0] === socket.id ? peerID[1] : peerID[0];
    //     console.log(allUsers[peerID]);
    //     // current socket left, add the other one to the queue
    //     findPeerForLoneSocket(allUsers[peerID]);
    });
    
});