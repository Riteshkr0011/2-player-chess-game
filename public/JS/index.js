// Initialize Socket.IO connection
const socket = io();
// Initialize a new Chess instance
const chess = new Chess();

// DOM elements
const boardElement = document.querySelector(".chessBoard");

// Utility function to pause execution for a given number of milliseconds
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Variables to keep track of the dragged piece and the player's role
let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let movesCounter = 1; // Counter to track the number of moves

// Audio elements for sound effects
let capturingSound = new Audio("/capture.mp3");
let movingSound = new Audio("/move-self.mp3");
let illegalMoveSound = new Audio("/illegal.mp3");
let gameOver = new Audio("/game-end.mp3");

// Function to render the chessboard based on the current game state
const renderBoard = () => {
    const board = chess.board(); // Get the current state of the chessboard
    boardElement.innerHTML = ""; // Clear the board element

    // Iterate over each square on the board
    board.forEach((row, rowIndex) => {
        row.forEach((square, squareIndex) => {
            // Create a square element for the chessboard
            const squareElement = document.createElement("div");
            squareElement.classList.add("square", (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark");

            // Assign row and column data attributes to the square
            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = squareIndex;

            // If there's a piece on the square, render it
            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece", square.color === "w" ? "white" : "black");
                pieceElement.innerText = getPieceUnicode(square); // Get the Unicode character for the piece
                pieceElement.draggable = playerRole === square.color; // Allow dragging if it's the player's piece

                // Event listener for when dragging starts
                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowIndex, col: squareIndex }; // Track the source square
                        e.dataTransfer.setData("text/plain", ""); // Required for drag event to work
                        pieceElement.classList.add("dragging");
                    }
                });

                // Event listener for when dragging ends
                pieceElement.addEventListener("dragend", (e) => {
                    draggedPiece = null;
                    sourceSquare = null;
                    pieceElement.classList.remove("dragging");
                });

                squareElement.appendChild(pieceElement); // Append the piece to the square
            }

            // Allow dropping on all squares
            squareElement.addEventListener("dragover", (e) => {
                e.preventDefault();
            });

            // Handle dropping a piece onto a square
            squareElement.addEventListener("drop", (e) => {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSquare = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col)
                    };

                    handleMove(sourceSquare, targetSquare); // Process the move
                }
            });

            boardElement.appendChild(squareElement); // Append the square to the board
        });
    });

    // Flip the board if the player is playing as black
    if (playerRole === "b") {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("flipped");
    }
};

// Function to handle a move made by the player
const handleMove = (source, target) => {
    let move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: 'q' // Default to Queen promotion
    };

    // Handle castling manually
    if (chess.get(move.from).type === 'k' && Math.abs(source.col - target.col) === 2) {
        if (target.col === 6) {
            move = { from: move.from, to: 'g' + move.from[1] }; // Kingside castling
        } else if (target.col === 2) {
            move = { from: move.from, to: 'c' + move.from[1] }; // Queenside castling
        }
    }

    // Attempt to make the move on the client-side chess instance
    const validMove = chess.move(move);
    if (validMove) {
        socket.emit("move", move); // Send the move to the server if it's valid
    } else {
        illegalMoveSound.play(); // Play a sound for an illegal move
        console.error("Invalid move", move);
    }
};

// Function to get the Unicode character for a chess piece
const getPieceUnicode = (piece) => {
    const unicodePieces = {
        p: "♙",
        r: "♖",
        n: "♘",
        b: "♗",
        q: "♕",
        k: "♔",
        P: "♟",
        R: "♜",
        N: "♞",
        B: "♝",
        Q: "♛",
        K: "♚",
    };

    return unicodePieces[piece.type] || "";
};

// Function to add a move to the move list display
const addMoveToList = (currentMove) => {
    const movesList = document.querySelector("ul");
    const moveItem = document.createElement("li");
    const innerTextOfList = `<p>${movesCounter}. ${currentMove.san}</p>`; // Display move number and SAN notation

    moveItem.innerHTML = innerTextOfList;
    movesList.appendChild(moveItem);

    // Apply different styles based on which player made the move
    if (movesCounter % 2 != 0) {
        moveItem.classList.add("movesByWhite", "bg-white");
    } else {
        moveItem.classList.add("movesByBlack", "bg-zinc-700");
    }
    movesCounter += 1;

    // Auto-scroll to the bottom of the move list
    movesList.scrollTop = movesList.scrollHeight;
}

// Clear the move list when the page loads
window.addEventListener("load", () => {
    const movesList = document.querySelector("ul");
    movesList.innerHTML = "";
});

// Event listener for setting the player's role (white or black)
socket.on("playerRole", (role) => {
    playerRole = role;
    renderBoard(); // Re-render the board with the new role
});

// Event listener for spectators
socket.on("spectatorRole", () => {
    playerRole = null;
    renderBoard(); // Re-render the board for spectators
});

// Event listener for updating the board state
socket.on("boardState", (fen) => {
    chess.load(fen); // Load the new board state
    renderBoard(); // Re-render the board
});

// Event listener for handling a move made by the opponent
socket.on("move", (move) => {
    chess.move(move); // Make the move on the client-side chess instance
    renderBoard(); // Re-render the board
});

// Event listener for displaying messages based on player count and roles
socket.on("displayMessage", async (playerCount) => {
    const messageBox = document.querySelector(".messageDisplayBox");
    console.log(playerRole, playerCount);

    if (playerRole === 'w' || playerRole === 'b') {
        if (playerCount === 2) {
            // Display a series of messages before starting the game
            messageBox.innerHTML = "<h1>Game Started</h1>";
            await sleep(2000);
            messageBox.innerHTML = "<h1>Play Fair</h1>";
            await sleep(2000);
            messageBox.innerHTML = "<h1>Best of Luck</h1>";
            await sleep(2000);
            socket.emit("gameStarted"); // Notify the server that the game has started
            messageBox.innerHTML = "";
            return;
        }
        if (playerCount < 2) {
            messageBox.innerHTML = "<h1>Waiting for Opponents...</h1>"; // Display waiting message
        }
        return;
    } else {
        messageBox.innerHTML = "<h1>You are a Spectator</h1>"; // Display spectator message
    }
});

// Event listener for adding a move to the move list
socket.on("addToMoveList", (currentMove) => {
    addMoveToList(currentMove);
});

// Event listener for playing sound effects
socket.on("sound", (type) => {
    switch (type) {
        case "capture":
            capturingSound.play();
            break;
        case "move":
            movingSound.play();
            break;
        case "gameOver":
            gameOver.play();
            break;
        default:
            break;
    }
});

// Event listener for handling illegal moves
socket.on("invalidMove", (move) => {
    illegalMoveSound.play(); // Play a sound for an invalid move
});
