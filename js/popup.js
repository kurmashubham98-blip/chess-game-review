/**
 * Popup.js — Main UI Controller for Chess Game Review Extension
 */

// ===== Sample PGNs =====
const SAMPLE_PGNS = {
  immortal: `[Event "London"]\n[Site "London"]\n[Date "1851.06.21"]\n[White "Adolf Anderssen"]\n[Black "Lionel Kieseritzky"]\n[Result "1-0"]\n\n1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7# 1-0`,
  opera: `[Event "Paris"]\n[Site "Paris"]\n[Date "1858.??.??"]\n[White "Paul Morphy"]\n[Black "Duke Karl / Count Isouard"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`,
  evergreen: `[Event "Berlin"]\n[Site "Berlin"]\n[Date "1852.??.??"]\n[White "Adolf Anderssen"]\n[Black "Jean Dufresne"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O d3 8. Qb3 Qf6 9. e5 Qg6 10. Re1 Nge7 11. Ba3 b5 12. Qxb5 Rb8 13. Qa4 Bb6 14. Nbd2 Bb7 15. Ne4 Qf5 16. Bxd3 Qh5 17. Nf6+ gxf6 18. exf6 Rg8 19. Rad1 Qxf3 20. Rxe7+ Nxe7 21. Qxd7+ Kxd7 22. Bf5+ Ke8 23. Bd7+ Kf8 24. Bxe7# 1-0`
};

// ===== ECO Opening Book (compact) =====
const ECO_BOOK = {
  "1.e4 e5 2.Nf3 Nc6 3.Bb5": "Ruy Lopez",
  "1.e4 e5 2.Nf3 Nc6 3.Bc4": "Italian Game",
  "1.e4 e5 2.Nf3 Nc6 3.d4": "Scotch Game",
  "1.e4 e5 2.Nf3 Nf6": "Petrov's Defense",
  "1.e4 e5 2.Nf3 d6": "Philidor Defense",
  "1.e4 c5": "Sicilian Defense",
  "1.e4 e6": "French Defense",
  "1.e4 c6": "Caro-Kann Defense",
  "1.e4 d5": "Scandinavian Defense",
  "1.e4 e5 2.f4": "King's Gambit",
  "1.d4 d5 2.c4": "Queen's Gambit",
  "1.d4 Nf6 2.c4 g6": "King's Indian Defense",
  "1.d4 Nf6 2.c4 e6": "Nimzo-Indian / Queen's Indian",
  "1.d4 d5": "Queen's Pawn Game",
  "1.d4 Nf6": "Indian Defense",
  "1.c4": "English Opening",
  "1.Nf3": "Reti Opening",
  "1.e4 e5": "Open Game",
  "1.e4 e5 2.Nf3 Nc6": "King's Knight Opening",
  "1.d4 d5 2.c4 e6": "Queen's Gambit Declined",
  "1.d4 d5 2.c4 dxc4": "Queen's Gambit Accepted",
  "1.e4 d6 2.d4 Nf6 3.Nc3 g6": "Pirc Defense",
};

// ===== App State =====
let analysisController = null;
let board = null;
let evalGraph = null;
let gameData = {
  moves: [],        // { san, color, fenBefore, fenAfter, moveObj }
  results: [],      // analysis results per move
  classifications: [],
  whiteAccuracy: 0,
  blackAccuracy: 0,
  whiteName: 'White',
  blackName: 'Black',
  opening: '',
  startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
};
let currentMoveIndex = -1; // -1 = starting position

// ===== DOM Elements =====
const $ = (id) => document.getElementById(id);

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadSettings();
});

function loadSettings() {
  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['geminiApiKey'], (result) => {
      if (result.geminiApiKey) {
        $('api-key-input').value = result.geminiApiKey;
        aiCoach.setApiKey(result.geminiApiKey);
      } else {
        // Leave blank for new users, they can input their own if they want
        $('api-key-input').value = "";
      }
    });
  }
}

function saveSettings() {
  const key = $('api-key-input').value.trim();
  aiCoach.setApiKey(key || null);
  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ geminiApiKey: key }, () => {
      const btn = $('btn-save-settings');
      btn.textContent = "Saved!";
      btn.style.background = "var(--accent-green)";
      btn.style.color = "#fff";
      setTimeout(() => {
        btn.textContent = "Save Settings";
        btn.style.background = "";
        btn.style.color = "";
      }, 2000);
    });
  }
}

