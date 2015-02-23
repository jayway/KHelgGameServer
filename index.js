var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var util = require('util');
var Game = require('./lib/ponggame');

// Pong game:
//

var players = {};
var numPlayers = 0;


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
// Static GET routes:
//

app.use(express.static(__dirname + '/public'));

//
// WebSocket connections:
//
io.on('connection', function(socket){
  var addedPlayer = false;
  var game = null;
  var gameStarted = false;

  console.log("Incoming connection...");

  socket.on('disconnect', function(){
    console.log(socket.playername+' disconnected');
    if (addedPlayer) {
      if(players["player1"]===socket.playername) {
        delete players["player1"];
        if(players["player2"]) {
          // player 2 becomes player 1
          players["player1"] = players["player2"]
        delete players["player2"];

        }
      }
      else {
        delete players["player2"];
      }
      --numPlayers;
      if(gameStarted) {
      gameStarted = false; //will cause game loop to stop
      console.log("Game stopped due to disconnect.");
      }
    }
      console.log("Detected disconnect. Remaining players: "+util.inspect(players, {showHidden: false, depth: null}));
    io.emit('players', {
      players: players,
      numPlayers: numPlayers
    });
  });

  socket.on('message', function(data){
    msg = data.message
    console.log("message: '" + msg+"' from "+socket.playername+". Broadcasting back.");
    io.emit('message', {player:socket.playername, message:msg});
  });

  socket.on('move', function(data){
    //console.log("Move for player"+socket.playername+", move x="+data.paddle.x+". Players list:"+util.inspect(players, {showHidden: false, depth: null}));
    if(gameStarted) {
      player = game.player2;
      if(players["player1"]==socket.playername) {
        player = game.player1;
      }  
      player.paddle.move(data.paddle.x, data.paddle.y);
    }
    else {
      // do nothing
    }


  });

  socket.on('add player', function (data) {
    console.log("User registration from '"+data.playername+"'");
    if(players["player1"] === data.playername || players["player2"] === data.playername) {
      console.log("Player already exists! Please add using another name.");
      socket.emit("disconnected", {reason:"nametaken", readable_reason:"Player name taken."})
      socket.disconnect();
    }
    else {
      if (gameStarted) {
        // Game is ongoing

        socket.emit("disconnected", {reason:"gamestarted", readable_reason:"A game is ongoing, please try again later."})
        socket.disconnect();

      }
      else {
        socket.playername = data.playername;
        if (numPlayers==0) {
          players["player1"] = data.playername;
        }
        else {
          players["player2"] = data.playername;
        }
        ++numPlayers;
        console.log(numPlayers+" connected player(s): "+util.inspect(players, {showHidden: false, depth: null}));
        addedPlayer = true;
        io.emit('players', {
          players: players,
          numPlayers: numPlayers
        });
        if(numPlayers==2 && ! gameStarted) {  
          var clients = findClientsSocket();
          var socket1 = clients[0];
          var socket2 = clients[1];
          console.log("Starting game with players: "+util.inspect(players, {showHidden: false, depth: null}));
          if(socket1.playername===players["player1"]) {
            // socket1 is actually player1
            console.log("socket1 is player1");
            game = new Game(io,socket1,socket2);
          }
          else {
            // socket2 is actually player1
            console.log("socket2 is player1");
            game = new Game(io,socket2,socket1);
          }
          console.log("Starting new game!");
          gameStarted = true;
          game.rollBall();
          game.step();
        }
      }
    }

  });

});

// HTTP server:
//
var port = (process.env.PORT || 3000)
http.listen(port, function(){
  console.log('listening on *:3000');
});

