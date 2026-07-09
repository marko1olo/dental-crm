const svgPathBbox = require('svg-path-bbox');

const geom = {
  root: "M25 85 C 20 55, 10 30, 20 5 C 30 -5, 45 5, 50 30 C 50 50, 48 70, 50 85 C 52 70, 50 50, 50 30 C 55 5, 70 -5, 80 5 C 90 30, 80 55, 75 85",
  crown: "M20 85 C 13 105, 3 135, 38 139 C 45 139, 50 139, 50 125 C 50 135, 55 136, 62 137 C 100 135, 88 105, 92 85 Z"
};

const rootBox = svgPathBbox(geom.root);
const crownBox = svgPathBbox(geom.crown);

console.log("Root bounds:", rootBox);
console.log("Crown bounds:", crownBox);