function setupEventListeners() {
  $('btn-analyze').addEventListener('click', startAnalysis);
  $('btn-new-game').addEventListener('click', showPGNInput);
  $('btn-flip').addEventListener('click', () => board && board.flip());
  $('btn-settings').addEventListener('click', toggleSettings);
  $('btn-save-settings').addEventListener('click', saveSettings);
  $('btn-first').addEventListener('click', () => goToMove(-1));
  $('btn-prev').addEventListener('click', () => goToMove(currentMoveIndex - 1));
  $('btn-next').addEventListener('click', () => goToMove(currentMoveIndex + 1));
  $('btn-last').addEventListener('click', () => goToMove(gameData.moves.length - 1));

  // Sample PGNs
  $('sample-immortal').addEventListener('click', () => {
    $('pgn-textarea').value = SAMPLE_PGNS.immortal;
  });
  $('sample-opera').addEventListener('click', () => {
    $('pgn-textarea').value = SAMPLE_PGNS.opera;
  });
  $('sample-evergreen').addEventListener('click', () => {
    $('pgn-textarea').value = SAMPLE_PGNS.evergreen;
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if ($('review-screen').classList.contains('active')) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goToMove(currentMoveIndex - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goToMove(currentMoveIndex + 1); }
      if (e.key === 'Home') { e.preventDefault(); goToMove(-1); }
      if (e.key === 'End') { e.preventDefault(); goToMove(gameData.moves.length - 1); }
    }
  });

  // Close settings on outside click
  document.addEventListener('click', (e) => {
    const sp = $('settings-popover');
    if (!sp.classList.contains('hidden') && !sp.contains(e.target) && e.target.id !== 'btn-settings') {
      sp.classList.add('hidden');
    }
  });
}

function toggleSettings() {
  $('settings-popover').classList.toggle('hidden');
}

function showPGNInput() {
  $('pgn-input-screen').style.display = 'flex';
  $('analysis-progress').classList.remove('active');
  $('review-screen').classList.remove('active');
  if (analysisController) {
    analysisController.abort();
  }
}

// ===== PGN Parsing =====
function parsePGN(pgnText) {
  const chess = new Chess();
  
  // Try to load the PGN
  const loaded = chess.load_pgn(pgnText, { sloppy: true });
  if (!loaded) {
    // Try as just moves without headers
    const cleaned = pgnText.replace(/\[.*?\]\s*/g, '').trim();
    if (!chess.load_pgn(cleaned, { sloppy: true })) {
      throw new Error('Invalid PGN. Please check the format and try again.');
    }
  }

  // Extract headers
  const header = chess.header();
  const whiteName = header.White || 'White';
  const blackName = header.Black || 'Black';

  // Get move history
  const history = chess.history({ verbose: true });
  
  // Build moves array with FEN at each position
  const moves = [];
  const replayChess = new Chess();
  
  for (let i = 0; i < history.length; i++) {
    const fenBefore = replayChess.fen();
    const moveObj = replayChess.move(history[i].san);
    const fenAfter = replayChess.fen();
    
    moves.push({
      san: history[i].san,
      color: history[i].color,
      from: history[i].from,
      to: history[i].to,
      piece: history[i].piece,
      captured: history[i].captured || null,
      fenBefore: fenBefore,
      fenAfter: fenAfter,
      moveObj: moveObj,
      moveNumber: Math.floor(i / 2) + 1
    });
  }

  // Detect opening
  let opening = '';
  const replayForOpening = new Chess();
  let moveSequence = '';
  for (let i = 0; i < Math.min(moves.length, 12); i++) {
    if (i > 0) moveSequence += ' ';
    if (moves[i].color === 'w') {
      moveSequence += `${moves[i].moveNumber}.${moves[i].san}`;
    } else {
      moveSequence += moves[i].san;
    }
    
    // Check ECO book (try longest match)
    for (const [line, name] of Object.entries(ECO_BOOK)) {
      if (moveSequence.replace(/\s+/g, ' ').includes(line.replace(/\s+/g, ' '))) {
        opening = name;
      }
    }
  }

  return { moves, whiteName, blackName, opening };
}

