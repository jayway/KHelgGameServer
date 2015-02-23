var Paddle = require('./paddle');

function Player(socket,name, x,y,w,h, game) {
  this.name = name;
  this.paddle = new Paddle(x, y, w, h, game);
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

module.exports = Player