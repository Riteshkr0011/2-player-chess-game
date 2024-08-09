import express from "express";
import { Chess } from "chess.js";
import { Server } from "socket.io";
import http from "http";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { Socket } from "dgram";

const app = express();
const port = 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));
const server = http.createServer(app);
const io = new Server(server);

const chess = new Chess();

let players = {};
let playersCount = 0;

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "Public")));


// Serve the index.ejs file
app.get("/", (req, res) => {
    res.render("index");
});

io.on("connection", (socket) => {
    if (!players.white) {
        playersCount += 1;
        players.white = socket.id;
        socket.emit("playerRole", "w");
    } else if (!players.black) {
        playersCount += 1;
        players.black = socket.id;
        socket.emit("playerRole", "b");
    } else {
        socket.emit("spectatorRole");
    }
    io.emit("currentPlayerCount", (playersCount));

    // Send the current board state to the newly connected player
    socket.emit("boardState", chess.fen());

    socket.on("disconnect", () => {

        if (socket.id === players.white) {
            playersCount -= 1;
            delete players.white;
        } else if (socket.id === players.black) {
            playersCount -= 1;
            delete players.black;
        }
        io.emit("currentPlayerCount", (playersCount));
    });

    socket.on("move", (move) => {
        try {
            if (chess.turn() === "w" && socket.id !== players.white) return;
            if (chess.turn() === "b" && socket.id !== players.black) return;

            const result = chess.move(move);

            if (result) {

                if (result.captured) {
                    io.emit("sound", "capture");
                } else {
                    io.emit("sound", "move");
                }
                io.emit("addToMoveList", result);
                io.emit("move", move);
                io.emit("boardState", chess.fen()); // Emit updated board state

                if (chess.isGameOver()) {
                    io.emit("sound", "gameOver");
                    io.emit("gameover");
                    chess.reset();
                    setTimeout(() => {
                        chess.reset();
                        io.emit("boardState", chess.fen());
                    }, 1000);
                }
            } else {
                console.log("Invalid move: ", move);
                socket.emit("invalidMove", move);
            }
        } catch (error) {
            console.error("Error handling move: ", error);
            socket.emit("invalidMove", move);
        }
    });
});

server.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});