// ===== Analysis =====
async function startAnalysis() {
  const pgnText = $('pgn-textarea').value.trim();
  if (!pgnText) {
    alert('Please paste a PGN to analyze.');
    return;
  }

  let parsed;
  try {
    parsed = parsePGN(pgnText);
  } catch (err) {
    alert(err.message);
    return;
  }

  if (parsed.moves.length === 0) {
    alert('No moves found in the PGN.');
    return;
  }

  gameData.moves = parsed.moves;
  gameData.whiteName = parsed.whiteName;
  gameData.blackName = parsed.blackName;
  gameData.opening = parsed.opening;

  // Show progress
  $('pgn-input-screen').style.display = 'none';
  $('analysis-progress').classList.add('active');
  $('progress-text').textContent = 'Initializing Stockfish 18...';
  $('progress-bar').style.width = '0%';
  $('progress-move-info').textContent = '';

  try {
    // Init engine
    analysisController = new AnalysisController();
    const depth = parseInt($('depth-select').value) || 18;
    analysisController.analysisDepth = depth;
    await analysisController.init();

    $('progress-text').textContent = 'Analyzing game...';

    // Run analysis
    const results = await analysisController.analyzeGame(parsed.moves, (i, total, result) => {
      const pct = Math.round(((i + 1) / total) * 100);
      $('progress-bar').style.width = pct + '%';
      $('progress-text').textContent = `Analyzing move ${i + 1} of ${total}...`;
      const move = parsed.moves[i];
      $('progress-move-info').textContent = `${move.moveNumber}. ${move.color === 'w' ? '' : '...'}${move.san}`;
    });

    gameData.results = results;
    
    // Classify moves
    classifyAllMoves();
    
    // Show review
    showReviewScreen();
  } catch (err) {
    console.error('Analysis failed:', err);
    alert('Analysis failed: ' + err.message);
    showPGNInput();
  }
}

// ===== Move Classification =====
function classifyAllMoves() {
  const { moves, results } = gameData;
  const classifications = [];
  const whiteAccuracies = [];
  const blackAccuracies = [];

  // Detect book moves (first N moves matching known openings)
  const bookMoveCount = detectBookMoves(moves);

  for (let i = 0; i < moves.length; i++) {
    const r = results[i];
    if (!r || r.isFinalPosition) {
      classifications.push(MoveClassification.GOOD);
      continue;
    }

    const isBook = i < bookMoveCount;
    const move = moves[i];

    // Get evals from the moving side's perspective
    let evalBeforeCP, evalAfterCP, bestMoveEvalCP;
    
    if (r.bestMoveEval) {
      bestMoveEvalCP = getEffectiveCP(r.bestMoveEval);
      // bestMoveEval is from side-to-move perspective (which is the moving side)
      evalBeforeCP = bestMoveEvalCP; // Before the move, best eval = position eval
    } else {
      bestMoveEvalCP = 0;
      evalBeforeCP = 0;
    }

    if (r.evalAfterFromWhite !== undefined) {
      // Convert from white's perspective to moving side's perspective
      evalAfterCP = move.color === 'w' ? r.evalAfterFromWhite : -r.evalAfterFromWhite;
    } else {
      evalAfterCP = evalBeforeCP;
    }

    // Check if this was the best move
    const isBestMove = r.bestMove && r.bestMove === (move.from + move.to);

    // Check sacrifice
    const isSacrificeMove = move.captured && isSacrifice(move, move.fenBefore, Chess);

    // Previous move info for Miss detection
    let prevEvalCP, prevBestEvalCP;
    if (i > 0 && results[i - 1]) {
      prevBestEvalCP = getEffectiveCP(results[i - 1].bestMoveEval);
      prevEvalCP = results[i - 1].evalAfterFromWhite !== undefined
        ? (moves[i - 1].color === 'w' ? results[i - 1].evalAfterFromWhite : -results[i - 1].evalAfterFromWhite)
        : prevBestEvalCP;
    }

    const cls = classifyMove({
      evalBeforeCP,
      evalAfterCP,
      bestMoveEvalCP,
      isBestMove,
      isSacrificeMove,
      isBook,
      color: move.color,
      prevEvalCP,
      prevBestEvalCP
    });

    classifications.push(cls);

    // Calculate accuracy
    const cpLoss = Math.max(0, bestMoveEvalCP - evalAfterCP);
    const acc = calculateMoveAccuracy(cpLoss);
    
    if (move.color === 'w') {
      whiteAccuracies.push(acc);
    } else {
      blackAccuracies.push(acc);
    }
  }

  gameData.classifications = classifications;
  gameData.whiteAccuracy = calculateGameAccuracy(whiteAccuracies);
  gameData.blackAccuracy = calculateGameAccuracy(blackAccuracies);
}

