const socket = io();
const chess = new Chess();

const boardElement = document.querySelector(".chessBoard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let playerCount = 0;

let capturingSound = new Audio("/capture.mp3");
let movingSound = new Audio("/move-self.mp3");
let illegalMoveSound = new Audio("/illegal.mp3");
let gameOver = new Audio("/game-end.mp3");

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";
    // console.log(board);

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
        console.log(`Move successful: ${JSON.stringify(validMove)}`);
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


socket.on("playerRole", (role) => {
    playerRole = role;
    renderBoard();
});

socket.on("spectatorRole", () => {
    playerRole = null;
    renderBoard();
});

socket.on("boardState", (fen) => {
    // console.log("Received FEN:", fen);
    chess.load(fen);
    renderBoard();
});

socket.on("move", (move) => {
    console.log(`Received move: ${JSON.stringify(move)}`);
    chess.move(move);
    renderBoard();
});

socket.on("sound", (type) => {
    if (type === "capture") {
        capturingSound.play();
    } else if (type === "gameOver") {
        window.setTimeout(gameOver.play(), 400);
    } else {
        movingSound.play();
    }
});
renderBoard();
