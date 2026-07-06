// @ts-nocheck
/* eslint-disable no-restricted-globals */

self.onmessage = function(e) {
  const { 
    type, 
    scalarData, 
    dimensions, 
    spacing, 
    origin, 
    direction, 
    splinePoints,
    crossSectionIndex,
    panorexHeight = 100, // mm
    crossSectionWidth = 40, // mm
    crossSectionHeight = 40, // mm
    resolution = 0.5 // mm per pixel
  } = e.data;

  if (type === 'GENERATE') {
    try {
      const result = generateCurvedData(
        scalarData, dimensions, spacing, origin, direction, splinePoints, 
        panorexHeight, crossSectionWidth, crossSectionHeight, resolution, crossSectionIndex
      );
      self.postMessage({ type: 'SUCCESS', payload: result });
    } catch (err) {
      self.postMessage({ type: 'ERROR', payload: err.message });
    }
  }
};

function generateCurvedData(
  scalarData, dims, spacing, origin, direction, splinePoints,
  panHeight, csWidth, csHeight, res, csIndex
) {
  // 1. Resample spline to be equidistant by `res` (mm)
  const resampled = resampleSpline(splinePoints, res);
  if (resampled.length < 2) throw new Error("Spline too short");

  const panWidthPixels = resampled.length;
  const panHeightPixels = Math.floor(panHeight / res);

  // Buffer for Panorex Image (RGBA)
  const panBuffer = new Uint8ClampedArray(panWidthPixels * panHeightPixels * 4);

  // Pre-calculate inverse direction matrix (assuming orthogonal for simplicity in this MVP, 
  // though real Cornerstone uses full 3x3. We'll implement a basic world-to-index).
  // Cornerstone world to index:
  // index = (World - Origin) * Inverse(Direction * Spacing)
  // For standard axial scans, direction is roughly identity.
  // We'll do a robust but slow inverse.
  
  const d00=direction[0]*spacing[0], d01=direction[3]*spacing[1], d02=direction[6]*spacing[2];
  const d10=direction[1]*spacing[0], d11=direction[4]*spacing[1], d12=direction[7]*spacing[2];
  const d20=direction[2]*spacing[0], d21=direction[5]*spacing[1], d22=direction[8]*spacing[2];
  
  const det = d00*(d11*d22 - d12*d21) - d01*(d10*d22 - d12*d20) + d02*(d10*d21 - d11*d20);
  const invDet = 1.0 / det;

  const i00 = (d11*d22 - d12*d21)*invDet, i01 = (d02*d21 - d01*d22)*invDet, i02 = (d01*d12 - d02*d11)*invDet;
  const i10 = (d12*d20 - d10*d22)*invDet, i11 = (d00*d22 - d02*d20)*invDet, i12 = (d02*d10 - d00*d12)*invDet;
  const i20 = (d10*d21 - d11*d20)*invDet, i21 = (d01*d20 - d00*d21)*invDet, i22 = (d00*d11 - d01*d10)*invDet;

  function worldToIndex(wx, wy, wz) {
    const dx = wx - origin[0];
    const dy = wy - origin[1];
    const dz = wz - origin[2];
    return [
      dx*i00 + dy*i01 + dz*i02,
      dx*i10 + dy*i11 + dz*i12,
      dx*i20 + dy*i21 + dz*i22
    ];
  }

  // Find Min/Max scalar values for Window/Level (rough estimate)
  // Let's assume standard dental CBCT: min ~ -1000, max ~ 3000
  const ww = 4000;
  const wl = 1000;
  const minVal = wl - ww/2;
  const maxVal = wl + ww/2;

  function getPixelIntensity(ix, iy, iz) {
    const x = Math.round(ix);
    const y = Math.round(iy);
    const z = Math.round(iz);
    if (x < 0 || x >= dims[0] || y < 0 || y >= dims[1] || z < 0 || z >= dims[2]) return 0;
    
    const idx = x + y * dims[0] + z * dims[0] * dims[1];
    let val = scalarData[idx];
    
    // Window Leveling
    let norm = (val - minVal) / ww;
    norm = Math.max(0, Math.min(1, norm));
    return Math.floor(norm * 255);
  }

  // Generate Panorex
  const zStart = splinePoints[0].z - panHeight/2;
  
  for (let u = 0; u < panWidthPixels; u++) {
    const pt = resampled[u];
    for (let v = 0; v < panHeightPixels; v++) {
      const z = zStart + v * res;
      const idx = worldToIndex(pt.x, pt.y, z);
      const intensity = getPixelIntensity(idx[0], idx[1], idx[2]);
      
      // Y-axis inverted for canvas drawing
      const outY = panHeightPixels - 1 - v;
      const outIdx = (outY * panWidthPixels + u) * 4;
      panBuffer[outIdx] = intensity;
      panBuffer[outIdx+1] = intensity;
      panBuffer[outIdx+2] = intensity;
      panBuffer[outIdx+3] = 255;
    }
  }

  // Generate Cross-Section at csIndex
  const csWidthPixels = Math.floor(csWidth / res);
  const csHeightPixels = Math.floor(csHeight / res);
  const csBuffer = new Uint8ClampedArray(csWidthPixels * csHeightPixels * 4);

  let targetIndex = csIndex !== undefined ? csIndex : Math.floor(resampled.length / 2);
  if (targetIndex >= resampled.length) targetIndex = resampled.length - 1;
  if (targetIndex < 0) targetIndex = 0;

  const centerPt = resampled[targetIndex];
  
  // Calculate Normal (perpendicular to tangent)
  // Tangent from adjacent points
  let prev = targetIndex > 0 ? resampled[targetIndex-1] : centerPt;
  let next = targetIndex < resampled.length - 1 ? resampled[targetIndex+1] : centerPt;
  if (prev === centerPt && next !== centerPt) prev = {x: centerPt.x - (next.x - centerPt.x), y: centerPt.y - (next.y - centerPt.y)};
  if (next === centerPt && prev !== centerPt) next = {x: centerPt.x + (centerPt.x - prev.x), y: centerPt.y + (centerPt.y - prev.y)};

  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  const len = Math.sqrt(dx*dx + dy*dy);
  // Tangent = (dx/len, dy/len)
  // Normal (pointing outwards/inwards) = (-dy/len, dx/len)
  const nx = -dy/len;
  const ny = dx/len;

  const csZStart = centerPt.z - csHeight/2;

  for (let c = 0; c < csWidthPixels; c++) {
    const offset = (c - csWidthPixels/2) * res;
    const wx = centerPt.x + nx * offset;
    const wy = centerPt.y + ny * offset;

    for (let v = 0; v < csHeightPixels; v++) {
      const z = csZStart + v * res;
      const idx = worldToIndex(wx, wy, z);
      const intensity = getPixelIntensity(idx[0], idx[1], idx[2]);

      const outY = csHeightPixels - 1 - v;
      const outIdx = (outY * csWidthPixels + c) * 4;
      csBuffer[outIdx] = intensity;
      csBuffer[outIdx+1] = intensity;
      csBuffer[outIdx+2] = intensity;
      csBuffer[outIdx+3] = 255;
    }
  }

  return {
    panorex: {
      width: panWidthPixels,
      height: panHeightPixels,
      buffer: panBuffer
    },
    crossSection: {
      width: csWidthPixels,
      height: csHeightPixels,
      buffer: csBuffer
    },
    resampledPointsCount: resampled.length
  };
}

function resampleSpline(points, step) {
  if (points.length < 2) return points;
  
  const resampled = [];
  resampled.push(points[0]);
  
  let currentPt = points[0];
  let nextIdx = 1;
  
  while (nextIdx < points.length) {
    const targetPt = points[nextIdx];
    const dx = targetPt.x - currentPt.x;
    const dy = targetPt.y - currentPt.y;
    const dz = targetPt.z - currentPt.z;
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    if (dist < step) {
      currentPt = targetPt;
      nextIdx++;
      continue;
    }
    
    const ratio = step / dist;
    const newPt = {
      x: currentPt.x + dx * ratio,
      y: currentPt.y + dy * ratio,
      z: currentPt.z + dz * ratio
    };
    
    resampled.push(newPt);
    currentPt = newPt;
  }
  
  return resampled;
}
