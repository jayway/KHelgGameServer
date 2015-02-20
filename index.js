var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var util = require('util');

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
  } else if (this.x + this.width > game.gameplanWidth) { // all the way to the right
    this.x = game.gameplanWidth - this.width;
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


function Ball() {
  this.radius = 15;
}

Ball.prototype.resetPosition = function() {
    var randomX = Math.floor(Math.random() * (2 - 0 + 1) + 0);
    randomX *= Math.floor(Math.random()*2) == 1 ? 1 : -1
    var randomY = Math.floor(Math.random() * (6 - 2 + 1) + 2);
    randomY *= Math.floor(Math.random()*2) == 1 ? 1 : -1
    this.x_speed = randomX;
    this.y_speed = randomY;
    // Always start in the center
    this.x = game.gameplanWidth/2;
    this.y = game.gameplanHeight/2;
}

Ball.prototype.update = function(paddle1, paddle2) {
  // Game logic...

  this.x += this.x_speed;
  this.y += this.y_speed;
  var top_x = this.x - this.radius;
  var top_y = this.y - this.radius;
  var bottom_x = this.x + this.radius;
  var bottom_y = this.y + this.radius;

  if(this.x - this.radius < 0) { // hitting the left wall
    this.x = this.radius;
    this.x_speed = -this.x_speed;
  } else if(this.x + this.radius > game.gameplanWidth) { // hitting the right wall
    this.x = game.gameplanWidth - this.radius;
    this.x_speed = -this.x_speed;
  }

  if(this.y < 0) {
    // player 2 dropped the ball
    ++game.player1Points;
    this.resetPosition();
    game.checkWinning();
    console.log("Score for player1! "+game.player1Points+"-"+game.player2Points);
  }

  if(this.y > game.gameplanHeight) { // a point was scored
    // player 1 dropped the ball
    ++game.player2Points;
    this.resetPosition();
    game.checkWinning();
    console.log("Score for player2! "+game.player1Points+"-"+game.player2Points);
  }

  if(top_y > game.gameplanHeight/2) {
    if(top_y < (paddle1.y + paddle1.height) && bottom_y > paddle1.y && top_x < (paddle1.x + paddle1.width) && bottom_x > paddle1.x) {
      // hit player1's paddle
      this.y_speed = -(this.y_speed);
      this.x_speed += (paddle1.x_speed / 2);
      this.y += this.y_speed;
    }
  } else {
    if(top_y < (paddle2.y + paddle2.height) && bottom_y > paddle2.y && top_x < (paddle2.x + paddle2.width) && bottom_x > paddle2.x) {
      // hit player2's paddle
      this.y_speed = -(this.y_speed);
      this.x_speed += (paddle2.x_speed / 2);
      this.y += this.y_speed;
    }
  }
};


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


var Game = function(io, socket1, socket2) {

  this.started = true;

  this.player1 = new Player(socket1, socket1.playername, 175, 580, 50, 10);
  this.player2 = new Player(socket2, socket2.playername, 175, 10, 50, 10);

  this.gameplanHeight = 600;
  this.gameplanWidth = 400; // TODO: Not actually used yet!

  // By letting Game keep score, a new player could potentially connect and 
  // "take over" an ongoing game
  this.player1Points = 0;
  this.player2Points = 0;
  this.winningPoints = 5; // when a player reaches 5 points the game is over

  // Ball
  this.ball = new Ball();
  this.io = io;
}


Game.prototype.rollBall = function() {
  this.ball.resetPosition();
};

Game.prototype.update = function() {
  this.ball.update(this.player1.paddle, this.player2.paddle);
};

Game.prototype.resetGame = function() {
  this.player1Points = 0;
  this.player2Points = 0;
};

Game.prototype.checkWinning = function() {
  var winning = false;
  if(this.player1Points>=this.winningPoints) {
    io.emit("winning", {winner:this.player1.name, player1Points:this.player1Points, player2Points:this.player2Points});
    console.log("Player 1 ("+this.player1.name+") has won!");
    gameStarted = false;
    winning = true;
  }
  if(this.player2Points>=this.winningPoints) {
    io.emit("winning", {winner:this.player2.name, player1Points:this.player1Points, player2Points:this.player2Points});
    console.log("Player 2 ("+this.player2.name+") has won!");
    gameStarted = false;
  winning = true;
  }
  if(winning) {
    // force players to re-register before starting a new game
    players = {};
    numPlayers=0;
    // force everyone to reconnect after the game too, just to be sure.
  }
  
};

Game.prototype.broadcast = function() {
  // broadcast game state
  var gameState = {
    ball:
      {
      x:this.ball.x, 
      y:this.ball.y, 
      x_speed:this.ball.x_speed, 
      y_speed:this.ball.y_speed,
      radius:this.ball.radius
    },
    playerPaddle: {
      x:this.player1.paddle.x, 
      y:this.player1.paddle.y,
      width:this.player1.paddle.width,
      height:this.player1.paddle.height
    },
    remotePlayerPaddle: {
      x:this.player2.paddle.x, 
      y:this.player2.paddle.y,
      width:this.player2.paddle.width,
      height:this.player2.paddle.height
    },
    score: {
      player1: this.player1Points,
      player2: this.player2Points
    },
    bounds: {
      width:  this.gameplanWidth,
      height: this.gameplanHeight
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



// Static GET routes:
//
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/styles.css', function(req, res){
  res.sendFile(__dirname + '/styles.css');
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

app.get('/match_history.json', function(req, res){
  res.sendFile(__dirname + '/match_history.json');
});
app.get('/jay.png', function(req, res){
  res.sendFile(__dirname + '/jay.png');
});
//
// WebSocket connections:
//
io.on('connection', function(socket){
  var addedPlayer = false;
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
    console.log("Move for player"+socket.playername+", move x="+data.paddle.x+". Players list:"+util.inspect(players, {showHidden: false, depth: null}));
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
http.listen(3000, function(){
  console.log('listening on *:3000');
});

