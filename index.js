var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// Pong game:
//

var game;
var players = {};
var numPlayers = 0;
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
io.on('connection', function(socket){
  var addedPlayer = false;
  console.log("Incoming connection...");

  socket.on('disconnect', function(){
    console.log(socket.playername+' disconnected');
    if (addedPlayer) {
      delete players[socket.playername];
      --numPlayers;
      gameStarted = false; //will cause game loop to stop
    }
    io.sockets.emit('players', {
      players: players,
      numPlayers: numPlayers
    });
  });

  socket.on('message', function(msg){
    console.log("message: '" + msg+"' from "+socket.playername+". Broadcasting back.");
    io.emit('message', socket.playername+"> "+msg);
  });

  socket.on('move', function(data){
    player = game.player2;
    if(socket.playername === game.player1.name) {
      player = game.player1;
    }
    player.paddle.move(data.paddle.x, data.paddle.y);


  });

  socket.on('add player', function (playername) {
    console.log("Say hello to "+playername);

    socket.playername = playername;
    // add the client's username to the global list
    players[playername] = socket;
    ++numPlayers;
    console.log(numPlayers+" connected player(s)");
    namelist = Object.keys(players);
    addedPlayer = true;
    io.sockets.emit('players', {
      players: namelist,
      numPlayers: numPlayers
    });
    if(numPlayers==2 && ! gameStarted) { // right now one player game
      console.log("GAME IS STARTING!11");
      game = new Game(io,players[namelist[0]],players[namelist[1]]);
      gameStarted = true;
      game.step();
    }
  });

});

// HTTP server:
//
http.listen(3000, function(){
  console.log('listening on *:3000');
});

