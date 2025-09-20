import { createPlayerForTesting } from '../../TestUtils';
import Player from '../../lib/Player';
import { GameMove } from '../../types/CoveyTownSocket';
import QuantumTicTacToeGame from './QuantumTicTacToeGame';
import {
  PLAYER_NOT_IN_GAME_MESSAGE,
  BOARD_POSITION_NOT_EMPTY_MESSAGE,
  PLAYER_ALREADY_IN_GAME_MESSAGE,
  GAME_FULL_MESSAGE,
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
      expect(game.state.status).toBe('WAITING_TO_START');
    });
    describe('when two players join the game', () => {
      beforeEach(() => {
        game.join(player1);
        game.join(player2);
      });
      it('should add the first player as X and the second player as O', () => {
        expect(game.state.x).toBe(player1.id);
        expect(game.state.o).toBe(player2.id);
        expect(game.state.status).toBe('IN_PROGRESS');
      });
      it('should error if the same player joins', () => {
        expect(() => game.join(player1)).toThrowError(PLAYER_ALREADY_IN_GAME_MESSAGE);
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
      });
    });
    describe('when two players are in the game and player 2 leaves first', () => {
      beforeEach(() => {
        game.join(player1);
        game.join(player2);
      });

      it('should set the game to OVER and declare the player1 the winner', () => {
        game.leave(player2);
        expect(game.state.status).toBe('OVER');
        expect(game.state.winner).toBe(player1.id);
      });
    });
    describe('when one player is in the game', () => {
      beforeEach(() => {
        game.join(player1);
      });

      it('should set the game to WAITING_TO_START and reset the scores', () => {
        game.leave(player1);
        expect(game.state.status).toBe('WAITING_TO_START');
        expect(game.state.xScore).toBe(0);
        expect(game.state.oScore).toBe(0);
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
    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });

    const makeMove = (player: Player, board: 'A' | 'B' | 'C', row: 0 | 1 | 2, col: 0 | 1 | 2) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const move: GameMove<any> = {
        playerID: player.id,
        gameID: game.id,
        move: { board, row, col },
      };
      game.applyMove(move);
    };

    it('should place a piece on an empty square', () => {
      makeMove(player1, 'A', 0, 0);
      // @ts-expect-error - private property
      expect(game._games.A._board[0][0]).toBe('X');
      expect(game.state.moves.length).toBe(1);
    });

    describe('scoring and game end', () => {
      it('should award a point when a player gets three-in-a-row', () => {
        // X gets a win on board A
        makeMove(player1, 'A', 0, 0); // X
        makeMove(player2, 'B', 0, 0); // O
        makeMove(player1, 'A', 0, 1); // X
        makeMove(player2, 'B', 0, 1); // O
        makeMove(player1, 'A', 0, 2); // X -> scores 1 point

        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(0);
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
    it('should throw an error if a move is made on a tile that was made public', () => {
      makeMove(player1, 'A', 0, 0);
      makeMove(player2, 'A', 0, 0); // should not error
      expect(() => makeMove(player1, 'A', 0, 0)).toThrowError(BOARD_POSITION_NOT_EMPTY_MESSAGE);
    });
  });
});
