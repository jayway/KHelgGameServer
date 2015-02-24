var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// Pong game:
//

var game;
var playerlist;
var gameStarted = false;

function Paddle(x, y, width, height) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
  this.x_speed = 0;
  this.y_speed = 0;
}


Paddle.prototype.move = function(x, y) {
  this.x += x;
  this.y += y;
  this.x_speed = x;
  this.y_speed = y;
  if(this.x < 0) { // all the way to the left
    this.x = 0;
    this.x_speed = 0;
  } else if (this.x + this.width > 400) { // all the way to the right
    this.x = 400 - this.width;
    this.x_speed = 0;
  }
}

function Player(socket,name, x,y,w,h) {
  this.name = name;
  this.paddle = new Paddle(x, y, w, h);
  this.socket = socket;
}

Player.prototype.toString = function playerToString() {
  if(this.name === undefined) {
    return "Unregistered player"; 
  }
  else {
    return 'Player known as ' + this.name +". Pos=("+this.paddle.x+","+this.paddle.y+")";
  }
}


function Ball(x, y) {
  this.x = x;
  this.y = y;
  this.x_speed = 0;
  this.y_speed = 3;
  this.radius = 5;
}

Ball.prototype.update = function(paddle1, paddle2) {
  // Game logic...

  this.x += this.x_speed;
  this.y += this.y_speed;
  var top_x = this.x - 5;
  var top_y = this.y - 5;
  var bottom_x = this.x + 5;
  var bottom_y = this.y + 5;

  if(this.x - 5 < 0) { // hitting the left wall
    this.x = 5;
    this.x_speed = -this.x_speed;
  } else if(this.x + 5 > 400) { // hitting the right wall
    this.x = 395;
    this.x_speed = -this.x_speed;
  }

  if(this.y < 0 || this.y > 600) { // a point was scored
    this.x_speed = 0;
    this.y_speed = 3;
    this.x = 200;
    this.y = 300;
  }

  if(top_y > 300) {
    if(top_y < (paddle1.y + paddle1.height) && bottom_y > paddle1.y && top_x < (paddle1.x + paddle1.width) && bottom_x > paddle1.x) {
      // hit player1's paddle
      this.y_speed = -3;
      this.x_speed += (paddle1.x_speed / 2);
      this.y += this.y_speed;
    }
  } else {
    if(top_y < (paddle2.y + paddle2.height) && bottom_y > paddle2.y && top_x < (paddle2.x + paddle2.width) && bottom_x > paddle2.x) {
      // the player2's paddle
      this.y_speed = 3;
      this.x_speed += (paddle2.x_speed / 2);
      this.y += this.y_speed;
    }
  }
};



var Game = function(io, socket1, socket2) {

  this.started = true;

  this.player1 = new Player(socket1, socket1.playername, 175, 580, 50, 10);
  this.player2 = new Player(socket2, socket2.playername, 175, 10, 50, 10);

  // Ball
  this.ball = new Ball(200, 300);
  this.io = io;
}

Game.prototype.update = function() {
  this.ball.update(this.player1.paddle, this.player2.paddle);
};

Game.prototype.broadcast = function() {
  // broadcast game state
  var gameState = {
    ball:
      {
      x:this.ball.x, 
      y:this.ball.y, 
      x_speed:this.ball.x_speed, 
      y_speed:this.ball.y_speed
    },
    playerPaddle: {
      x:this.player1.paddle.x, 
      y:this.player1.paddle.y
    },
    remotePlayerPaddle: {
      x:this.player2.paddle.x, 
      y:this.player2.paddle.y
    }
  }
  io.emit('step', gameState);
};

Game.prototype.animate = function(callback) { 
  setTimeout(callback.bind(this), 1000/30)  // delay
}

Game.prototype.step = function() {
  // a disconnect can stop the game at any time
  if(gameStarted) {
    this.update();
  }
  if(gameStarted) {
    this.broadcast();
  }
  if(gameStarted) {
    this.animate(this.step);
  }
};



var PlayerList = function() {

  this.players = [];
}

PlayerList.prototype.addPlayer = function(player) { 
  // why isn't this.players.some() working?
  var playerExists = false;
  this.players.forEach(function(p){
    if (p.name === player.name) { playerExists = true;}
  });

  if(!playerExists) {
    this.players.push(player); 
    return true;
  }
  else {
    return false;
  }
}

PlayerList.prototype.deletePlayerWithName = function(name) { 
  this.players = this.players.filter(function(player){ 
    return player.name != name;
  });
}

PlayerList.prototype.allPlayers = function() { 
  return this.players;
}

PlayerList.prototype.playersForGame = function() { 
  if(this.players.length>=2) {
    // remove and return the first two players 
    var p1 = this.players.shift();
    var p2 = this.players.shift();
    return {player1:p1, player2:p2};
  }
  else {
    return false; // or something
  }
}

// GET routes:
//
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/client.js', function(req, res){
  res.sendFile(__dirname + '/client.js');
});
app.get('/socket.io.js', function(req, res){
  res.sendFile(__dirname + '/socket.io-1.2.0.js');
});
app.get('/jquery.js', function(req, res){
  res.sendFile(__dirname + '/jquery.min.js');
});

// WebSocket connections:
//

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

  socket.on('disconnect', function(){
  });

  socket.on('message', function(msg){
  });

  socket.on('move', function(data){
    player.paddle.move(data.paddle.x, data.paddle.y);
  });

  socket.on('add player', function (playername) {
      console.log("GAME IS STARTING!11");
      game = new Game(io,players[namelist[0]],players[namelist[1]]);
      gameStarted = true;
      game.step();
  });

});

// HTTP server:
//
http.listen(3000, function(){
  console.log('listening on *:3000');
});

// Exports
module.exports.Game = Game;
module.exports.PlayerList = PlayerList;
module.exports.Player= Player;
