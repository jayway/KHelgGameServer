var Paddle = require('./paddle');

function Player(name, socket) {
  this.name = name;
  this.socket = socket;
}


Player.prototype.addToGame = function(game,x,y,w,h) {
  this.state = "playing";
  this.game = game;
  this.paddle = new Paddle(x, y, w, h, game);
}


module.exports = Player;
