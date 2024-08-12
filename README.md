# Online Chess Game

This application is an online 2-player chess game with real-time interaction using Socket.IO. Players can drag and drop pieces on an interactive chessboard, with moves validated by the Chess.js library. The game also supports spectators who can watch but not participate in the gameplay.

## Features

1. **Real-Time Play**  
   - Two players can join and play chess in real-time. Moves are instantly updated for both players and spectators.

2. **Player Roles**  
   - **White Player**: First player to join.
   - **Black Player**: Second player to join.
   - **Spectators**: Additional users who observe the game.

3. **Dynamic Messaging**  
   - **Waiting for Opponent**: Displayed when only one player is connected.
   - **Game Started**: Shown when two players have joined, followed by encouraging messages.
   - **Board is Busy**: Displayed to spectators when two players are already in the game.

4. **Move History**  
   - The game tracks and displays the move history, updating the list in real-time.

5. **Sound Effects**  
   - Sounds play for moves, captures, illegal moves, and game-over events.

6. **Game Over Handling**  
   - When the game ends, the board resets, and the updated state is broadcast to all players.

## Technical Stack

- **Front-End**: HTML, CSS, JavaScript for the interactive chessboard and move tracking.
- **Back-End**: Node.js, Express, and Socket.IO for real-time communication and game management.
- **Templating**: EJS for rendering dynamic pages.

## How to Run

1. Clone the repository.
2. Install dependencies using `npm install`.
3. Start the server with `npm start`.
4. Visit `http://localhost:3000` to play the game.

This application provides an engaging and interactive platform for online chess, offering a seamless experience for both players and spectators.