function detectBookMoves(moves) {
  // Simple heuristic: first 6-10 moves are likely "book" if they match common openings
  // For a more accurate approach, we'd need a full ECO database
  const replayChess = new Chess();
  let bookCount = 0;
  let moveSequence = '';
  
  for (let i = 0; i < Math.min(moves.length, 14); i++) {
    if (i > 0) moveSequence += ' ';
    if (moves[i].color === 'w') {
      moveSequence += `${moves[i].moveNumber}.${moves[i].san}`;
    } else {
      moveSequence += moves[i].san;
    }
    
    let isBook = false;
    for (const line of Object.keys(ECO_BOOK)) {
      if (line.replace(/\s+/g, ' ').startsWith(moveSequence.replace(/\s+/g, ' ')) ||
          moveSequence.replace(/\s+/g, ' ').startsWith(line.replace(/\s+/g, ' '))) {
        isBook = true;
        break;
      }
    }
    
    if (isBook) {
      bookCount = i + 1;
    } else {
      break;
    }
  }
  
  return bookCount;
}

// ===== Review Screen =====
function showReviewScreen() {
  $('analysis-progress').classList.remove('active');
  $('pgn-input-screen').style.display = 'none';
  $('review-screen').classList.add('active');

  // Init board
  board = new ChessBoard('board-container');

  // Init eval graph
  evalGraph = new EvalGraph('eval-graph', {
    onClick: (moveIndex) => goToMove(moveIndex - 1)
  });

  // Set player names
  $('player-white-name').textContent = gameData.whiteName;
  $('player-black-name').textContent = gameData.blackName;

  // Set accuracy
  setAccuracy('player-white-accuracy', gameData.whiteAccuracy);
  setAccuracy('player-black-accuracy', gameData.blackAccuracy);

  // Build move list
  buildMoveList();

  // Build classification summary
  buildClassificationSummary();

  // Build eval graph data
  buildEvalGraph();

  // Go to starting position
  goToMove(-1);
}

function setAccuracy(elementId, accuracy) {
  const el = $(elementId);
  el.textContent = accuracy.toFixed(1) + '%';
  el.className = 'player-accuracy';
  if (accuracy >= 80) el.classList.add('high');
  else if (accuracy >= 50) el.classList.add('medium');
  else el.classList.add('low');
}

// ===== Move List =====
function buildMoveList() {
  const moveList = $('move-list');
  moveList.innerHTML = '';

  for (let i = 0; i < gameData.moves.length; i += 2) {
    const row = document.createElement('div');
    row.className = 'move-row';

    const moveNum = document.createElement('div');
    moveNum.className = 'move-number';
    moveNum.textContent = gameData.moves[i].moveNumber;
    row.appendChild(moveNum);

    // White move
    row.appendChild(createMoveCell(i, 'w'));

    // Black move
    if (i + 1 < gameData.moves.length) {
      row.appendChild(createMoveCell(i + 1, 'b'));
    } else {
      const empty = document.createElement('div');
      empty.className = 'move-cell';
      empty.style.opacity = '0';
      row.appendChild(empty);
    }

    moveList.appendChild(row);
  }
}

