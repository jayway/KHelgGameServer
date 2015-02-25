var assert = require('assert');
var Game = require('./../lib/ponggame');
var PlayerList= require('./../lib/playerlist');
var Player= require('./../lib/player');

suite('Game', function() {
  var g;

  before(function(){
    var s1 = new Player("Christian");
    var s2 = new Player("Albin");
    var io = {};
    g = new Game(io,s1,s2);
  });

  test('should be possible to create', function() {
    assert(g, "Could not create game");
  });

});


suite('PlayerList', function() {

  var p1;

  before(function(){
    p1 = "Christian";
  });

  test('should handle adding of a player', function() {
    list = new PlayerList();
    list.addPlayerWithName(p1);
    var firstPlayer = list.allPlayers()[0];
    assert.equal(firstPlayer.name, "Christian", "Expected 'Christian' but got "+firstPlayer.name+".");
  });

  test('do not allow player to register with an existing name', function() {
    list = new PlayerList();
    list.addPlayerWithName(p1);
    var p2 = "Christian";
    list.addPlayerWithName(p2);
    players = list.allPlayers();
    assert.equal(players.length, 1, "Expected 1 player but got "+players.length+".");
  });

  test('should handle removal of a player', function() {
    list = new PlayerList();
    list.addPlayerWithName(p1);
    var p2 = "TestPlayer2";
    list.allPlayers()
    list.addPlayerWithName(p2);
    list.deletePlayerWithName("TestPlayer2");
    players = list.allPlayers();
    assert.equal(players.length, 1, "Expected 1 player but got "+players.length+".");
  });

  test('can contain many players', function() {
    list = new PlayerList();
    var p2 = "TestPlayer1";
    var p3 = "TestPlayer2";
    list.addPlayerWithName(p1);
    list.addPlayerWithName(p2);
    list.addPlayerWithName(p3);
    players = list.allPlayers();
    playersString = JSON.stringify(players);
    expectedPlayersString = '[{"name":"Christian","state":"spectator"},{"name":"TestPlayer1","state":"spectator"},{"name":"TestPlayer2","state":"spectator"}]';
    assert.equal(playersString, expectedPlayersString, "Expected "+expectedPlayersString+" but got: "+playersString);
    assert.equal(players.length, 3, "Expected 3 players but got "+players.length+".");
  });

  test('can locate a player by name', function() {
    list = new PlayerList();
    var p2 = "TestPlayer1";
    var p3 = "TestPlayer2";
    list.addPlayerWithName(p1);
    list.addPlayerWithName(p2);
    list.addPlayerWithName(p3);
    invalidplayer = list.playerWithName("asdasghbfe");
    assert(!invalidplayer, "invalid player should be false");
    validplayer = list.playerWithName("TestPlayer1");
    assert(validplayer, "player should be found, but got: "+validplayer);
  });

  test('can select two players for a game', function() {
    list = new PlayerList();
    var p2 = "TestPlayer1";
    var p3 = "TestPlayer2";
    list.addPlayerWithName(p1);
    list.addPlayerWithName(p2);
    list.addPlayerWithName(p3);
    players = list.playersForGame();
    assert(players, "There should be players in the game list but found "+players);
    assert.equal(players["player1"].name, "Christian", "Expected 'Christian' but got "+players["player1"].name+".");
    assert.equal(players["player2"].name, "TestPlayer1", "Expected 'TestPlayer1' but got "+players["player2"].name+".");
  });

  test('can handle game not having enough players', function() {
    list = new PlayerList();
    list.addPlayerWithName(p1);
    players = list.playersForGame();
    assert(!players, "There should be no players in the game list but found "+players);
  });

});
