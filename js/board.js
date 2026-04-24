/**
 * SVG Chessboard Renderer
 * Renders an interactive chessboard with piece placement, move highlights, and arrows
 */

class ChessBoard {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.size = options.size || 480;
    this.squareSize = this.size / 8;
    this.flipped = options.flipped || false;
    this.lightColor = '#EBECD0';
    this.darkColor = '#779556';
    this.highlightColor = 'rgba(255, 255, 50, 0.4)';
    this.lastMoveColor = 'rgba(255, 255, 50, 0.35)';
    this.svg = null;
    this.piecesGroup = null;
    this.highlightsGroup = null;
    this.arrowsGroup = null;
    this.labelsGroup = null;
    this.currentFen = null;
    this.lastMoveFrom = null;
    this.lastMoveTo = null;
    this.onSquareClick = options.onSquareClick || null;

    this._createSVG();
  }

  /**
   * Create the SVG element and board structure
   */
  _createSVG() {
    // Clear container
    this.container.innerHTML = '';

    this.svg = this._createSVGElement('svg', {
      width: '100%',
      height: '100%',
      viewBox: `0 0 ${this.size} ${this.size}`,
      class: 'chess-board-svg'
    });

    // Define arrow marker
    const defs = this._createSVGElement('defs');
    
    const markerGreen = this._createSVGElement('marker', {
      id: 'arrowhead-green',
      markerWidth: '4',
      markerHeight: '4',
      refX: '2.5',
      refY: '2',
      orient: 'auto'
    });
    const arrowPathGreen = this._createSVGElement('path', {
      d: 'M 0 0 L 4 2 L 0 4 Z',
      fill: '#81B64C',
      opacity: '0.9'
    });
    markerGreen.appendChild(arrowPathGreen);
    defs.appendChild(markerGreen);

    const markerRed = this._createSVGElement('marker', {
      id: 'arrowhead-red',
      markerWidth: '4',
      markerHeight: '4',
      refX: '2.5',
      refY: '2',
      orient: 'auto'
    });
    const arrowPathRed = this._createSVGElement('path', {
      d: 'M 0 0 L 4 2 L 0 4 Z',
      fill: '#FA412D',
      opacity: '0.7'
    });
    markerRed.appendChild(arrowPathRed);
    defs.appendChild(markerRed);

    const markerBlue = this._createSVGElement('marker', {
      id: 'arrowhead-blue',
      markerWidth: '4',
      markerHeight: '4',
      refX: '2.5',
      refY: '2',
      orient: 'auto'
    });
    const arrowPathBlue = this._createSVGElement('path', {
      d: 'M 0 0 L 4 2 L 0 4 Z',
      fill: '#749BBF',
      opacity: '0.7'
    });
    markerBlue.appendChild(arrowPathBlue);
    defs.appendChild(markerBlue);

    this.svg.appendChild(defs);

    // Board squares layer
    this.squaresGroup = this._createSVGElement('g', { class: 'squares' });
    this.svg.appendChild(this.squaresGroup);

    // Highlights layer (last move, selected square)
    this.highlightsGroup = this._createSVGElement('g', { class: 'highlights' });
    this.svg.appendChild(this.highlightsGroup);

    // Pieces layer
    this.piecesGroup = this._createSVGElement('g', { class: 'pieces' });
    this.svg.appendChild(this.piecesGroup);

    // Arrows layer
    this.arrowsGroup = this._createSVGElement('g', { class: 'arrows' });
    this.svg.appendChild(this.arrowsGroup);

    // Labels layer
    this.labelsGroup = this._createSVGElement('g', { class: 'labels' });
    this.svg.appendChild(this.labelsGroup);

    // Draw the board
    this._drawBoard();
    this._drawLabels();

    this.container.appendChild(this.svg);
  }

  /**
   * Create an SVG element with attributes
   */
  _createSVGElement(tag, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
    return el;
  }

  /**
   * Draw the 8x8 board squares
   */
  _drawBoard() {
    this.squaresGroup.innerHTML = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        const x = col * this.squareSize;
        const y = row * this.squareSize;
        
        const rect = this._createSVGElement('rect', {
          x, y,
          width: this.squareSize,
          height: this.squareSize,
          fill: isLight ? this.lightColor : this.darkColor,
          class: 'board-square',
          'data-row': row,
          'data-col': col
        });

        this.squaresGroup.appendChild(rect);
      }
    }
  }

  /**
   * Draw coordinate labels
   */
  _drawLabels() {
    this.labelsGroup.innerHTML = '';
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

    if (this.flipped) {
      files.reverse();
      ranks.reverse();
    }

    const fontSize = this.squareSize * 0.22;

    // File labels (bottom)
    for (let col = 0; col < 8; col++) {
      const isLight = (7 + col) % 2 === 0;
      const label = this._createSVGElement('text', {
        x: col * this.squareSize + this.squareSize - fontSize * 0.4,
        y: 8 * this.squareSize - fontSize * 0.3,
        'font-size': fontSize,
        'font-weight': '600',
        'font-family': "'Segoe UI', system-ui, sans-serif",
        fill: isLight ? this.darkColor : this.lightColor,
        'text-anchor': 'end',
        class: 'board-label'
      });
      label.textContent = files[col];
      this.labelsGroup.appendChild(label);
    }

    // Rank labels (left)
    for (let row = 0; row < 8; row++) {
      const isLight = (row) % 2 === 0;
      const label = this._createSVGElement('text', {
        x: fontSize * 0.4,
        y: row * this.squareSize + fontSize * 1.1,
        'font-size': fontSize,
        'font-weight': '600',
        'font-family': "'Segoe UI', system-ui, sans-serif",
        fill: isLight ? this.darkColor : this.lightColor,
        'text-anchor': 'start',
        class: 'board-label'
      });
      label.textContent = ranks[row];
      this.labelsGroup.appendChild(label);
    }
  }

  /**
   * Convert algebraic notation (e.g., 'e4') to board coordinates
   */
  _algebraicToCoords(square) {
    const col = square.charCodeAt(0) - 97; // 'a' = 0
    const row = 8 - parseInt(square[1]);    // '8' = 0, '1' = 7
    
    if (this.flipped) {
      return { col: 7 - col, row: 7 - row };
    }
    return { col, row };
  }

  /**
   * Get the center coordinates of a square
   */
  _squareCenter(square) {
    const { col, row } = this._algebraicToCoords(square);
    return {
      x: col * this.squareSize + this.squareSize / 2,
      y: row * this.squareSize + this.squareSize / 2
    };
  }

  /**
   * Set position from FEN string
   */
  setPosition(fen) {
    this.currentFen = fen;
    this.piecesGroup.innerHTML = '';

    if (!fen) return;

    const placement = fen.split(' ')[0];
    const rows = placement.split('/');

    for (let row = 0; row < 8; row++) {
      let col = 0;
      for (const char of rows[row]) {
        if (char >= '1' && char <= '8') {
          col += parseInt(char);
        } else {
          const color = char === char.toUpperCase() ? 'w' : 'b';
          const piece = char.toLowerCase();
          const displayRow = this.flipped ? 7 - row : row;
          const displayCol = this.flipped ? 7 - col : col;
          
          this._drawPiece(color, piece, displayRow, displayCol);
          col++;
        }
      }
    }
  }

  /**
   * Draw a single piece on the board
   */
  _drawPiece(color, piece, row, col) {
    const x = col * this.squareSize;
    const y = row * this.squareSize;
    const pieceKey = color + piece.toUpperCase();
    
    // Use the outline (white) Unicode chess symbols for ALL pieces to ensure 
    // consistent font rendering across OSs, then use SVG fill/stroke to color them.
    const pieceUnicode = {
      'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙'
    };

    const text = this._createSVGElement('text', {
      x: x + this.squareSize / 2,
      y: y + this.squareSize * 0.82,
      'font-size': this.squareSize * 0.85,
      'text-anchor': 'middle',
      // Black pieces are filled black with white stroke, White pieces are filled white with black stroke
      fill: color === 'w' ? '#FFFFFF' : '#222222',
      stroke: color === 'w' ? '#000000' : '#000000',
      'stroke-width': color === 'w' ? '0.5' : '1.5',
      'font-family': 'serif',
      class: 'chess-piece',
      'pointer-events': 'none',
      style: `filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.4));`
    });
    text.textContent = pieceUnicode[piece.toUpperCase()] || '';
    this.piecesGroup.appendChild(text);
  }

  /**
   * Highlight the last move
   */
  setLastMove(from, to) {
    this.lastMoveFrom = from;
    this.lastMoveTo = to;
    this._updateHighlights();
  }

  /**
   * Clear all highlights
   */
  clearHighlights() {
    this.highlightsGroup.innerHTML = '';
    this.lastMoveFrom = null;
    this.lastMoveTo = null;
  }

  /**
   * Update highlight overlays
   */
  _updateHighlights() {
    this.highlightsGroup.innerHTML = '';

    if (this.lastMoveFrom) {
      const { col, row } = this._algebraicToCoords(this.lastMoveFrom);
      const rect = this._createSVGElement('rect', {
        x: col * this.squareSize,
        y: row * this.squareSize,
        width: this.squareSize,
        height: this.squareSize,
        fill: this.lastMoveColor,
        class: 'move-highlight'
      });
      this.highlightsGroup.appendChild(rect);
    }

    if (this.lastMoveTo) {
      const { col, row } = this._algebraicToCoords(this.lastMoveTo);
      const rect = this._createSVGElement('rect', {
        x: col * this.squareSize,
        y: row * this.squareSize,
        width: this.squareSize,
        height: this.squareSize,
        fill: this.lastMoveColor,
        class: 'move-highlight'
      });
      this.highlightsGroup.appendChild(rect);
    }
  }

  /**
   * Draw an arrow between two squares
   * @param {string} from - algebraic notation
   * @param {string} to - algebraic notation
   * @param {string} color - 'green', 'red', or 'blue'
   */
  drawArrow(from, to, color = 'green') {
    const fromCenter = this._squareCenter(from);
    const toCenter = this._squareCenter(to);

    // Shorten the arrow slightly so it doesn't overlap with the arrowhead
    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const shortenBy = this.squareSize * 0.15;
    const toX = toCenter.x - (dx / len) * shortenBy;
    const toY = toCenter.y - (dy / len) * shortenBy;
    const fromX = fromCenter.x + (dx / len) * shortenBy * 0.5;
    const fromY = fromCenter.y + (dy / len) * shortenBy * 0.5;

    const colors = {
      green: { stroke: '#81B64C', marker: 'arrowhead-green' },
      red: { stroke: '#FA412D', marker: 'arrowhead-red' },
      blue: { stroke: '#749BBF', marker: 'arrowhead-blue' },
    };
    const c = colors[color] || colors.green;

    const line = this._createSVGElement('line', {
      x1: fromX,
      y1: fromY,
      x2: toX,
      y2: toY,
      stroke: c.stroke,
      'stroke-width': this.squareSize * 0.15,
      'stroke-linecap': 'round',
      opacity: '0.8',
      'marker-end': `url(#${c.marker})`,
      class: 'board-arrow'
    });

    this.arrowsGroup.appendChild(line);
  }

  /**
   * Clear all arrows
   */
  clearArrows() {
    this.arrowsGroup.innerHTML = '';
  }

  /**
   * Draw a classification dot on a square
   */
  drawClassificationDot(square, color) {
    const { col, row } = this._algebraicToCoords(square);
    const x = col * this.squareSize + this.squareSize - this.squareSize * 0.18;
    const y = row * this.squareSize + this.squareSize * 0.18;
    
    const circle = this._createSVGElement('circle', {
      cx: x,
      cy: y,
      r: this.squareSize * 0.12,
      fill: color,
      stroke: 'rgba(0,0,0,0.3)',
      'stroke-width': '1',
      class: 'classification-dot'
    });
    this.arrowsGroup.appendChild(circle);
  }

  /**
   * Flip the board orientation
   */
  flip() {
    this.flipped = !this.flipped;
    this._drawLabels();
    if (this.currentFen) {
      this.setPosition(this.currentFen);
    }
    if (this.lastMoveFrom || this.lastMoveTo) {
      this._updateHighlights();
    }
  }

  /**
   * Convert UCI move notation (e.g., 'e2e4') to { from, to } algebraic
   */
  static uciToSquares(uciMove) {
    if (!uciMove || uciMove.length < 4) return null;
    return {
      from: uciMove.substring(0, 2),
      to: uciMove.substring(2, 4),
      promotion: uciMove.length > 4 ? uciMove[4] : null
    };
  }
}
