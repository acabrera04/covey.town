import {
  GameMove,
  QuantumTicTacToeGameState,
  QuantumTicTacToeMove,
} from '../../types/CoveyTownSocket';
import InvalidParametersError, {
  GAME_FULL_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
  BOARD_POSITION_NOT_EMPTY_MESSAGE,
  MOVE_NOT_YOUR_TURN_MESSAGE,
  PLAYER_ALREADY_IN_GAME_MESSAGE,
  PLAYER_NOT_IN_GAME_MESSAGE,
} from '../../lib/InvalidParametersError';
import Game from './Game';
import TicTacToeGame from './TicTacToeGame';
import Player from '../../lib/Player';

/**
 * A QuantumTicTacToeGame is a Game that implements the rules of the Tic-Tac-Toe variant described at https://www.smbc-comics.com/comic/tic.
 * This class acts as a controller for three underlying TicTacToeGame instances, orchestrating the "quantum" rules by taking
 * the role of the monitor.
 */
export default class QuantumTicTacToeGame extends Game<
  QuantumTicTacToeGameState,
  QuantumTicTacToeMove
> {
  private _games: { A: TicTacToeGame; B: TicTacToeGame; C: TicTacToeGame };

  private _gamesWon: { A: boolean; B: boolean; C: boolean };

  private _xScore: number;

  private _oScore: number;

  private _moveCount: number;

  public constructor() {
    // TODO: implement me
    super({
      moves: [],
      xScore: 0,
      oScore: 0,
      publiclyVisible: {
        A: [
          [false, false, false],
          [false, false, false],
          [false, false, false],
        ],
        B: [
          [false, false, false],
          [false, false, false],
          [false, false, false],
        ],
        C: [
          [false, false, false],
          [false, false, false],
          [false, false, false],
        ],
      },
      status: 'WAITING_TO_START',
    });
    this._xScore = 0;
    this._oScore = 0;
    this._moveCount = 0;
    this._games = {
      A: new TicTacToeGame(),
      B: new TicTacToeGame(),
      C: new TicTacToeGame(),
    };
    this._gamesWon = {
      A: false,
      B: false,
      C: false,
    };
  }

  protected _join(player: Player): void {
    // TODO: implement me
    if (this.state.x === player.id || this.state.o === player.id) {
      throw new InvalidParametersError(PLAYER_ALREADY_IN_GAME_MESSAGE);
    }
    if (!this.state.x) {
      this.state = {
        ...this.state,
        x: player.id,
      };
    } else if (!this.state.o) {
      this.state = {
        ...this.state,
        o: player.id,
      };
    } else {
      throw new InvalidParametersError(GAME_FULL_MESSAGE);
    }
    this._games.A.join(player);
    this._games.B.join(player);
    this._games.C.join(player);
    if (this.state.x && this.state.o) {
      this.state = {
        ...this.state,
        status: 'IN_PROGRESS',
      };
    }
  }

  protected _leave(player: Player): void {
    // TODO: implement me
    if (this.state.x !== player.id && this.state.o !== player.id) {
      throw new InvalidParametersError(PLAYER_NOT_IN_GAME_MESSAGE);
    }
    this._games.A.leave(player);
    this._games.B.leave(player);
    this._games.C.leave(player);
    // Handles case where the game has not started yet or both players leave
    if (this.state.o === undefined) {
      // code is repeated with constructor, so find a way to reduce
      this.state = {
        moves: [],
        xScore: 0,
        oScore: 0,
        publiclyVisible: {
          A: [
            [false, false, false],
            [false, false, false],
            [false, false, false],
          ],
          B: [
            [false, false, false],
            [false, false, false],
            [false, false, false],
          ],
          C: [
            [false, false, false],
            [false, false, false],
            [false, false, false],
          ],
        },
        status: 'WAITING_TO_START',
      };
      this._xScore = 0;
      this._oScore = 0;
      this._moveCount = 0;
      this._games = {
        A: new TicTacToeGame(),
        B: new TicTacToeGame(),
        C: new TicTacToeGame(),
      };
      this._gamesWon = {
        A: false,
        B: false,
        C: false,
      };
      return;
    }
    if (this.state.x === player.id) {
      this.state = {
        ...this.state,
        status: 'OVER',
        winner: this.state.o,
      };
    } else {
      this.state = {
        ...this.state,
        status: 'OVER',
        winner: this.state.x,
      };
    }
  }

  /**
   * Checks that the given move is "valid": that the it's the right
   * player's turn, that the game is actually in-progress, etc.
   * @see TicTacToeGame#_validateMove
   */
  private _validateMove(move: GameMove<QuantumTicTacToeMove>): void {
    // A move is only valid if the public space is false
    if (this.state.publiclyVisible[move.move.board][move.move.row][move.move.col]) {
      throw new InvalidParametersError(BOARD_POSITION_NOT_EMPTY_MESSAGE);
    }
    // A move is only valid if it is the player's turn
    if (move.move.gamePiece === 'X' && this.state.moves.length % 2 === 1) {
      throw new InvalidParametersError(MOVE_NOT_YOUR_TURN_MESSAGE);
    } else if (move.move.gamePiece === 'O' && this.state.moves.length % 2 === 0) {
      throw new InvalidParametersError(MOVE_NOT_YOUR_TURN_MESSAGE);
    }
    // A move is valid only if game is in progress
    if (this.state.status !== 'IN_PROGRESS') {
      throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
    }
  }

  public applyMove(move: GameMove<QuantumTicTacToeMove>): void {
    this._validateMove(move);

    try {
      this._games[move.move.board].applyMove(move, true);
      this._moveCount++;
      this.state = {
        ...this.state,
        moves: [...this.state.moves, move.move],
      };
    } catch (e) {
      // If a player makes a move on a square that's already occupied or the board is over, they lose their turn (so don't error)
      // and that square is revealed on the public board
      if (
        e instanceof InvalidParametersError &&
        (e.message === BOARD_POSITION_NOT_EMPTY_MESSAGE ||
          this._games[move.move.board].state.status === 'OVER')
      ) {
        // copying the array for updating https://bobbyhadz.com/blog/typescript-array-deep-copy#create-a-deep-copy-of-an-array-in-typescript
        const newPubliclyVisible = JSON.parse(JSON.stringify(this.state.publiclyVisible));
        if (e.message === BOARD_POSITION_NOT_EMPTY_MESSAGE) {
          newPubliclyVisible[move.move.board][move.move.row][move.move.col] = true;
        }
        this._moveCount++;
        this.state = {
          ...this.state,
          publiclyVisible: newPubliclyVisible,
          // have to figure out a way to not have the actual move added
          moves: [...this.state.moves, move.move],
        };
      } else {
        throw e;
      }
    }
    this._checkForWins();
    this._checkForGameEnding();
  }

  private _checkForWinsHelper(board: 'A' | 'B' | 'C'): boolean {
    const gameBoard = this._games[board];
    if (gameBoard.state.status === 'OVER') {
      if (!this._gamesWon[board]) {
        this._gamesWon[board] = true;
        if (gameBoard.state.winner === this.state.x) {
          this._xScore++;
          this.state = {
            ...this.state,
            xScore: this._xScore,
          };
        } else {
          this._oScore++;
          this.state = {
            ...this.state,
            oScore: this._oScore,
          };
        }
      }
      return true;
    }
    return false;
  }

  /**
   * Checks all three sub-games for any new three-in-a-row conditions.
   * Awards points and marks boards as "won" so they can't be played on.
   */
  private _checkForWins(): void {
    // TODO: implement me
    this._checkForWinsHelper('A');
    this._checkForWinsHelper('B');
    this._checkForWinsHelper('C');
  }

  /**
   * A Quantum Tic-Tac-Toe game ends when no more moves are possible.
   * This happens when all squares on all boards are either occupied or part of a won board.
   */
  private _checkForGameEnding(): void {
    // TODO: implement me
    if (
      this._checkForWinsHelper('A') &&
      this._checkForWinsHelper('B') &&
      this._checkForWinsHelper('C')
    ) {
      if (this._xScore === this._oScore) {
        this.state = {
          ...this.state,
          status: 'OVER',
          winner: undefined,
        };
      } else {
        this.state = {
          ...this.state,
          status: 'OVER',
          winner: this._xScore > this._oScore ? this.state.x : this.state.o,
        };
      }
    }
  }
}
