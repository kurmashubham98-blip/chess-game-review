/**
 * AI Coach Logic — Uses Gemini API to generate Socratic, human-like chess coaching
 */

class AICoach {
  constructor() {
    this.cache = new Map();
    this.apiKey = null;
    this.isGenerating = false;
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  /**
   * Generate a Socratic comment using Gemini API
   * @param {Object} move - The chess.js move object
   * @param {Object} cls - MoveClassification
   * @param {Object} result - Stockfish analysis result
   * @param {Function} onStart - Callback when generation starts
   * @param {Function} onComplete - Callback with HTML result
   * @param {Function} onError - Callback on error
   */
  async generateComment(move, cls, result, onStart, onComplete, onError) {
    if (!this.apiKey) {
      // Fallback to heuristic coach if no API key
      const fallback = Coach.generateComment(move, cls, result);
      onComplete(fallback);
      return;
    }

    if (!move || !cls || move.from === undefined) {
      onComplete("Here we have the starting position. Let's see how the game develops.");
      return;
    }

    // Cache key based on FEN before move + the move itself
    const cacheKey = move.fenBefore + '|' + move.san;
    if (this.cache.has(cacheKey)) {
      onComplete(this.cache.get(cacheKey));
      return;
    }

    onStart();

    // Prepare data for the AI
    const evalBefore = (result.evalFromWhite !== undefined) ? (result.evalFromWhite / 100).toFixed(2) : "Unknown";
    const evalAfter = (result.evalAfterFromWhite !== undefined) ? (result.evalAfterFromWhite / 100).toFixed(2) : "Unknown";
    
    let bestMoveSAN = "Unknown";
    if (result.bestMove) {
      bestMoveSAN = Coach._formatUCIMove(result.bestMove, move.fenBefore);
    }

    const colorName = move.color === 'w' ? 'White' : 'Black';

    // The system prompt that enforces the persona
    const systemPrompt = `You are an expert human chess coach. Your goal is to help a player improve by analyzing their move.
Tone: Encouraging, direct, and slightly Socratic (asking rhetorical questions to help them think).
Length: Extremely concise. Maximum 2 to 3 short sentences. No filler. No Markdown formatting like bold or italics.

Here are the rules for your feedback based on the move quality:
1. If it's a BLUNDER, MISTAKE, or INACCURACY: Do NOT just give them the best move. Tell them briefly what their move failed to do (e.g., left a piece hanging, missed a tactic, ignored a threat) and ask a short question to guide them toward the engine's preferred best move.
2. If it's the BEST or EXCELLENT move: Praise them specifically for what the move accomplishes (e.g., "Great job pinning the knight").
3. If it's a BRILLIANT move: Act amazed! Explain why the sacrifice works.

Do NOT mention "engine evaluation", "centipawns", or numerical scores. Just talk about the chess position natively.`;

    const userPrompt = `
Current Position (FEN): ${move.fenBefore}
Player: ${colorName}
Move Played: ${move.san}
Classification (by engine): ${cls.name}
Engine's Preferred Best Move: ${bestMoveSAN}

Provide your coaching comment for the move played:`;

    try {
      this.isGenerating = true;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [{
            parts: [{ text: userPrompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 100,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      if (data.candidates && data.candidates.length > 0) {
        let aiText = data.candidates[0].content.parts[0].text.trim();
        
        // Remove any markdown bolding the AI might have accidentally added
        aiText = aiText.replace(/\\*\\*/g, '');
        
        // Add the engine suggestion box if it was a mistake/blunder
        if (['Inaccuracy', 'Mistake', 'Blunder', 'Miss'].includes(cls.name) && bestMoveSAN !== "Unknown") {
          aiText += `<span class="coach-suggestion">Engine prefers ${bestMoveSAN}</span>`;
        }

        this.cache.set(cacheKey, aiText);
        onComplete(aiText);
      } else {
        throw new Error('No content from AI');
      }
    } catch (error) {
      console.error("AI Coach Error:", error);
      // Fallback
      const fallback = Coach.generateComment(move, cls, result);
      onComplete(fallback);
      if (onError) onError(error);
    } finally {
      this.isGenerating = false;
    }
  }
}

// Global instance
const aiCoach = new AICoach();
