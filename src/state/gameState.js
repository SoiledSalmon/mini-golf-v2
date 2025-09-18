export const gameState = {
  currentHole: 1,
  strokes: 0,
  par: 3,
  totalScore: 0,

  setHole(holeIndex, par) {
    this.currentHole = holeIndex;
    this.par = par;
    this.strokes = 0;
  },

  addStroke() {
    this.strokes++;
  },

  completeHole() {
    this.totalScore += (this.strokes - this.par);
  }
};