function createMoveCell(index, color) {
  const cell = document.createElement('div');
  cell.className = `move-cell ${color === 'w' ? 'white-move' : 'black-move'}`;
  cell.dataset.moveIndex = index;

  const cls = gameData.classifications[index];
  if (cls) {
    const dot = document.createElement('span');
    dot.className = 'classification-dot';
    dot.style.backgroundColor = cls.color;
    cell.appendChild(dot);
  }

  const san = document.createElement('span');
  san.className = 'move-san';
  san.textContent = gameData.moves[index].san;
  cell.appendChild(san);

  // Show eval
  if (gameData.results[index] && gameData.results[index].evalFromWhite !== undefined) {
    const evalSpan = document.createElement('span');
    evalSpan.className = 'move-eval';
    evalSpan.textContent = formatEval(gameData.results[index].evalFromWhite, gameData.results[index].bestMoveEval);
    cell.appendChild(evalSpan);
  }

  cell.addEventListener('click', () => goToMove(index));
  return cell;
}

function formatEval(evalFromWhite, evalObj) {
  if (evalObj && evalObj.mate !== undefined) {
    const m = evalObj.mate;
    return `M${Math.abs(m)}`;
  }
  if (typeof evalFromWhite === 'number') {
    const v = evalFromWhite / 100;
    return (v >= 0 ? '+' : '') + v.toFixed(1);
  }
  return '';
}

// ===== Classification Summary =====
function buildClassificationSummary() {
  const classNames = ['Brilliant', 'Great', 'Best', 'Excellent', 'Good', 'Book', 'Inaccuracy', 'Mistake', 'Blunder'];

  for (const color of ['white', 'black']) {
    const container = $(color + '-summary-badges');
    container.innerHTML = '';
    const sideColor = color === 'white' ? 'w' : 'b';

    for (const name of classNames) {
      const count = gameData.classifications.filter((c, i) =>
        c.name === name && gameData.moves[i] && gameData.moves[i].color === sideColor
      ).length;

      if (count === 0 && !['Best', 'Inaccuracy', 'Mistake', 'Blunder'].includes(name)) continue;

      const classObj = Object.values(MoveClassification).find(c => c.name === name);
      if (!classObj) continue;

      const badge = document.createElement('span');
      badge.className = 'classification-badge';
      badge.innerHTML = `<span class="badge-dot" style="background:${classObj.color}"></span>
                          <span class="badge-count">${count}</span>`;
      badge.title = name;
      container.appendChild(badge);
    }
  }
}

// ===== Eval Graph =====
function buildEvalGraph() {
  const evals = [];
  
  // Starting eval = 0
  evals.push({ cp: 0 });
  
  for (let i = 0; i < gameData.results.length; i++) {
    const r = gameData.results[i];
    if (r.isFinalPosition) continue;
    
    if (r.evalAfterFromWhite !== undefined) {
      evals.push({ cp: r.evalAfterFromWhite });
    } else if (r.evalFromWhite !== undefined) {
      evals.push({ cp: r.evalFromWhite });
    } else {
      evals.push({ cp: evals.length > 0 ? evals[evals.length - 1].cp : 0 });
    }
  }

  const clsForGraph = [null, ...gameData.classifications]; // offset by 1 for starting position
  evalGraph.setData(evals, clsForGraph);
}

