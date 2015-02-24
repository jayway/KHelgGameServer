function Paddle(x, y, width, height, game) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
  this.x_speed = 0;
  this.y_speed = 0;
  this.game = game;
}


Paddle.prototype.move = function(x, y) {
  this.x += x;
  this.y += y;
  this.x_speed = x;
  this.y_speed = y;
  if(this.x < 0) { // all the way to the left
    this.x = 0;
    this.x_speed = 0;
  } else if (this.x + this.width > this.game.gameplanWidth) { // all the way to the right
    this.x = this.game.gameplanWidth - this.width;
    this.x_speed = 0;
  }
}

module.exports = Paddle;