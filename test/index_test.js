var assert = require('assert');
var Game   = require('./../index').Game;
var PlayerList   = require('./../index').PlayerList;
var Player= require('./../index').Player;

suite('Game', function() {
  var g;

  before(function(){
    var s1 = {playername:"Christian"};
    var s2 = {playername:"Albin"};
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
    var s1 = {playername:"Christian"};
    var io = {};
    p1 = new Player(s1, "Christian",0,0,0,0);
  });

  test('should handle adding of a player', function() {
    list = new PlayerList();
    list.addPlayer(p1);
    var firstPlayer = list.allPlayers()[0];
    assert.equal(firstPlayer.name, "Christian", "Expected 'Christian' but got "+firstPlayer.name+".");
  });

  test('do not allow player to register with an existing name', function() {
    list = new PlayerList();
    list.addPlayer(p1);
    var p2 = new Player(0, "Christian",0,0,0,0);
    list.addPlayer(p2);
    players = list.allPlayers();
    assert.equal(players.length, 1, "Expected 1 player but got "+players.length+".");
  });

  test('should handle removal of a player', function() {
    list = new PlayerList();
    list.addPlayer(p1);
    var p2 = new Player(0, "TestPlayer2",0,0,0,0);
    list.allPlayers()
    list.addPlayer(p2);
    list.deletePlayerWithName("TestPlayer2");
    players = list.allPlayers();
    assert.equal(players.length, 1, "Expected 1 player but got "+players.length+".");
  });

  test('can contain many players', function() {
    list = new PlayerList();
    var p2 = new Player(0, "TestPlayer1",0,0,0,0);
    var p3 = new Player(0, "TestPlayer2",0,0,0,0);
    list.addPlayer(p1);
    list.addPlayer(p2);
    list.addPlayer(p3);
    players = list.allPlayers();
    assert.equal(players.length, 3, "Expected 3 players but got "+players.length+".");
  });

  test('can select two players for a game', function() {
    list = new PlayerList();
    var p2 = new Player(0, "TestPlayer1",0,0,0,0);
    var p3 = new Player(0, "TestPlayer2",0,0,0,0);
    list.addPlayer(p1);
    list.addPlayer(p2);
    list.addPlayer(p3);
    players = list.playersForGame();
    assert(players, "There should be players in the game list but found "+players);
    assert.equal(players["player1"].name, "Christian", "Expected 'Christian' but got "+players["player1"].name+".");
    assert.equal(players["player2"].name, "TestPlayer1", "Expected 'TestPlayer1' but got "+players["player2"].name+".");
  });

  test('can handle game not having enough players', function() {
    list = new PlayerList();
    list.addPlayer(p1);
    players = list.playersForGame();
    assert(!players, "There should be no players in the game list but found "+players);
  });

});
