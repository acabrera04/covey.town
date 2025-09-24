import { createPlayerForTesting } from '../../TestUtils';
import Player from '../../lib/Player';
import { GameMove } from '../../types/CoveyTownSocket';
import QuantumTicTacToeGame from './QuantumTicTacToeGame';
import {
  PLAYER_NOT_IN_GAME_MESSAGE,
  BOARD_POSITION_NOT_EMPTY_MESSAGE,
  PLAYER_ALREADY_IN_GAME_MESSAGE,
  GAME_FULL_MESSAGE,
  MOVE_NOT_YOUR_TURN_MESSAGE,
  INVALID_MOVE_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
} from '../../lib/InvalidParametersError';

describe('QuantumTicTacToeGame', () => {
  let game: QuantumTicTacToeGame;
  let player1: Player;
  let player2: Player;

  beforeEach(() => {
    game = new QuantumTicTacToeGame();
    player1 = createPlayerForTesting();
    player2 = createPlayerForTesting();
  });

  describe('_join', () => {
    it('should add the first player as X', () => {
      game.join(player1);
      expect(game.state.x).toBe(player1.id);
      expect(game.state.o).toBeUndefined();
      expect(game.state.moves).toHaveLength(0);
      expect(game.state.status).toBe('WAITING_TO_START');
      expect(game.state.winner).toBeUndefined();
    });

    // Fromt TicTacToeGame.test
    it('should throw an error if the player is already in the game', () => {
      game.join(player1);
      expect(() => game.join(player1)).toThrowError(PLAYER_ALREADY_IN_GAME_MESSAGE);
      game.join(player2);
      expect(() => game.join(player2)).toThrowError(PLAYER_ALREADY_IN_GAME_MESSAGE);
    });
    describe('when two players join the game', () => {
      beforeEach(() => {
        game.join(player1);
        game.join(player2);
      });
      it('should add the first player as X and the second player as O', () => {
        expect(game.state.x).toBe(player1.id);
        expect(game.state.o).toBe(player2.id);
      });
      it('should reset the game state', () => {
        expect(game.state.status).toBe('IN_PROGRESS');
        expect(game.state.moves).toHaveLength(0);
        expect(game.state.winner).toBeUndefined();
      });
      it('should error if the game is full', () => {
        expect(() => game.join(createPlayerForTesting())).toThrowError(GAME_FULL_MESSAGE);
      });
    });
  });

  describe('_leave', () => {
    describe('when two players are in the game', () => {
      beforeEach(() => {
        game.join(player1);
        game.join(player2);
      });

      it('should set the game to OVER and declare the other player the winner', () => {
        game.leave(player1);
        expect(game.state.status).toBe('OVER');
        expect(game.state.winner).toBe(player2.id);
        expect(game.state.moves).toHaveLength(0);

        expect(game.state.x).toEqual(player1.id);
        expect(game.state.o).toEqual(player2.id);
      });

      it('should set the game to OVER and declare the player1 the winner', () => {
        game.leave(player2);
        expect(game.state.status).toBe('OVER');
        expect(game.state.winner).toBe(player1.id);
        expect(game.state.moves).toHaveLength(0);

        expect(game.state.x).toEqual(player1.id);
        expect(game.state.o).toEqual(player2.id);
      });
    });

    // taken from TicTacToeGame.test.ts
    it('should throw an error if the player is not in the game', () => {
      expect(() => game.leave(createPlayerForTesting())).toThrowError(PLAYER_NOT_IN_GAME_MESSAGE);
      // TODO weaker test suite only does one of these - above or below
      const player = createPlayerForTesting();
      game.join(player);
      expect(() => game.leave(createPlayerForTesting())).toThrowError(PLAYER_NOT_IN_GAME_MESSAGE);
    });
  });

  describe('applyMove', () => {
    const makeMove = (player: Player, board: 'A' | 'B' | 'C', row: 0 | 1 | 2, col: 0 | 1 | 2) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const move: GameMove<any> = {
        playerID: player.id,
        gameID: game.id,
        move: { board, row, col },
      };
      game.applyMove(move);
    };

    it('should throw an error if the game is not in progress', () => {
      game.join(player1);
      expect(() => makeMove(player1, 'A', 0, 0)).toThrowError(GAME_NOT_IN_PROGRESS_MESSAGE);
      game.join(player2);
      game.leave(player1);
      expect(() => makeMove(player2, 'A', 0, 0)).toThrowError(GAME_NOT_IN_PROGRESS_MESSAGE);
    });

    describe('game in progress', () => {
      beforeEach(() => {
        game.join(player1);
        game.join(player2);
      });
      it('should throw an error if player is not in the game', () => {
        expect(() => makeMove(createPlayerForTesting(), 'A', 0, 0)).toThrowError(
          PLAYER_NOT_IN_GAME_MESSAGE,
        );
      });

      it('should place a piece on an empty square', () => {
        makeMove(player1, 'A', 0, 0);
        // @ts-expect-error - private property
        expect(game._games.A._board[0][0]).toBe('X');
        expect(game.state.moves.length).toBe(1);
      });

      it('should throw an error if a move is made on a tile that was made public', () => {
        makeMove(player1, 'A', 0, 0);
        makeMove(player2, 'A', 0, 0); // should not error
        makeMove(player1, 'B', 0, 0);
        expect(() => makeMove(player2, 'A', 0, 0)).toThrowError(BOARD_POSITION_NOT_EMPTY_MESSAGE);
      });

      it('should throw an error if a player1 moves out of turn', () => {
        makeMove(player1, 'A', 0, 0);
        expect(() => makeMove(player1, 'A', 0, 1)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
      });

      it('should throw an error if a player2 moves out of turn', () => {
        makeMove(player1, 'A', 0, 0);
        makeMove(player2, 'B', 0, 0);
        expect(() => makeMove(player2, 'A', 0, 1)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
      });

      it('should throw an error if a player tries to play on their own piece', () => {
        makeMove(player1, 'A', 0, 0);
        makeMove(player2, 'A', 0, 1);
        expect(() => makeMove(player1, 'A', 0, 0)).toThrowError(INVALID_MOVE_MESSAGE);
        makeMove(player1, 'A', 1, 0);
        expect(() => makeMove(player2, 'A', 0, 1)).toThrowError(INVALID_MOVE_MESSAGE);
      });

      it("should handle a collision by losing the second player's turn", () => {
        makeMove(player1, 'A', 1, 1);
        makeMove(player2, 'A', 1, 1); // should not error
        expect(game.state.publiclyVisible.A[1][1]).toBe(true);
        // @ts-expect-error - private property
        expect(game._games.A._board[1][1]).toBe('X');
        expect(game.state.moves.length).toBe(2);
        // @ts-expect-error - private property
        expect(game._moveCount).toBe(2);
        makeMove(player1, 'A', 0, 0); // should not error
        // @ts-expect-error - private property
        expect(game._games.A._board[0][0]).toBe('X');
      });

      describe('scoring and game end', () => {
        it('should award a point when a player gets three-in-a-row', () => {
          // X gets a win on board A
          makeMove(player1, 'A', 0, 0); // X
          makeMove(player2, 'B', 0, 0); // O
          makeMove(player1, 'A', 0, 1); // X
          makeMove(player2, 'B', 0, 1); // O
          makeMove(player1, 'A', 0, 2); // X -> scores 1 point

          // @ts-expect-error - private property
          expect(game._xScore).toBe(1);
          // @ts-expect-error - private property
          expect(game._oScore).toBe(0);
        });

        it('should not allow moves on a board that has been won', () => {
          // X wins board A
          makeMove(player1, 'A', 0, 0); // X
          makeMove(player2, 'A', 1, 0); // O
          makeMove(player1, 'A', 0, 1); // X
          makeMove(player2, 'A', 1, 1); // O
          makeMove(player1, 'A', 0, 2); // X -> X wins board A

          // Try to move on board A after it's won
          expect(() => makeMove(player2, 'A', 0, 2)).toThrowError(INVALID_MOVE_MESSAGE);
        });

        it('should end the game when all boards are full or won (X wins)', () => {
          // X wins all boards
          // Board A
          makeMove(player1, 'A', 0, 0); // X
          makeMove(player2, 'A', 1, 0); // O
          makeMove(player1, 'A', 0, 1); // X
          makeMove(player2, 'A', 1, 1); // O
          makeMove(player1, 'A', 0, 2); // X

          // Board B
          makeMove(player2, 'B', 1, 0); // O
          makeMove(player1, 'B', 0, 0); // X
          makeMove(player2, 'B', 1, 1); // O
          makeMove(player1, 'B', 0, 1); // X
          makeMove(player2, 'B', 2, 0); // O
          makeMove(player1, 'B', 0, 2); // X

          // Board C
          makeMove(player2, 'C', 1, 0); // O
          makeMove(player1, 'C', 0, 0); // X
          makeMove(player2, 'C', 1, 1); // O
          makeMove(player1, 'C', 0, 1); // X
          makeMove(player2, 'C', 2, 0); // O
          makeMove(player1, 'C', 0, 2); // X

          // @ts-expect-error - private property
          expect(game._games.A.state.status).toBe('OVER');
          // @ts-expect-error - private property
          expect(game._games.B.state.status).toBe('OVER');
          // @ts-expect-error - private property
          expect(game._games.C.state.status).toBe('OVER');

          expect(game.state.status).toBe('OVER');
          expect(game.state.xScore).toBe(3);
          expect(game.state.oScore).toBe(0);
          expect(game.state.winner).toBe(player1.id);
        });

        it('should end the game when all boards are full or won (O wins)', () => {
          // O wins all boards
          // Board A
          makeMove(player1, 'A', 2, 2); // X
          makeMove(player2, 'A', 0, 0); // O
          makeMove(player1, 'A', 1, 2); // X
          makeMove(player2, 'A', 0, 1); // O
          makeMove(player1, 'A', 2, 1); // X
          makeMove(player2, 'A', 0, 2); // O

          // Board B
          makeMove(player1, 'B', 2, 2); // X
          makeMove(player2, 'B', 1, 0); // O
          makeMove(player1, 'B', 0, 2); // X
          makeMove(player2, 'B', 1, 1); // O
          makeMove(player1, 'B', 2, 1); // X
          makeMove(player2, 'B', 1, 2); // O

          // Board C
          makeMove(player1, 'C', 0, 0); // X
          makeMove(player2, 'C', 2, 0); // O
          makeMove(player1, 'C', 1, 2); // X
          makeMove(player2, 'C', 2, 1); // O
          makeMove(player1, 'C', 0, 2); // X
          makeMove(player2, 'C', 2, 2); // O

          // @ts-expect-error - private property
          expect(game._games.A.state.status).toBe('OVER');
          // @ts-expect-error - private property
          expect(game._games.B.state.status).toBe('OVER');
          // @ts-expect-error - private property
          expect(game._games.C.state.status).toBe('OVER');

          expect(game.state.status).toBe('OVER');
          expect(game.state.xScore).toBe(0);
          expect(game.state.oScore).toBe(3);
          expect(game.state.winner).toBe(player2.id);
        });

        it('should declare a tie if scores are equal at the end', () => {
          // X wins board A, O wins board B, C is filled with no winner
          // Board A
          makeMove(player1, 'A', 2, 2); // X
          makeMove(player2, 'A', 0, 0); // O
          makeMove(player1, 'A', 1, 2); // X
          makeMove(player2, 'A', 0, 1); // O
          makeMove(player1, 'A', 0, 2); // X

          // Board B
          makeMove(player2, 'B', 1, 0); // O
          makeMove(player1, 'B', 2, 2); // X
          makeMove(player2, 'B', 1, 1); // O
          makeMove(player1, 'B', 0, 2); // X
          makeMove(player2, 'B', 1, 2); // O

          // Board C - fill with no winner
          makeMove(player1, 'C', 0, 0); // X top left
          makeMove(player2, 'C', 0, 1); // O top middle
          makeMove(player1, 'C', 0, 2); // X top right
          makeMove(player2, 'C', 1, 2); // O middle right
          makeMove(player1, 'C', 1, 0); // X middle left
          makeMove(player2, 'C', 2, 0); // O bottom left
          makeMove(player1, 'C', 1, 1); // X middle
          makeMove(player2, 'C', 2, 2); // O bottom right
          makeMove(player1, 'C', 2, 1); // X middle bottom

          // @ts-expect-error - private property
          expect(game._games.A.state.status).toBe('OVER');
          // @ts-expect-error - private property
          expect(game._games.B.state.status).toBe('OVER');
          // @ts-expect-error - private property
          expect(game._games.C.state.status).toBe('OVER');

          expect(game.state.status).toBe('OVER');
          expect(game.state.xScore).toBe(1);
          expect(game.state.oScore).toBe(1);
          expect(game.state.winner).toBeUndefined();
        });

        it('should end when a player wins all three boards', () => {
          // X gets a win on board A
          makeMove(player1, 'A', 0, 0); // X
          makeMove(player2, 'B', 0, 0); // O
          makeMove(player1, 'A', 0, 1); // X
          makeMove(player2, 'B', 0, 1); // O
          makeMove(player1, 'A', 0, 2); // X -> scores 1 point

          // X gets a win on board B
          makeMove(player2, 'B', 1, 0); // O
          makeMove(player1, 'B', 0, 2); // X
          makeMove(player2, 'B', 1, 1); // X
          makeMove(player1, 'B', 1, 2); // X
          makeMove(player2, 'C', 0, 0); // X
          makeMove(player1, 'B', 2, 2); // X

          // X gets a win on board C
          makeMove(player2, 'C', 2, 0); // O
          makeMove(player1, 'C', 0, 1); // X
          makeMove(player2, 'C', 1, 2); // X
          makeMove(player1, 'C', 1, 1); // X
          makeMove(player2, 'C', 0, 1); // X
          makeMove(player1, 'C', 2, 1); // X

          expect(game.state.xScore).toBe(3);
          expect(game.state.oScore).toBe(0);
          expect(game.state.status).toBe('OVER');
          expect(game.state.winner).toBe(player1.id);
        });
      });
    });
  });

  describe('a full game from start to finish', () => {
    const makeMove = (player: Player, board: 'A' | 'B' | 'C', row: 0 | 1 | 2, col: 0 | 1 | 2) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const move: GameMove<any> = {
        playerID: player.id,
        gameID: game.id,
        move: { board, row, col },
      };
      game.applyMove(move);
    };

    it('should correctly handle a full game, including collisions, scoring, and a final winner', () => {
      expect(game.state.status).toBe('WAITING_TO_START');

      game.join(player1);
      game.join(player2);

      expect(game.state.x).toBe(player1.id);
      expect(game.state.o).toBe(player2.id);
      expect(game.state.status).toBe('IN_PROGRESS');

      makeMove(player1, 'A', 0, 0); // X
      makeMove(player2, 'A', 1, 0); // O
      makeMove(player1, 'A', 0, 1); // X
      makeMove(player2, 'A', 1, 1); // O
      makeMove(player1, 'A', 0, 2); // X

      // Board B
      makeMove(player2, 'B', 1, 0); // O
      makeMove(player1, 'B', 0, 0); // X
      makeMove(player2, 'B', 1, 1); // O
      makeMove(player1, 'B', 0, 1); // X
      makeMove(player2, 'B', 2, 0); // O
      makeMove(player1, 'B', 0, 2); // X

      // Board C
      makeMove(player2, 'C', 1, 0); // O
      makeMove(player1, 'C', 0, 0); // X
      makeMove(player2, 'C', 1, 1); // O
      makeMove(player1, 'C', 0, 1); // X
      makeMove(player2, 'C', 2, 0); // O
      makeMove(player1, 'C', 0, 2); // X

      // @ts-expect-error - private property
      expect(game._games.A.state.status).toBe('OVER');
      // @ts-expect-error - private property
      expect(game._games.B.state.status).toBe('OVER');
      // @ts-expect-error - private property
      expect(game._games.C.state.status).toBe('OVER');

      expect(game.state.status).toBe('OVER');
      expect(game.state.xScore).toBe(3);
      expect(game.state.oScore).toBe(0);
      expect(game.state.winner).toBe(player1.id);

      game.leave(player1);
      expect(game.state.status).toBe('OVER');
      expect(game.state.winner).toBe(player2.id);
    });
  });
});
