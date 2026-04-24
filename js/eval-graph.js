/**
 * Evaluation Graph — Canvas-based evaluation chart
 * Displays the game's evaluation flow as an area chart
 */

class EvalGraph {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.evaluations = []; // Array of { cp, mate } from White's perspective
    this.classifications = []; // Array of classification objects
    this.currentMove = -1;
    this.onClick = options.onClick || null;
    this.padding = { top: 8, right: 8, bottom: 8, left: 8 };

    // Setup canvas sizing
    this._setupCanvas();

    // Click handler
    this.canvas.addEventListener('click', (e) => {
      if (this.onClick && this.evaluations.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ratio = x / rect.width;
        const moveIndex = Math.round(ratio * (this.evaluations.length - 1));
        const clamped = Math.max(0, Math.min(this.evaluations.length - 1, moveIndex));
        this.onClick(clamped);
      }
    });

    // Hover handler
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = x / rect.width;
      const moveIndex = Math.round(ratio * (this.evaluations.length - 1));
      this.canvas.style.cursor = moveIndex >= 0 ? 'pointer' : 'default';
    });

    window.addEventListener('resize', () => {
      this._setupCanvas();
      this.render();
    });
  }

  /**
   * Setup canvas dimensions for high-DPI rendering
   */
  _setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  /**
   * Convert centipawn to Y position on the chart
   * Uses win probability to create a sigmoid-like curve
   */
  _cpToY(cp) {
    // Convert to win probability (0 to 1)
    const wp = 1 / (1 + Math.pow(10, -cp / 400));
    // Map to canvas height (inverted: top = White winning, bottom = Black winning)
    const drawHeight = this.height - this.padding.top - this.padding.bottom;
    return this.padding.top + (1 - wp) * drawHeight;
  }

  /**
   * Get effective CP from eval object
   */
  _getCP(evalObj) {
    if (!evalObj) return 0;
    if (evalObj.mate !== undefined && evalObj.mate !== null) {
      if (evalObj.mate > 0) return 1500;
      if (evalObj.mate < 0) return -1500;
      return 0;
    }
    // Clamp extreme values
    return Math.max(-1500, Math.min(1500, evalObj.cp || 0));
  }

  /**
   * Set evaluation data
   * @param {Array} evals - Array of eval objects { cp } or { mate } from White's perspective
   * @param {Array} classifications - Array of classification objects
   */
  setData(evals, classifications) {
    this.evaluations = evals || [];
    this.classifications = classifications || [];
    this.render();
  }

  /**
   * Set the current move index for the highlight line
   */
  setCurrentMove(index) {
    this.currentMove = index;
    this.render();
  }

  /**
   * Main render function
   */
  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#21201D';
    ctx.fillRect(0, 0, w, h);

    if (this.evaluations.length === 0) {
      // Draw empty state
      ctx.fillStyle = '#666';
      ctx.font = '12px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No evaluation data', w / 2, h / 2);
      return;
    }

    const drawWidth = w - this.padding.left - this.padding.right;
    const drawHeight = h - this.padding.top - this.padding.bottom;
    const centerY = this.padding.top + drawHeight / 2;

    // Draw center line (equality)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(this.padding.left, centerY);
    ctx.lineTo(w - this.padding.right, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Calculate X positions for each eval
    const stepX = drawWidth / Math.max(1, this.evaluations.length - 1);
    const points = this.evaluations.map((evalObj, i) => ({
      x: this.padding.left + i * stepX,
      y: this._cpToY(this._getCP(evalObj))
    }));

    // --- Draw White advantage area (above center) ---
    ctx.beginPath();
    ctx.moveTo(points[0].x, centerY);
    for (let i = 0; i < points.length; i++) {
      const y = Math.min(points[i].y, centerY);
      if (i === 0) {
        ctx.lineTo(points[i].x, y);
      } else {
        // Smooth curve
        const prevX = points[i - 1].x;
        const prevY = Math.min(points[i - 1].y, centerY);
        const cpX = (prevX + points[i].x) / 2;
        ctx.bezierCurveTo(cpX, prevY, cpX, y, points[i].x, y);
      }
    }
    ctx.lineTo(points[points.length - 1].x, centerY);
    ctx.closePath();
    
    const whiteGrad = ctx.createLinearGradient(0, this.padding.top, 0, centerY);
    whiteGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    whiteGrad.addColorStop(1, 'rgba(255, 255, 255, 0.45)');
    ctx.fillStyle = whiteGrad;
    ctx.fill();

    // --- Draw Black advantage area (below center) ---
    ctx.beginPath();
    ctx.moveTo(points[0].x, centerY);
    for (let i = 0; i < points.length; i++) {
      const y = Math.max(points[i].y, centerY);
      if (i === 0) {
        ctx.lineTo(points[i].x, y);
      } else {
        const prevX = points[i - 1].x;
        const prevY = Math.max(points[i - 1].y, centerY);
        const cpX = (prevX + points[i].x) / 2;
        ctx.bezierCurveTo(cpX, prevY, cpX, y, points[i].x, y);
      }
    }
    ctx.lineTo(points[points.length - 1].x, centerY);
    ctx.closePath();
    
    const blackGrad = ctx.createLinearGradient(0, centerY, 0, h - this.padding.bottom);
    blackGrad.addColorStop(0, 'rgba(50, 50, 50, 0.6)');
    blackGrad.addColorStop(1, 'rgba(30, 30, 30, 0.9)');
    ctx.fillStyle = blackGrad;
    ctx.fill();

    // --- Draw the main line ---
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      if (i === 0) {
        ctx.moveTo(points[i].x, points[i].y);
      } else {
        const prevX = points[i - 1].x;
        const prevY = points[i - 1].y;
        const cpX = (prevX + points[i].x) / 2;
        ctx.bezierCurveTo(cpX, prevY, cpX, points[i].y, points[i].x, points[i].y);
      }
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // --- Draw classification markers ---
    for (let i = 0; i < this.classifications.length; i++) {
      const cls = this.classifications[i];
      if (!cls) continue;
      
      // Only draw dots for significant classifications
      if (['Inaccuracy', 'Mistake', 'Blunder', 'Brilliant', 'Great'].includes(cls.name)) {
        if (i < points.length) {
          ctx.beginPath();
          ctx.arc(points[i].x, points[i].y, 4, 0, Math.PI * 2);
          ctx.fillStyle = cls.color;
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.4)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // --- Draw current move indicator ---
    if (this.currentMove >= 0 && this.currentMove < points.length) {
      const mx = points[this.currentMove].x;
      
      // Vertical line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(mx, this.padding.top);
      ctx.lineTo(mx, h - this.padding.bottom);
      ctx.stroke();

      // Dot at current position
      ctx.beginPath();
      ctx.arc(mx, points[this.currentMove].y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}
