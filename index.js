var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var players = {};
var numPlayers = 0;

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
    });

io.on('connection', function(socket){
  var addedPlayer = false;
  var player = socket.player;
  //io.emit('message', player+" connected");
  console.log(player+' connected');

  socket.on('disconnect', function(){
    io.emit('message', socket.player+" disconnected");
    console.log(socket.player+' disconnected');
    if (addedPlayer) {
      delete players[socket.player];
      --numPlayers;
    }
  });

  socket.on('message', function(msg){
    console.log("message: '" + msg+"' from "+socket.player+". Broadcasting back.");
    io.emit('message', socket.player+"> "+msg);
  });

  socket.on('add player', function (player) {
    console.log("Say hello to "+player);
    socket.player = player;
    // add the client's username to the global list
    players[player] = player;
    ++numPlayers;
    addedPlayer = true;
    socket.emit('login', {
      numPlayers: numPlayers
    });
    socket.broadcast.emit('user joined', {
      player: socket.player,
      numPlayers: numPlayers
    });
  });

});

http.listen(3000, function(){
    console.log('listening on *:3000');
    });

