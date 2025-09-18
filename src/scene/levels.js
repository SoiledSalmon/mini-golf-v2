export const levels = {
  1: {
    holePos: [5, -3],
    obstacles: [],
    trees: true,
  },
  2: {
    holePos: [-6, 4],
    obstacles: [
      { type: "block", pos: [0, 0], size: [3, 1, 0.6] }, // simple barrier
    ],
    trees: true,
  },
  3: {
    holePos: [7, 7],
    obstacles: [
      { type: "wall", pos: [0, -2], size: [10, 1, 0.3] },
      { type: "block", pos: [2, 3], size: [2, 1, 0.6] },
    ],
    trees: true,
  },
  4: {
    holePos: [-8, -6],
    obstacles: [
      { type: "wall", pos: [0, 2], size: [12, 1, 0.3] },
      { type: "block", pos: [-3, -3], size: [2, 1, 0.6] },
      { type: "block", pos: [4, -4], size: [1.5, 1, 0.6] },
    ],
    trees: true,
  },
};
