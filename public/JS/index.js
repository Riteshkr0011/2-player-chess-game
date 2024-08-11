const socket = io();
const chess = new Chess();

const boardElement = document.querySelector(".chessBoard");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let movesCounter = 1;

let capturingSound = new Audio("/capture.mp3");
let movingSound = new Audio("/move-self.mp3");
let illegalMoveSound = new Audio("/illegal.mp3");
let gameOver = new Audio("/game-end.mp3");

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";

    board.forEach((row, rowIndex) => {
        row.forEach((square, squareIndex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add("square", (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark");

            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = squareIndex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece", square.color === "w" ? "white" : "black");
                pieceElement.innerText = getPieceUnicode(square);
                pieceElement.draggable = playerRole === square.color;

                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowIndex, col: squareIndex };
                        e.dataTransfer.setData("text/plain", "");
                        pieceElement.classList.add("dragging");
                    }
                });

                pieceElement.addEventListener("dragend", (e) => {
                    draggedPiece = null;
                    sourceSquare = null;
                    pieceElement.classList.remove("dragging");
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("dragover", (e) => {
                e.preventDefault();
            });

            squareElement.addEventListener("drop", (e) => {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSquare = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col)
                    };

                    handleMove(sourceSquare, targetSquare);
                }
            });

            boardElement.appendChild(squareElement);
        });
    });

    // Apply flipped class if the player is black
    if (playerRole === "b") {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("flipped");
    }
};

const handleMove = (source, target) => {
    let move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: 'q' // Default to Queen promotion
    };

    if (chess.get(move.from).type === 'k' && Math.abs(source.col - target.col) === 2) {
        if (target.col === 6) {
            move = { from: move.from, to: 'g' + move.from[1] }; // Kingside castling
        } else if (target.col === 2) {
            move = { from: move.from, to: 'c' + move.from[1] }; // Queenside castling
        }
    }
    const validMove = chess.move(move);
    if (validMove) {
        socket.emit("move", move);
    } else {
        illegalMoveSound.play();
        console.error("Invalid move", move);
    }
};

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

const addMoveToList = (currentMove) => {
    const movesList = document.querySelector("ul");
    const moveItem = document.createElement("li");
    const innerTextOfList = `<p>${movesCounter}. ${currentMove.san}</p>`;

    moveItem.innerHTML = innerTextOfList;
    movesList.appendChild(moveItem);
    if (movesCounter % 2 != 0) {
        moveItem.classList.add("movesByWhite", "bg-white");
    } else {
        moveItem.classList.add("movesByBlack", "bg-zinc-700");
    }
    movesCounter += 1;

    // Auto-scroll to the bottom of the list
    movesList.scrollTop = movesList.scrollHeight;
}

window.addEventListener("load", () => {
    const movesList = document.querySelector("ul");
    movesList.innerHTML = "";
});

socket.on("playerRole", (role) => {
    playerRole = role;
    renderBoard();
});

socket.on("spectatorRole", () => {
    playerRole = null;
    renderBoard();
});

socket.on("boardState", (fen) => {
    chess.load(fen);
    renderBoard();
});

socket.on("move", (move) => {
    chess.move(move);
    renderBoard();
});

socket.on("displayMessage", async (playerCount) => {
    const messageBox = document.querySelector(".messageDisplayBox");
    console.log(playerRole, playerCount);

    if (playerRole === 'w' || playerRole === 'b') {
        if (playerCount === 2) {
            messageBox.innerHTML = "<h1>Game Started</h1>";
            await sleep(2000);
            messageBox.innerHTML = "<h1>Play Fair</h1>";
            await sleep(2000);
            messageBox.innerHTML = "<h1>Best of Luck</h1>";
            await sleep(2000);
            messageBox.innerHTML = "";
            return;
        }
        if (playerCount < 2) {
            messageBox.innerHTML = "<h1>Waiting for Opponents...</h1>";
        }
        return;
    } else {
        messageBox.innerHTML = "<h1>You are a Spectator</h1>";
    }
});

socket.on("addToMoveList", (currentMove) => {
    addMoveToList(currentMove);
});

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

socket.on("invalidMove", (move) => {
    illegalMoveSound.play();
});
