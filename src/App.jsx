import { useEffect, useState, useRef } from 'react';
import './App.css';

const SIZE = 4;

const getEmptyBoard = () => Array(SIZE).fill().map(() => Array(SIZE).fill(0));
const getRandomInt = (max) => Math.floor(Math.random() * max);

const addRandomTile = (board) => {
  const emptyTiles = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) emptyTiles.push([r, c]);
    }
  }
  if (emptyTiles.length === 0) return board;
  const newBoard = board.map(row => [...row]);
  const [r, c] = emptyTiles[getRandomInt(emptyTiles.length)];
  newBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newBoard;
};

const transpose = (board) => board[0].map((_, c) => board.map(r => r[c]));
const reverse = (board) => board.map(row => [...row].reverse());
const compress = (board) => board.map(row => {
  const newRow = row.filter(val => val !== 0);
  while (newRow.length < SIZE) newRow.push(0);
  return newRow;
});

const merge = (board, setScore, setPopup) => {
  const newBoard = board.map(row => [...row]);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE - 1; c++) {
      if (newBoard[r][c] !== 0 && newBoard[r][c] === newBoard[r][c + 1]) {
        const mergedValue = newBoard[r][c] * 2;
        newBoard[r][c] = mergedValue;
        newBoard[r][c + 1] = 0;
        setScore(prev => {
          setPopup({ row: r, col: c, value: mergedValue });
          return prev + mergedValue;
        });
      }
    }
  }
  return newBoard;
};

const moveLeft = (board, setScore, setPopup) => {
  let newBoard = compress(board);
  newBoard = merge(newBoard, setScore, setPopup);
  newBoard = compress(newBoard);
  return newBoard;
};

const moveRight = (board, setScore, setPopup) => {
  let boardCopy = reverse(board);
  boardCopy = moveLeft(boardCopy, setScore, setPopup);
  return reverse(boardCopy);
};

const moveUp = (board, setScore, setPopup) => {
  let boardCopy = transpose(board);
  boardCopy = moveLeft(boardCopy, setScore, setPopup);
  return transpose(boardCopy);
};

const moveDown = (board, setScore, setPopup) => {
  let boardCopy = transpose(board);
  boardCopy = moveRight(boardCopy, setScore, setPopup);
  return transpose(boardCopy);
};

const isGameOver = (board) => {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) return false;
      if (c < SIZE - 1 && board[r][c] === board[r][c + 1]) return false;
      if (r < SIZE - 1 && board[r][c] === board[r + 1][c]) return false;
    }
  }
  return true;
};

function App() {
  const [board, setBoard] = useState(() => addRandomTile(addRandomTile(getEmptyBoard())));
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => Number(localStorage.getItem("bestScore")) || 0);
  const [gameOver, setGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [popup, setPopup] = useState(null);
  const [previousBoard, setPreviousBoard] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    document.body.className = darkMode ? "dark-mode" : "";
  }, [darkMode]);

  const handleKeyDown = (e) => {
    if (gameOver || hasWon) return;
    let processed;
    const copy = board.map(row => [...row]);
    setPreviousBoard(copy);

    if (e.key === 'ArrowLeft') processed = moveLeft(copy, setScore, setPopup);
    else if (e.key === 'ArrowRight') processed = moveRight(copy, setScore, setPopup);
    else if (e.key === 'ArrowUp') processed = moveUp(copy, setScore, setPopup);
    else if (e.key === 'ArrowDown') processed = moveDown(copy, setScore, setPopup);
    else return;

    if (JSON.stringify(copy) !== JSON.stringify(processed)) {
      const updated = addRandomTile(processed);
      setBoard(updated);
      if (isGameOver(updated)) setGameOver(true);
      if (updated.flat().includes(2048)) setHasWon(true);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  useEffect(() => {
    setBestScore(prev => {
      const newBest = Math.max(prev, score);
      localStorage.setItem("bestScore", newBest);
      return newBest;
    });
  }, [score]);

  const restartGame = () => {
    setBoard(addRandomTile(addRandomTile(getEmptyBoard())));
    setScore(0);
    setPopup(null);
    setHasWon(false);
    setGameOver(false);
    setPreviousBoard(null);
  };

  const undoMove = () => {
    if (previousBoard) setBoard(previousBoard);
  };

  // Swipe detection
  useEffect(() => {
    const el = containerRef.current;
    let startX, startY;

    const handleTouchStart = e => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
    };

    const handleTouchEnd = e => {
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) > Math.abs(dy)) {
        handleKeyDown({ key: dx > 0 ? "ArrowRight" : "ArrowLeft" });
      } else {
        handleKeyDown({ key: dy > 0 ? "ArrowDown" : "ArrowUp" });
      }
    };

    el.addEventListener("touchstart", handleTouchStart);
    el.addEventListener("touchend", handleTouchEnd);
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [board]);

  return (
    <div className="container" ref={containerRef}>
      <h1>2048</h1>
      <div className="score-boxes">
        <div className="score">Score: {score}</div>
        <div className="score">Best: {bestScore}</div>
      </div>
      <div className="board-container">
        {board.map((row, r) => (
          <div key={r} className="row">
            {row.map((val, c) => (
              <div key={c} className={`cell cell-${val}`}>
                {val !== 0 ? val : ""}
                {popup && popup.row === r && popup.col === c && (
                  <span className="score-popup">+{popup.value}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {gameOver && (
        <div className="game-over-modal">
          <div className="modal-content">
            <p>Game Over</p>
            <button onClick={restartGame}>Restart</button>
          </div>
        </div>
      )}

      {hasWon && (
        <div className="win-modal">
          <div className="modal-content">
            <p>🎉 You Win!</p>
            <button onClick={() => setHasWon(false)}>Continue</button>
          </div>
        </div>
      )}

      <div className="buttons">
        <button className="undo" onClick={undoMove}>⏪ Undo</button>
        <button className="restart" onClick={restartGame}>🔁 Restart</button>
        <button className="dark-toggle" onClick={() => setDarkMode(prev => !prev)}>
          🌓 {darkMode ? "Light" : "Dark"} Mode
        </button>
      </div>
    </div>
  );
}

export default App;