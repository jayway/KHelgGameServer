var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var util = require('util');
var Game = require('./lib/ponggame');
var PlayerList = require('./lib/playerlist');


var game;
var playerlist new PlayerList();
var gameStarted = false;

// Workaround to get connected sockets
// See: http://stackoverflow.com/a/24145381/22012
function findClientsSocket(roomId, namespace) {
  var res = []
    , ns = io.of(namespace ||"/");    // the default namespace is "/"

  if (ns) {
    for (var id in ns.connected) {
      if(roomId) {
        var index = ns.connected[id].rooms.indexOf(roomId) ;
        if(index !== -1) {
          res.push(ns.connected[id]);
        }
      } else {
        res.push(ns.connected[id]);
      }
    }
  }
  return res;
}



//
// WebSocket connections:

/*
 * Strategy for connections:
 *
 * Keep track of all open sockets.
 * When a user registers (with 'add player')
 * then add to players list, and tag the socket
 * with the playername
 * 
 * Check if players list contain two players
 * If so, remove these from players list and
 * start a new game with them if there isn't an
 * ongoing game.
 *
 * When game is over the players that just played
 * will have to re-register in order to join the game
 * queue. The next two people in line will start playing.
 * 
 * When a player disconnects remove the player from player
 * list if the player name exists there.
 * If an undefined player disconnects (a user that hasn't registered)
 * nothing happens.
 * If the disconnecting player is currently playing a game,
 * the game stops.
 *
 * If a move command arrives, check that the sender 
 * is actually playing a game. If so, move, otherwise do nothing.
 *
 * Messages are broadcasted out to everyone if the sender
 * is registered.
*/

function broadcastPlayerList() {
  io.sockets.emit('players', {
    players: playerlist.players,
    numPlayers: numPlayers
  });
}

function broadcastMessage(fromPlayer,message) {
  io.sockets.emit('players', {
    player: fromPlayer.name,
    message: message
  });
}

io.on('connection', function(socket){
  console.log("Incoming connection...");

  socket.on('add player', function (data) {

    playername = data.playername;
    if(playerlist.addPlayer(playername))


    //var clients = findClientsSocket();
    //var socket1 = clients[0];
    //var socket2 = clients[1];
    game = new Game(io);
    console.log("Starting new game!");
    gameStarted = true;
    game.rollBall();
    game.step();
  });

  socket.on('disconnect', function(){
  });

  socket.on('message', function(msg){
  });

  socket.on('move', function(data){
    player.paddle.move(data.paddle.x, data.paddle.y);
  });


});

// HTTP server:
//
app.use(express.static(__dirname + '/public'));
var port = (process.env.PORT || 3000)
http.listen(port, function(){
  console.log('Starting server on *:'+port);
});
