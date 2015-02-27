## Description

A little Pong Game Server using socket.io and express.

## Installing the server

Make sure that you have NodeJS (0.12.0) installed. 

    $ npm install

## Running the server

    $ node index.js

This will launch the server and you can access it at [http://localhost:3000][1].

There is a WebSocket open that you can connect to at the same address.

## Testing the server

    $ mocha -u tdd test

## Events to listen for:

Here are the different events that the server sends to connected clients.

### players

Returns the currently connected players. Is sent out every time a player connects or disconnects. It is indicated if the player is currently engaged in a game or not.

Sample response:

    {
      players: {
        [ { name: "Christian", state:"spectator" }, {name: "Albin", state: "spectator"} ]
      }, 
      numPlayers: 2
    }

### message

A message from a player that is broadcasted to everyone connected (including the sender).

Sample response:

    {message: "hello world", player: "Christian"}

### step

This describes the current state of the game. This message will be broadcasted frequently, currently 30 times per seconds. 

Sample response:

    {
      ball: {x:10, y: 300, x_speed: 3, y_speed: 5, radius:5},
      playerPaddle: {x:106, y: 400, width:50, height:10},
      remotePlayerPaddle: {x:100, y: 0,width:50, height:10},
      players: {
        player1: {name:"Albin", score:3},
        player2: {name:"Christian", score:1}
      },
      bounds: {
        width: 400,
        height: 600
      }
    }

### winning

Broadcasted when a player has won the game.

Sample response:

    {
      winner: "Christian",
      player1Points: 5,
      player2Points: 2
    }


## Message to emit:

These messages can be sent to the server.

### add player

Used to login at the server. The game will not start until this is received for two players.

    {playername: "Christian"}

### message

A chat message to be broadcasted to other players. The server will keep track of who is the sender.

    {message: "hello world"}

### ready

When two or more players have registered, the first two in line will be eligible to start a game. Send "ready" when you're ready to start the game. When two players have sent ready the game starts. When the game is over you need to send ready again for a re-match. No payload is necessary with this command.

    {}

### move

A command to move the players paddle. This is the only way for the client to influence the game. The server will return the effects of the move in the next step broadcast. The server may handle moves it wants, so don't rely on client side logic for this.

    {
      paddle: {
        x: 10, 
        y:0
      }
    }

Yes, it's possible to change the paddle in two dimensions. Some would consider this cheating.

  [1]: http://localhost:3000

