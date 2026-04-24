/**
 * Move Classifier — Replicates chess.com's Expected Points Model
 * Classifies moves as Brilliant/Great/Best/Excellent/Good/Book/Inaccuracy/Mistake/Blunder/Miss
 */

const MoveClassification = {
  BRILLIANT:   { name: 'Brilliant',   symbol: '!!', color: '#26C2A3', priority: 0 },
  GREAT:       { name: 'Great',       symbol: '!',  color: '#749BBF', priority: 1 },
  BEST:        { name: 'Best',        symbol: '★',  color: '#81B64C', priority: 2 },
  EXCELLENT:   { name: 'Excellent',   symbol: '',   color: '#81B64C', priority: 3 },
  GOOD:        { name: 'Good',        symbol: '',   color: '#95B776', priority: 4 },
  BOOK:        { name: 'Book',        symbol: '📖', color: '#D2A032', priority: 5 },
  INACCURACY:  { name: 'Inaccuracy',  symbol: '?!', color: '#F7C631', priority: 6 },
  MISTAKE:     { name: 'Mistake',     symbol: '?',  color: '#FFA459', priority: 7 },
  MISS:        { name: 'Miss',        symbol: '✕',  color: '#DBAC16', priority: 8 },
  BLUNDER:     { name: 'Blunder',     symbol: '??', color: '#FA412D', priority: 9 },
};

/**
 * Convert centipawn evaluation to win probability (0.0 to 1.0)
 * Uses the logistic curve model
 */
function cpToWinProbability(cp) {
  if (cp === null || cp === undefined) return 0.5;
  return 1 / (1 + Math.pow(10, -cp / 400));
}

/**
 * Convert mate score to effective centipawn value
 */
function mateToCP(mateIn) {
  if (mateIn > 0) return 10000 - (mateIn * 10);
  if (mateIn < 0) return -10000 - (mateIn * 10);
  return 0;
}

/**
 * Get effective centipawn value from an evaluation object
 * @param {Object} eval - { cp: number } or { mate: number }
 * @returns {number} centipawn value
 */
function getEffectiveCP(evalObj) {
  if (!evalObj) return 0;
  if (evalObj.mate !== undefined && evalObj.mate !== null) {
    return mateToCP(evalObj.mate);
  }
  return evalObj.cp || 0;
}

/**
 * Check if a move involves a material sacrifice
 * @param {Object} moveInfo - chess.js verbose move object
 * @param {Object} chess - chess.js instance at position BEFORE the move
 */
function isSacrifice(moveInfo, positionBeforeFen, Chess) {
  if (!moveInfo) return false;
  
  // Piece values
  const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  
  // Check if the piece moved is captured or the destination is attacked by opponent
  // Simple heuristic: piece captures a lower-value piece or moves to an attacked square
  const movingPieceValue = pieceValues[moveInfo.piece] || 0;
  const capturedPieceValue = moveInfo.captured ? (pieceValues[moveInfo.captured] || 0) : 0;
  
  // If we captured a piece of lesser value, check if the square is defended
  if (moveInfo.captured) {
    // Simple sacrifice: giving up more material than we take
    if (movingPieceValue > capturedPieceValue + 1) {
      return true;
    }
  }
  
  // Check for unprotected piece moves to attacked squares
  // This is a simplification — in practice you'd want to do SEE (Static Exchange Evaluation)
  if (movingPieceValue >= 3 && !moveInfo.captured) {
    // Knight or bishop moving without capture could be a sacrifice
    // We'll check this in context with the eval
    try {
      const tempChess = new Chess(positionBeforeFen);
      tempChess.move(moveInfo.san);
      // Check if the piece on the destination square is attacked
      const attacks = tempChess.moves({ verbose: true }).filter(m => m.to === moveInfo.to);
      if (attacks.length > 0) {
        return true; // Opponent can capture our piece
      }
    } catch (e) {
      // Ignore errors in sacrifice detection
    }
  }
  
  return false;
}

