/**
 * Analysis Controller — Manages Stockfish Web Worker and per-move analysis
 */

class AnalysisController {
  constructor() {
    this.engine = null;
    this.isReady = false;
    this.isAnalyzing = false;
    this.analysisDepth = 18;
    this.currentResolve = null;
    this.currentInfo = {};
    this.abortRequested = false;
  }

  /**
   * Initialize the Stockfish engine web worker
   */
  async init() {
    return new Promise((resolve, reject) => {
      try {
        const workerUrl = chrome.runtime.getURL('engine/stockfish-18-lite-single.js');
        this.engine = new Worker(workerUrl);
        
        this.engine.onmessage = (event) => {
          this._handleMessage(event.data);
        };

        this.engine.onerror = (error) => {
          console.error('Stockfish worker error:', error);
          reject(error);
        };

        // Wait for engine to be ready
        this._waitingForReady = resolve;
        this.engine.postMessage('uci');
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Handle messages from the Stockfish worker
   */
  _handleMessage(data) {
    if (typeof data !== 'string') return;
    const line = data.trim();

    // Engine ready
    if (line === 'uciok') {
      this.engine.postMessage('isready');
      return;
    }

    if (line === 'readyok') {
      this.isReady = true;
      if (this._waitingForReady) {
        this._waitingForReady();
        this._waitingForReady = null;
      }
      if (this._readyResolve) {
        this._readyResolve();
        this._readyResolve = null;
      }
      return;
    }

    // Parse info lines during analysis
    if (line.startsWith('info') && line.includes('score')) {
      this._parseInfoLine(line);
    }

    // Best move found
    if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const bestMove = parts[1];
      if (this.currentResolve) {
        const result = {
          bestMove: bestMove,
          eval: { ...this.currentInfo.score },
          depth: this.currentInfo.depth || 0,
          pv: this.currentInfo.pv || [],
          nodes: this.currentInfo.nodes || 0,
        };
        this.currentResolve(result);
        this.currentResolve = null;
      }
    }
  }

  /**
   * Parse a UCI info line
   */
  _parseInfoLine(line) {
    const parts = line.split(' ');
    const info = {};

    for (let i = 0; i < parts.length; i++) {
      switch (parts[i]) {
        case 'depth':
          info.depth = parseInt(parts[i + 1]);
          break;
        case 'score':
          if (parts[i + 1] === 'cp') {
            info.score = { cp: parseInt(parts[i + 2]) };
          } else if (parts[i + 1] === 'mate') {
            info.score = { mate: parseInt(parts[i + 2]) };
          }
          break;
        case 'nodes':
          info.nodes = parseInt(parts[i + 1]);
          break;
        case 'pv':
          info.pv = parts.slice(i + 1);
          break;
        case 'multipv':
          info.multipv = parseInt(parts[i + 1]);
          break;
      }
    }

    // Only update for the primary variation (multipv 1 or no multipv)
    if (!info.multipv || info.multipv === 1) {
      if (info.depth) this.currentInfo.depth = info.depth;
      if (info.score) this.currentInfo.score = info.score;
      if (info.pv) this.currentInfo.pv = info.pv;
      if (info.nodes) this.currentInfo.nodes = info.nodes;
    }
  }

  /**
   * Analyze a single position
   * @param {string} fen - FEN string of the position
   * @param {number} depth - analysis depth
   * @returns {Promise<Object>} analysis result
   */
  async analyzePosition(fen, depth) {
    if (!this.isReady) throw new Error('Engine not ready');

    return new Promise((resolve) => {
      this.currentResolve = resolve;
      this.currentInfo = {};
      this.engine.postMessage('ucinewgame');
      this.engine.postMessage(`position fen ${fen}`);
      this.engine.postMessage(`go depth ${depth || this.analysisDepth}`);
    });
  }

  /**
   * Wait for engine to be ready
   */
  async waitReady() {
    return new Promise((resolve) => {
      this._readyResolve = resolve;
      this.engine.postMessage('isready');
    });
  }

  /**
   * Analyze a full game
   * @param {Array} moves - array of { san, fen, moveObj } for each move
   * @param {Function} onProgress - callback(moveIndex, totalMoves, currentResult)
   * @returns {Promise<Array>} array of analysis results per move
   */
  async analyzeGame(moves, onProgress) {
    if (this.isAnalyzing) throw new Error('Already analyzing');
    this.isAnalyzing = true;
    this.abortRequested = false;

    const results = [];
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    try {
      for (let i = 0; i < moves.length; i++) {
        if (this.abortRequested) break;

        const move = moves[i];
        const fenBefore = i === 0 ? startFen : moves[i - 1].fenAfter;
        
        // Analyze position BEFORE the move was played (what was the best move?)
        await this.waitReady();
        const analysis = await this.analyzePosition(fenBefore, this.analysisDepth);

        // Adjust eval to always be from White's perspective
        let evalFromWhite;
        if (analysis.eval) {
          if (analysis.eval.cp !== undefined) {
            // Stockfish reports eval from the side to move
            evalFromWhite = move.color === 'w' ? analysis.eval.cp : -analysis.eval.cp;
          } else if (analysis.eval.mate !== undefined) {
            evalFromWhite = move.color === 'w' ? analysis.eval.mate : -analysis.eval.mate;
          }
        }

        const result = {
          moveIndex: i,
          san: move.san,
          color: move.color,
          fenBefore: fenBefore,
          fenAfter: move.fenAfter,
          bestMove: analysis.bestMove,
          bestMoveEval: analysis.eval ? { ...analysis.eval } : { cp: 0 },
          depth: analysis.depth,
          pv: analysis.pv,
          evalFromWhite: evalFromWhite,
          // We need the eval AFTER the move, so we'll get it from the next position analysis
          // or from the current one adjusted
        };

        results.push(result);

        if (onProgress) {
          onProgress(i, moves.length, result);
        }
      }

      // Now analyze the final position to get the eval after the last move
      if (moves.length > 0 && !this.abortRequested) {
        const lastMove = moves[moves.length - 1];
        await this.waitReady();
        const finalAnalysis = await this.analyzePosition(lastMove.fenAfter, this.analysisDepth);
        
        // Store as a special "final position" entry
        let finalEvalFromWhite;
        if (finalAnalysis.eval) {
          const sideToMove = lastMove.color === 'w' ? 'b' : 'w';
          if (finalAnalysis.eval.cp !== undefined) {
            finalEvalFromWhite = sideToMove === 'w' ? finalAnalysis.eval.cp : -finalAnalysis.eval.cp;
          } else if (finalAnalysis.eval.mate !== undefined) {
            finalEvalFromWhite = sideToMove === 'w' ? finalAnalysis.eval.mate : -finalAnalysis.eval.mate;
          }
        }
        results.push({
          isFinalPosition: true,
          fenAfter: lastMove.fenAfter,
          bestMoveEval: finalAnalysis.eval ? { ...finalAnalysis.eval } : { cp: 0 },
          evalFromWhite: finalEvalFromWhite,
        });
      }

      // Now compute evalAfter for each move using the NEXT position's eval
      for (let i = 0; i < results.length - 1; i++) {
        if (results[i].isFinalPosition) continue;
        const nextResult = results[i + 1];
        if (nextResult) {
          // The eval after our move = the best eval from the position our move created
          // But from the moving side's perspective (negated because it's opponent's turn)
          if (nextResult.bestMoveEval) {
            if (nextResult.bestMoveEval.cp !== undefined) {
              const cpFromNextSide = nextResult.bestMoveEval.cp;
              // next side is opposite of current mover
              results[i].evalAfterFromWhite = results[i].color === 'w' ? -cpFromNextSide : cpFromNextSide;
            } else if (nextResult.bestMoveEval.mate !== undefined) {
              const mateFromNextSide = nextResult.bestMoveEval.mate;
              results[i].evalAfterFromWhite = results[i].color === 'w' ? -mateFromNextSide : mateFromNextSide;
            }
          }
        }
      }

      return results;
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Abort current analysis
   */
  abort() {
    this.abortRequested = true;
    if (this.engine) {
      this.engine.postMessage('stop');
    }
  }

  /**
   * Destroy the engine
   */
  destroy() {
    if (this.engine) {
      this.engine.postMessage('quit');
      this.engine.terminate();
      this.engine = null;
    }
    this.isReady = false;
  }
}
