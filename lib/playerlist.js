var Player = require('./player');

var PlayerList = function() {
  this.players = [];
}

PlayerList.prototype.addPlayerWithName = function(playername) { 
  // why isn't this.players.some() working?
  var playerExists = false;
  this.players.forEach(function(p){
    if (p.name === playername) { playerExists = true;}
  });

  if(!playerExists) {
    var player = new Player(playername);
    this.players.push(player); 
    return true;
  }
  else {
    return false;
  }
}

PlayerList.prototype.playerWithName = function(playername) { 
  // why isn't this.players.some() working?
  var foundPlayer = false;
  this.players.forEach(function(p){
    if (p.name === playername) { 
      foundPlayer = p;
    }
  });
  return foundPlayer;
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

module.exports = PlayerList;
