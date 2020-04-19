//libraries
const express = require('express');
const app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http)

//static hosting with Express
app.use(express.static('public'));

//signalling handlers
io.on('connection', function(socket){
    console.log('a user connected');

    //when a client emits create or join
    socket.on('create or join',function(room){
        console.log('create or join to a room', room);

        //count number of user
        var myRoom = io.sockets.adapter.rooms[room] || {length: 0};
        var numClients = myRoom.length;
        console.log(room, 'has', numClients, 'clients');

        if (numClients == 0) {
            socket.join(room);
            socket.emit('created', room);
        } else if (numClients == 1) {
            socket.join(room);
            socket.emit('joined', room);
        } else {
            socket.emit('full', room);
        }
    });

    //relay only handlers
    socket.on('ready', function(room){
        socket.broadcast.to(room).emit('ready');
    });

    socket.on('candidate', function(event){
        socket.broadcast.to(event.room).emit('candidate', event);
    });

    socket.on('offer', function(event){
        socket.broadcast.to(event.room).emit('offer', event.sdp);
    });

    socket.on('answer',function(event){
        socket.broadcast.to(event.room).emit('answer', event.sdp);
    });
});

// listner
http.listen(3000, function(){
    console.log("listening on 3000")
});