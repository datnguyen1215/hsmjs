import { createMachine, assign } from '../src/index.js';

const checkWinner = (board) => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6] // diagonals
  ];

  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], winningLine: line, isDraw: false };
    }
  }

  const isDraw = board.every(cell => cell !== null);
  return { winner: null, winningLine: null, isDraw };
};

const runExample = async () => {
  const ticTacToeMachine = createMachine({
    id: 'ticTacToe',
    initial: 'playing',
    context: {
      board: Array(9).fill(null),
      currentPlayer: 'X',
      winner: null,
      winningLine: null
    },
    states: {
      playing: {
        on: {
          MOVE: [
            {
              target: 'gameOver',
              cond: (ctx, event) => {
                if (ctx.board[event.position] !== null) return false;
                const newBoard = [...ctx.board];
                newBoard[event.position] = ctx.currentPlayer;
                const result = checkWinner(newBoard);
                return result.winner || result.isDraw;
              },
              actions: [assign({
                board: (ctx, event) => {
                  const newBoard = [...ctx.board];
                  newBoard[event.position] = ctx.currentPlayer;
                  return newBoard;
                },
                winner: (ctx, event) => {
                  const newBoard = [...ctx.board];
                  newBoard[event.position] = ctx.currentPlayer;
                  const result = checkWinner(newBoard);
                  return result.winner;
                },
                winningLine: (ctx, event) => {
                  const newBoard = [...ctx.board];
                  newBoard[event.position] = ctx.currentPlayer;
                  const result = checkWinner(newBoard);
                  return result.winningLine;
                }
              })]
            },
            {
              cond: (ctx, event) => ctx.board[event.position] === null,
              actions: [assign({
                board: (ctx, event) => {
                  const newBoard = [...ctx.board];
                  newBoard[event.position] = ctx.currentPlayer;
                  return newBoard;
                },
                currentPlayer: (ctx) => ctx.currentPlayer === 'X' ? 'O' : 'X'
              })]
            }
          ],
          RESET: {
            actions: [assign({
              board: () => Array(9).fill(null),
              currentPlayer: 'X',
              winner: null,
              winningLine: null
            })]
          }
        }
      },
      gameOver: {
        on: {
          RESET: {
            target: 'playing',
            actions: [assign({
              board: () => Array(9).fill(null),
              currentPlayer: 'X',
              winner: null,
              winningLine: null
            })]
          }
        }
      }
    }
  });

  const displayBoard = (board) => {
    console.log(`
 ${board[0] || ' '} | ${board[1] || ' '} | ${board[2] || ' '} `);
    console.log(`-----------`);
    console.log(` ${board[3] || ' '} | ${board[4] || ' '} | ${board[5] || ' '} `);
    console.log(`-----------`);
    console.log(` ${board[6] || ' '} | ${board[7] || ' '} | ${board[8] || ' '} \n`);
  };

  // Usage demonstration
  console.log('Tic-Tac-Toe Game Example:');
  console.log('Initial state:', ticTacToeMachine.state);
  console.log('Current player:', ticTacToeMachine.context.currentPlayer);
  displayBoard(ticTacToeMachine.context.board);

  // Play a game: X wins diagonally
  console.log('Making moves...');

  await ticTacToeMachine.send('MOVE', { position: 0 }); // X
  console.log('X plays position 0, current player:', ticTacToeMachine.context.currentPlayer);
  displayBoard(ticTacToeMachine.context.board);

  await ticTacToeMachine.send('MOVE', { position: 1 }); // O
  console.log('O plays position 1, current player:', ticTacToeMachine.context.currentPlayer);
  displayBoard(ticTacToeMachine.context.board);

  await ticTacToeMachine.send('MOVE', { position: 4 }); // X
  console.log('X plays position 4, current player:', ticTacToeMachine.context.currentPlayer);
  displayBoard(ticTacToeMachine.context.board);

  await ticTacToeMachine.send('MOVE', { position: 2 }); // O
  console.log('O plays position 2, current player:', ticTacToeMachine.context.currentPlayer);
  displayBoard(ticTacToeMachine.context.board);

  await ticTacToeMachine.send('MOVE', { position: 8 }); // X wins!
  console.log('X plays position 8...');
  displayBoard(ticTacToeMachine.context.board);

  console.log('Game state:', ticTacToeMachine.state);
  console.log('Winner:', ticTacToeMachine.context.winner);
  console.log('Winning line:', ticTacToeMachine.context.winningLine);

  // Reset and play again
  console.log('\n--- Resetting game ---');
  await ticTacToeMachine.send('RESET');
  console.log('After reset - State:', ticTacToeMachine.state);
  console.log('Current player:', ticTacToeMachine.context.currentPlayer);
  displayBoard(ticTacToeMachine.context.board);
};

runExample().catch(console.error);