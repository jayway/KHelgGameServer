var Player = require('./player');

function Ball(game) {
  this.game = game;
  this.radius = 5;
}

Ball.prototype.resetPosition = function() {
    var randomX = Math.floor(Math.random() * (2 - 0 + 1) + 0);
    randomX *= Math.floor(Math.random()*2) == 1 ? 1 : -1
    var randomY = Math.floor(Math.random() * (6 - 2 + 1) + 2);
    randomY *= Math.floor(Math.random()*2) == 1 ? 1 : -1
    this.x_speed = randomX;
    this.y_speed = randomY;
    // Always start in the center
    this.x = this.game.gameplanWidth/2;
    this.y = this.game.gameplanHeight/2;
}

Ball.prototype.update = function(paddle1, paddle2) {

  var game = this.game;
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



function Game(io, socket1, socket2) {

  this.started = true;

  this.player1 = new Player(socket1, socket1.playername, 175, 580, 50, 10, this);
  this.player2 = new Player(socket2, socket2.playername, 175, 10, 50, 10, this);

  this.gameplanHeight = 600;
  this.gameplanWidth = 400; // TODO: Not actually used yet!

  // By letting Game keep score, a new player could potentially connect and 
  // "take over" an ongoing game
  this.player1Points = 0;
  this.player2Points = 0;
  this.winningPoints = 5; // when a player reaches 5 points the game is over

  // Ball
  this.ball = new Ball(this);
  this.io = io;
}


Game.prototype.rollBall = function() {
  this.ball.resetPosition();
};

Game.prototype.update = function() {
  this.ball.update(this.player1.paddle, this.player2.paddle, this);
};

Game.prototype.resetGame = function() {
  this.player1Points = 0;
  this.player2Points = 0;
};

Game.prototype.checkWinning = function() {
  var winning = false;
  if(this.player1Points>=this.winningPoints) {
    this.io.emit("winning", {winner:this.player1.name, player1Points:this.player1Points, player2Points:this.player2Points});
    console.log("Player 1 ("+this.player1.name+") has won!");
    this.started = false;
    winning = true;
  }
  if(this.player2Points>=this.winningPoints) {
    this.io.emit("winning", {winner:this.player2.name, player1Points:this.player1Points, player2Points:this.player2Points});
    console.log("Player 2 ("+this.player2.name+") has won!");
    this.started = false;
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
  this.io.emit('step', gameState);
};

Game.prototype.animate = function(callback) { 
  setTimeout(callback.bind(this), 1000/30)  // delay
}

Game.prototype.step = function() {
  // a disconnect can stop the game at any time
  if(this.started) {
    this.update();
  }
  if(this.started) {
    this.broadcast();
  }
  if(this.started) {
    this.animate(this.step);
  }
};


module.exports = Game;