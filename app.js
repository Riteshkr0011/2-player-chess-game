// Import necessary modules
import express from "express"; // Express framework for creating the server
import { Chess } from "chess.js"; // Chess.js library to handle chess logic
import { Server } from "socket.io"; // Socket.IO for real-time communication
import http from "http"; // HTTP module to create a server
import path from "path"; // Path module for handling file paths
import { dirname } from "path"; // Used to get the directory name of the current module
import { fileURLToPath } from "url"; // Used to get the file URL path
import bodyParser from "body-parser"; // Middleware to parse request bodies

// Initialize the Express application
const app = express();
const port = 3000; // Define the port the server will listen on
const __dirname = dirname(fileURLToPath(import.meta.url)); // Get the current directory name
const server = http.createServer(app); // Create an HTTP server using Express
const io = new Server(server); // Create a Socket.IO server attached to the HTTP server

// Initialize a new Chess instance
const chess = new Chess();

// Initialize players object and counter to keep track of connected players
let players = {};
let playersCount = 0;

// Set EJS as the view engine to render HTML pages
app.set("view engine", "ejs");

// Serve static files from the "Public" directory
app.use(express.static(path.join(__dirname, "Public")));

// Middleware to parse URL-encoded request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public")); // Serve additional static files if needed

// Route to serve the homepage.ejs file
app.get("/", (req, res) => {
    res.render("homepage"); // Render the homepage when the root URL is accessed
});

// Route to handle form submission from the homepage
app.post("/", (req, res) => {
    const username = req.body.username; // Get the username from the form submission
    res.redirect(`/match?username=${encodeURIComponent(username)}`); // Redirect to the match page with the username as a query parameter
});

// Route to serve the chess match page
app.get("/match/", (req, res) => {
    const username = req.query.username; // Get the username from the query parameters
    res.render("index"); // Render the chess game page (index.ejs)
});

// Handle Socket.IO connections
io.on("connection", (socket) => {
    // Assign the first connected player as white
    if (!players.white) {
        playersCount += 1; // Increase player count
        players.white = socket.id; // Assign the socket ID to white player
        socket.emit("playerRole", "w"); // Notify the player of their role (white)
        io.emit("displayMessage", playersCount); // Notify all clients of the player count
    }
    // Assign the second connected player as black
    else if (!players.black) {
        playersCount += 1;
        players.black = socket.id;
        socket.emit("playerRole", "b"); // Notify the player of their role (black)
        io.emit("displayMessage", playersCount); // Notify all clients of the player count
    }
    // Any additional connections are considered spectators
    else {
        socket.emit("spectatorRole"); // Notify the client that they are a spectator
        socket.emit("displayMessage", playersCount); // Notify the spectator of the player count
    }

    // Send the current board state to the newly connected player
    socket.emit("boardState", chess.fen());

    // Handle player disconnection
    socket.on("disconnect", () => {
        if (socket.id === players.white) {
            playersCount -= 1; // Decrease player count
            delete players.white; // Remove the white player
            io.emit("displayMessage", playersCount); // Notify all clients of the player count
        } else if (socket.id === players.black) {
            playersCount -= 1;
            delete players.black; // Remove the black player
            io.emit("displayMessage", playersCount); // Notify all clients of the player count
        }
    });

    // Handle incoming moves from players
    socket.on("move", (move) => {
        try {
            // Ensure that only the correct player can make a move
            if (chess.turn() === "w" && socket.id !== players.white) return;
            if (chess.turn() === "b" && socket.id !== players.black) return;

            // Attempt to make the move
            const result = chess.move(move);

            // If the move is valid
            if (result) {
                // Emit different sounds based on the move type
                if (result.captured) {
                    io.emit("sound", "capture"); // Sound for capturing a piece
                } else {
                    io.emit("sound", "move"); // Sound for a regular move
                }
                io.emit("addToMoveList", result); // Add the move to the move list
                io.emit("move", move); // Broadcast the move to all clients
                io.emit("boardState", chess.fen()); // Emit the updated board state

                // Check if the game is over
                if (chess.isGameOver()) {
                    io.emit("sound", "gameOver"); // Play the game over sound
                    io.emit("gameover"); // Notify all clients that the game is over
                    setTimeout(() => {
                        chess.reset(); // Reset the chess board after a short delay
                        io.emit("boardState", chess.fen()); // Emit the reset board state
                    }, 1000);
                }
            } else {
                console.log("Invalid move: ", move); // Log invalid moves
                socket.emit("invalidMove", move); // Notify the player of the invalid move
            }
        } catch (error) {
            console.error("Error handling move: ", error); // Log any errors
            socket.emit("invalidMove", move); // Notify the player of the error
        }
    });

    // Handle the game start event
    socket.on("gameStarted", () => {
        chess.reset(); // Reset the chess board
        io.emit("boardState", chess.fen()); // Emit the reset board state to all clients
    });
});

// Start the server and listen on the specified port
server.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});
