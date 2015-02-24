var Paddle = require('./paddle');

function Player(name) {
  this.name = name;
}


Player.prototype.addToGame = function(game,x,y,w,h) {
  this.paddle = new Paddle(x, y, w, h, game);
  }

Player.prototype.toString = function playerToString() {
  if(this.name === undefined) {
    return "Unregistered player"; 
  }
  else {
    return 'Player known as ' + this.name +". Pos=("+this.paddle.x+","+this.paddle.y+")";
  }
}

module.exports = Player
