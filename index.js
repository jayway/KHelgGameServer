var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
    });

io.on('connection', function(socket){
    var player = "unknown player";
    io.emit('connect message', player+" connected");
    console.log(player+' connected');
    socket.on('disconnect', function(){
      io.emit('disconnect message', player+" disconnected");
      console.log(player+' disconnected');
      });
    io.on('connection', function(socket){
      socket.on('chat message', function(msg){
        console.log("message: '" + msg+"' from "+player);
        io.emit('chat message', player+"> "+msg);
        });
      });
    });

http.listen(3000, function(){
    console.log('listening on *:3000');
    });

