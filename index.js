var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var util = require('util');
var Game = require('./lib/ponggame');
var PlayerList = require('./lib/playerlist');


var game;
var playerlist = new PlayerList();

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
  players = playerlist.allPlayers().map(function(player) { 
    // let's build a custom reply
    return {name:player.name, playing:player.playing}; 
  });
  log("Current players: "+po(players));
  io.sockets.emit('players', {
    players: players,
    numPlayers: players.length
  });
}

function broadcastMessage(fromPlayer,message) {
  io.sockets.emit('message', {
    player: fromPlayer.name,
    message: message
  });
}

function log(message) {
  var d = new Date();
  console.log(d.getHours()+":"+d.getMinutes()+":"+d.getSeconds()+" "+message);
}
function po(obj) {
  // print object nicely
  return util.inspect(obj, {showHidden: false, depth: 3}); // set depth to null and horrific things can happen
}

io.on('connection', function(socket){
  log("Incoming connection...");

  socket.on('add player', function (data) {
    var playername = data.playername;
    if(playerlist.addPlayerWithName(playername)) {
      socket.playername = playername; // tag the socket
      log("Player '"+playername+"' was added.");
    }
    else {
      socket.disconnect();
      log("Player '"+playername+"' already exists, disconnecting.");
      // disconnected since player name exists
    }

    var playersForGame = playerlist.playersForGame();
    //var clients = findClientsSocket();
    //var socket1 = clients[0];
    //var socket2 = clients[1];

    if(playersForGame && (!game || !game.started) ) {
      log("Game is starting! Players: '"+playersForGame.player1.name+"' vs '"+playersForGame.player2.name+"'.");
      game = new Game(io, playersForGame.player1, playersForGame.player2);
      game.rollBall();
      game.step();
    }
    else {
      log("Waiting for an opponent.");
      // not enough players, do nothing
    }
    broadcastPlayerList();
  });

  socket.on('disconnect', function(){
    if(socket.playername) {
      log("Player '"+socket.playername+"' disconnected.");
      player = playerlist.playerWithName(socket.playername);
      if(player && player.playing) {
        game.started = false;
        log("'"+player.name+"' has disconnected in the middle of a game! Aborting game.");
      }
      playerlist.deletePlayerWithName(socket.playername);
      broadcastPlayerList();
    }
    else {
      // do nothing, we don't care about
      // disconnecting users that haven't registered
    }
  });

  socket.on('message', function(data){
    if(socket.playername) {
      var player = playerlist.playerWithName(socket.playername);
      if(player) {
        log("Message from '"+socket.playername+"': "+data.message);
        broadcastMessage(player,data.message);
      }
      else {
      
      log("'"+socket.playername+"' tried to send a message with content: '"+data.message+"', but is not in the playerlist. Not broadcasting.");
      }
    }
    else {
      log("An unregistered user tried to send a message with content: '"+data.message+"'. Not broadcasting.");
      // do nothing, unregistered users
      // don't have a voice
    }
  });

  socket.on('move', function(data){
    if(socket.playername) {
      player = playerlist.playerWithName(socket.playername);
      if(player && player.playing) {
        player.paddle.move(data.paddle.x, data.paddle.y);
      }
      else {
        log("Player '"+player.name+"' who is a spectator tried to move the paddle. That's not ok.");
      }
    }
    else {
      log("An unregistered user tried to move paddle, that's not allowed.")
    }
  });


});

// HTTP server:
//
app.use(express.static(__dirname + '/public'));
var port = (process.env.PORT || 3000)
http.listen(port, function(){
  log('Starting server on *:'+port);
});
