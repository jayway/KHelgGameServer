var Paddle = require('./paddle');

function Player(name) {
  this.name = name;
}


Player.prototype.addToGame = function(game,x,y,w,h) {
  this.paddle = new Paddle(x, y, w, h, game);
}


module.exports = Player;