// ===== Navigation =====
function goToMove(index) {
  index = Math.max(-1, Math.min(index, gameData.moves.length - 1));
  currentMoveIndex = index;

  // Update board position
  if (index === -1) {
    board.setPosition(gameData.startFen);
    board.clearHighlights();
    board.clearArrows();
  } else {
    const move = gameData.moves[index];
    board.setPosition(move.fenAfter);
    board.setLastMove(move.from, move.to);
    board.clearArrows();

    // Play sound
    if (move.captured) {
      chessAudio.playCapture();
    } else {
      chessAudio.playMove();
    }

    // Draw best move arrow if it wasn't the best move
    const result = gameData.results[index];
    const cls = gameData.classifications[index];
    if (result && result.bestMove && cls) {
      const bestSquares = ChessBoard.uciToSquares(result.bestMove);
      const playedUCI = move.from + move.to;
      
      if (bestSquares && result.bestMove !== playedUCI) {
        // Show best move arrow in green
        board.drawArrow(bestSquares.from, bestSquares.to, 'green');
        
        // Show played move with classification color if it was bad
        if (['Inaccuracy', 'Mistake', 'Blunder', 'Miss'].includes(cls.name)) {
          board.drawClassificationDot(move.to, cls.color);
        }
      }
    }
  }

  // Update eval bar
  updateEvalBar(index);

  // Update eval graph cursor
  evalGraph.setCurrentMove(index + 1); // +1 because graph includes starting position

  // Update coach comment
  updateCoach(index);

  // Update move list highlight
  document.querySelectorAll('.move-cell').forEach(cell => cell.classList.remove('active'));
  if (index >= 0) {
    const activeCell = document.querySelector(`.move-cell[data-move-index="${index}"]`);
    if (activeCell) {
      activeCell.classList.add('active');
      activeCell.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  // Update engine info display
  updateEngineInfo(index);

  // Update nav button states
  $('btn-first').classList.toggle('disabled', index <= -1);
  $('btn-prev').classList.toggle('disabled', index <= -1);
  $('btn-next').classList.toggle('disabled', index >= gameData.moves.length - 1);
  $('btn-last').classList.toggle('disabled', index >= gameData.moves.length - 1);
}

function updateCoach(moveIndex) {
  const titleEl = $('coach-title');
  const textEl = $('coach-text');

  // Reset classes
  titleEl.className = 'coach-title';

  if (moveIndex === -1) {
    titleEl.textContent = 'Game Review';
    textEl.innerHTML = 'Here we have the starting position. Let\'s see how the game develops.';
    return;
  }

  const move = gameData.moves[moveIndex];
  const cls = gameData.classifications[moveIndex];
  const result = gameData.results[moveIndex];

  if (cls) {
    titleEl.textContent = cls.name;
    titleEl.classList.add('text-' + cls.name.toLowerCase());
  } else {
    titleEl.textContent = 'Move';
  }

  aiCoach.generateComment(
    move, 
    cls, 
    result,
    () => {
      // onStart - loading state
      textEl.innerHTML = `<span style="opacity: 0.6; font-style: italic;">Coach is thinking...</span>`;
    },
    (html) => {
      // onComplete
      textEl.innerHTML = html;
    },
    (error) => {
      // onError - handled in aiCoach (falls back to heuristic)
    }
  );
}

function updateEvalBar(moveIndex) {
  let cp = 0;
  
  if (moveIndex >= 0 && gameData.results[moveIndex]) {
    const r = gameData.results[moveIndex];
    if (r.evalAfterFromWhite !== undefined) {
      cp = r.evalAfterFromWhite;
    } else if (r.evalFromWhite !== undefined) {
      cp = r.evalFromWhite;
    }
  }

  // Handle mate scores
  if (typeof cp === 'number' && Math.abs(cp) > 5000) {
    cp = cp > 0 ? 5000 : -5000;
  }

  // Convert to win probability for bar height
  const wp = 1 / (1 + Math.pow(10, -cp / 400));
  const whitePct = Math.max(2, Math.min(98, wp * 100));
  
  $('eval-bar-white').style.height = whitePct + '%';

  // Update eval label
  const label = $('eval-label-top');
  if (gameData.results[moveIndex] && gameData.results[moveIndex].bestMoveEval &&
      gameData.results[moveIndex].bestMoveEval.mate !== undefined) {
    const m = gameData.results[moveIndex].bestMoveEval.mate;
    label.textContent = `M${Math.abs(m)}`;
  } else {
    const v = cp / 100;
    label.textContent = (v >= 0 ? '+' : '') + v.toFixed(1);
  }
  
  label.className = 'eval-bar-label ' + (cp >= 0 ? 'white-advantage' : 'black-advantage');
}

function updateEngineInfo(moveIndex) {
  const el = $('engine-eval-display');
  if (moveIndex >= 0 && gameData.results[moveIndex]) {
    const r = gameData.results[moveIndex];
    const cls = gameData.classifications[moveIndex];
    const depth = r.depth || parseInt($('depth-select').value);
    let evalText = '';
    
    if (r.bestMoveEval && r.bestMoveEval.mate !== undefined) {
      evalText = `#${Math.abs(r.bestMoveEval.mate)}`;
    } else if (r.evalFromWhite !== undefined) {
      const v = r.evalFromWhite / 100;
      evalText = (v >= 0 ? '+' : '') + v.toFixed(2);
    }
    
    el.textContent = `depth ${depth} · ${evalText}`;
    if (cls) {
      el.textContent += ` · ${cls.name}`;
    }
  } else {
    el.textContent = `depth ${$('depth-select').value}`;
  }
}