/**
 * Classify a single move based on the Expected Points Model
 * 
 * @param {Object} params
 * @param {number} params.evalBeforeCP - centipawn eval before the move (from moving side's perspective)
 * @param {number} params.evalAfterCP - centipawn eval after the move (from moving side's perspective)
 * @param {number} params.bestMoveEvalCP - eval of the best move (from moving side's perspective)
 * @param {boolean} params.isBestMove - whether this was the engine's top choice
 * @param {boolean} params.isSacrifice - whether the move involves a sacrifice
 * @param {boolean} params.isBook - whether this is a known opening book move
 * @param {string} params.color - 'w' or 'b'
 * @param {number} params.prevEvalCP - eval from the PREVIOUS move (opponent's last eval, for Miss detection)
 * @param {number} params.prevBestEvalCP - best eval from the previous position
 * @returns {Object} MoveClassification entry
 */
function classifyMove(params) {
  const {
    evalBeforeCP,
    evalAfterCP,
    bestMoveEvalCP,
    isBestMove,
    isSacrificeMove,
    isBook,
    color,
    prevEvalCP,
    prevBestEvalCP
  } = params;

  // Book moves
  if (isBook) {
    return MoveClassification.BOOK;
  }

  // Calculate expected points before and after
  const epBefore = cpToWinProbability(evalBeforeCP);
  const epAfter = cpToWinProbability(evalAfterCP);
  const epBest = cpToWinProbability(bestMoveEvalCP);
  
  // Expected points loss
  const epLoss = epBest - epAfter;

  // --- Brilliant Detection ---
  if (
    isSacrificeMove &&
    epLoss <= 0.02 &&
    evalBeforeCP < 600 &&       // Not already completely winning
    evalAfterCP >= evalBeforeCP - 50  // Doesn't weaken position significantly
  ) {
    return MoveClassification.BRILLIANT;
  }

  // --- Great Move Detection ---
  // Turning losing into equal, or equal into winning
  const wasLosing = evalBeforeCP < -100;
  const wasEqual = evalBeforeCP >= -100 && evalBeforeCP <= 100;
  const isNowWinning = evalAfterCP > 100;
  const isNowEqual = evalAfterCP >= -100 && evalAfterCP <= 100;
  
  if (
    isBestMove &&
    ((wasLosing && isNowEqual) || (wasLosing && isNowWinning) || (wasEqual && isNowWinning)) &&
    epLoss <= 0.02
  ) {
    return MoveClassification.GREAT;
  }

  // --- Miss Detection ---
  // Opponent made a mistake/blunder on their last move, and we didn't capitalize
  if (prevEvalCP !== undefined && prevBestEvalCP !== undefined) {
    const opponentEPLoss = cpToWinProbability(-prevBestEvalCP) - cpToWinProbability(-prevEvalCP);
    if (opponentEPLoss > 0.10 && epLoss > 0.05) {
      return MoveClassification.MISS;
    }
  }

  // --- Standard Classifications based on EP Loss ---
  if (epLoss <= 0.0001 || isBestMove) {
    return MoveClassification.BEST;
  }
  if (epLoss <= 0.02) {
    return MoveClassification.EXCELLENT;
  }
  if (epLoss <= 0.05) {
    return MoveClassification.GOOD;
  }
  if (epLoss <= 0.10) {
    return MoveClassification.INACCURACY;
  }
  if (epLoss <= 0.20) {
    return MoveClassification.MISTAKE;
  }
  
  return MoveClassification.BLUNDER;
}

/**
 * Calculate accuracy for a single move
 * Approximation of chess.com's CAPS formula
 */
function calculateMoveAccuracy(cpLoss) {
  const absCPLoss = Math.abs(cpLoss);
  const accuracy = 103.1668 * Math.exp(-0.04354 * absCPLoss) - 3.1668;
  return Math.max(0, Math.min(100, accuracy));
}

/**
 * Calculate game accuracy using harmonic mean of move accuracies
 */
function calculateGameAccuracy(moveAccuracies) {
  if (!moveAccuracies || moveAccuracies.length === 0) return 0;
  
  // Filter out zeros to avoid division by zero in harmonic mean
  const filtered = moveAccuracies.filter(a => a > 0);
  if (filtered.length === 0) return 0;
  
  // Use a weighted average (chess.com likely uses something similar)
  const sum = filtered.reduce((acc, val) => acc + val, 0);
  return sum / filtered.length;
}
