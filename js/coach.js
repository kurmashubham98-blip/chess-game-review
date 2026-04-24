/**
 * Coach Logic Engine — Generates text explanations for moves
 */

class Coach {
  static PIECE_NAMES = {
    'p': 'pawn',
    'n': 'knight',
    'b': 'bishop',
    'r': 'rook',
    'q': 'queen',
    'k': 'king'
  };

  /**
   * Generate a comment for a move
   * @param {Object} move - The chess.js move object
   * @param {Object} cls - The classification object (e.g. MoveClassification.BEST)
   * @param {Object} result - The analysis result object for this move
   * @returns {string} The HTML formatted coach comment
   */
  static generateComment(move, cls, result) {
    if (!move || !cls) return "Here we have the starting position. Let's see how the game develops.";

    const pieceName = this.PIECE_NAMES[move.piece];
    let comment = '';
    
    // Check for missed mate
    const missedMate = this._checkMissedMate(result);

    // Format best move string
    let bestMoveText = '';
    if (result && result.bestMove && result.bestMove !== (move.from + move.to)) {
      bestMoveText = ` <span class="coach-suggestion">The engine prefers ${this._formatUCIMove(result.bestMove, move.fenBefore)}.</span>`;
    }

    switch (cls.name) {
      case 'Brilliant':
        comment = `Brilliant! A fantastic sacrifice involving your ${pieceName} that leads to a strong advantage.`;
        break;
      
      case 'Great':
        comment = `Great move! This changes the course of the game and significantly improves your position.`;
        break;

      case 'Best':
        if (move.captured) {
          comment = `This is the best move. You correctly capture the opponent's ${this.PIECE_NAMES[move.captured]}.`;
        } else if (move.flags.includes('k') || move.flags.includes('q')) {
          comment = `This is the best move. Castling gets the king to safety and connects the rooks.`;
        } else if (move.flags.includes('p')) {
          comment = `This is the best move. Promoting the pawn yields a significant material advantage.`;
        } else {
          comment = `This is the best move. It improves the position of your ${pieceName}.`;
        }
        break;

      case 'Excellent':
        comment = `Excellent move. It develops the ${pieceName} and maintains a solid position.`;
        break;

      case 'Good':
        comment = `This is a good, solid move.`;
        break;

      case 'Book':
        comment = `This is a known theoretical opening move.`;
        break;

      case 'Inaccuracy':
        if (move.captured) {
          comment = `Capturing that piece is slightly inaccurate.`;
        } else {
          comment = `This is an inaccuracy. Moving the ${pieceName} here is not optimal.`;
        }
        comment += bestMoveText;
        break;

      case 'Mistake':
        comment = `This is a mistake that loses some of your advantage.`;
        comment += bestMoveText;
        break;

      case 'Miss':
        if (missedMate) {
          comment = `You missed an opportunity to force checkmate!`;
        } else {
          comment = `This is a missed opportunity. You failed to capitalize on the opponent's previous mistake.`;
        }
        comment += bestMoveText;
        break;

      case 'Blunder':
        if (missedMate) {
          comment = `This is a blunder. You missed a forced mate sequence!`;
        } else if (move.captured) {
          comment = `This capture is a blunder that severely weakens your position.`;
        } else {
          comment = `This is a blunder that gives away a significant advantage.`;
        }
        comment += bestMoveText;
        break;

      default:
        comment = `An interesting move.`;
    }

    return comment;
  }

  /**
   * Helper to format a UCI move string (e.g. "e2e4") to standard SAN if possible,
   * or at least make it readable.
   */
  static _formatUCIMove(uciMove, fenBefore) {
    if (!uciMove || uciMove.length < 4) return '';
    
    try {
      // Use chess.js to get the SAN representation if we have the global instance
      if (typeof window !== 'undefined' && window.Chess) {
        const tempChess = new window.Chess(fenBefore);
        const from = uciMove.substring(0, 2);
        const to = uciMove.substring(2, 4);
        const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
        
        const moveObj = tempChess.move({ from, to, promotion });
        if (moveObj) {
          return moveObj.san;
        }
      }
    } catch (e) {
      // Ignore errors and fallback
    }

    // Fallback: just return the square coordinates
    return uciMove.substring(0, 2) + '-' + uciMove.substring(2, 4);
  }

  /**
   * Helper to check if a mate was missed
   */
  static _checkMissedMate(result) {
    if (!result) return false;
    
    // If the best move leads to mate, but the evaluation after our move does not lead to mate
    // or leads to a much worse mate, it's a missed mate.
    
    // This is a simplified check
    if (result.bestMoveEval && result.bestMoveEval.mate !== undefined) {
      const bestMate = result.bestMoveEval.mate;
      
      // If we had a mate in X, but the eval after is just centipawns or a worse mate
      if (bestMate > 0) {
        if (result.evalAfterFromWhite !== undefined) {
          // If the eval after is a number (centipawns) or a mate that's negative (opponent mating us)
          return true;
        }
      } else if (bestMate < 0 && result.color === 'b') {
        // Black's perspective: bestMate < 0 means mate for Black
        return true; // Simplified: assume it was missed if classification is Miss/Blunder
      }
    }
    return false;
  }
}
