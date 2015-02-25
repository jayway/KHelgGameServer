
function userBrowser() {
  var ua = navigator.userAgent.toLowerCase();
  if(ua.indexOf("firefox") >-1) { return "Firefox"; }
  if(ua.indexOf("chrome") >-1) { return "Chrome"; }
  if(ua.indexOf("phone") >-1) { return "phone"; }
  return "unknown-browser";
}

var socket = io();

// Canvas
var canvas = document.createElement('canvas');
var width = 400;
var height = 600;
canvas.width = width;
canvas.height = height;
var context = canvas.getContext('2d');

// State

var  gameStarted = false;
var  isReady = false;
var  loggingIn = false;

// Player
var player = new Player();

// RemotePlayer
var remoteplayer = new RemotePlayer();

// Ball
var ball = new Ball(0, 0);

// Controls

var keysDown = {};

var step = function() {
  update();
  render();
};

var update = function() {
  player.update();
  ball.update(player.paddle, remoteplayer.paddle);
};

var render = function() {
  context.fillStyle = "#DDDDEE";
  context.fillRect(0, 0, width, height);
  player.render();
  remoteplayer.render();
  ball.render();
};

var showSpinner = function(showSpinner) {
  if(showSpinner){
      $(".spinner").show();
      $(".canvasContainer").hide();
  }
  else {
      $(".spinner").hide();
      $(".canvasContainer").show();
  }
};

var showLogin = function(shouldShowLogin) {
  if(shouldShowLogin){
      $(".login").show();
      $(".canvasContainer").hide();
  }
  else {
      $(".login").hide();
      $(".canvasContainer").show();
  }
};

var showReady = function(showReady) {
  if(showReady){
    $("#readypane").show();
  }
  else {
    $("#readypane").hide();
  }
};

var loginPlayer = function(playername){
  var name = "Unknown "+userBrowser()
  if (playername) {
    name = playername;
  }
  console.log("Connecting as "+name+" in: "+playername);
  socket.emit('add player', {playername: name} );
  loggingIn = true;
}

function Paddle(x, y, width, height) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
  this.x_speed = 0;
  this.y_speed = 0;
}

Paddle.prototype.render = function() {
  context.fillStyle = "#0000FF";
  context.fillRect(this.x, this.y, this.width, this.height);
};

function Player() {
   this.paddle = new Paddle(175, 580, 50, 10);
}

function RemotePlayer() {
  this.paddle = new Paddle(175, 10, 50, 10);
}

Player.prototype.render = function() {
  this.paddle.render();
};

Player.prototype.update = function() {
  for(var key in keysDown) {
    var value = Number(key);
    if(value == 37) { // left arrow
      socket.emit('move', {paddle: {x:-4.0, y:0} } );
    } else if (value == 39) { // right arrow
      socket.emit('move', {paddle: {x:4.0, y:0} } );
    } else {
      // don't do anything
    }
  }
};


RemotePlayer.prototype.render = function() {
  this.paddle.render();
};

function Ball(x, y) {
  this.x = x;
  this.y = y;
  this.x_speed = 0;
  this.y_speed = 3;
  this.radius = 5;
}

Ball.prototype.render = function() {
  context.beginPath();
  context.arc(this.x, this.y, this.radius, 2 * Math.PI, false);
  context.fillStyle = "#000000";
  context.fill();
};

Ball.prototype.update = function(paddle1, paddle2) {
  // from server
};

$('form.chat').submit(function(){
  socket.emit('message', {message:$('#m').val()});
  $('#m').val('');
  return false;
});

$('form.ready').submit(function(){

  showReady(false);
  isReady = true;
  socket.emit('ready', {});
  return false;
});

$('form.login').submit(function(){
  playername = $('#l').val();
  loginPlayer(playername);
  return false;
});

$(function() {
  $(".canvasContainer").append(canvas);
  window.addEventListener("keydown", function(event) {
    keysDown[event.keyCode] = true;
  });
  window.addEventListener("keyup", function(event) {
    delete keysDown[event.keyCode];
  });
  $(".leftButton").on("click", function(){
      socket.emit('move', {paddle: {x:-20.0, y:0} } );
    console.log("left");
  });
  $(".rightButton").on("click", function(){
    console.log("right");
      socket.emit('move', {paddle: {x:20.0, y:0} } );
  });

  showReady(false);
  showSpinner(false);
  showLogin(true);

  socket.on('winning', function(data){
      alert(data.winner+" has won the game!");
      showReady(true);
      isReady=false;
  });

  socket.on('message', function(data){
    $('#messages').append($('<li>').text(data.player+"> "+data.message));
  });

  socket.on('disconnected', function(data){
    alert("Disconnected! "+data.readable_reason);
    loggingIn = false;
    showLogin(true);
  });

  socket.on('players', function(data){
    var playersString = ""
    if(data.numPlayers==1 && loggingIn) {
      loggingIn = false;
      showLogin(false);
      showSpinner(true);
    }
    if(data.numPlayers>=2) {
      gameStarted = data.players[0].state==="playing" && data.players[1].state==="playing";

      if(!gameStarted) {
        showLogin(false);
        showSpinner(false);
        if(!isReady) {
          showReady(true);
        }
      }

      if(loggingIn){
        loggingIn = false;
      }
    }
    for (var i in data.players) {
      playersString+=" "+data.players[i].name+" ("+data.players[i].state+")";
    }
    $('#players').text("Players: "+playersString);
  });

  socket.on('step', function(gameState){
    if(!gameStarted) {
      // there is an ongoing game that we didn't know about
      // Let's see that in action!
      showLogin(false);
      showSpinner(false);

    }
    ball.x = gameState.ball.x;
    ball.y = gameState.ball.y;
    ball.radius = gameState.ball.radius;
    player.paddle.x = gameState.playerPaddle.x;
    player.paddle.y = gameState.playerPaddle.y;
    player.paddle.width = gameState.playerPaddle.width;
    player.paddle.height = gameState.playerPaddle.height;
    remoteplayer.paddle.x = gameState.remotePlayerPaddle.x;
    remoteplayer.paddle.y = gameState.remotePlayerPaddle.y;
    remoteplayer.paddle.width = gameState.remotePlayerPaddle.width;
    remoteplayer.paddle.height = gameState.remotePlayerPaddle.height;
    step();
  });
});
