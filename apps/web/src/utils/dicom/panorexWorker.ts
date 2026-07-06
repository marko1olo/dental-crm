export const createPanorexWorker = () => {
  const workerCode = `
    self.onmessage = function(e) {
      const { 
        frames, 
        volumeData, 
        dimensions, 
        spacing, 
        origin, 
        direction,
        panHeight,
        csWidth,
        csHeight,
        res,
        type,
        csIndex,
        ww,
        wl
      } = e.data;

      const d00=direction[0]*spacing[0], d01=direction[3]*spacing[1], d02=direction[6]*spacing[2];
      const d10=direction[1]*spacing[0], d11=direction[4]*spacing[1], d12=direction[7]*spacing[2];
      const d20=direction[2]*spacing[0], d21=direction[5]*spacing[1], d22=direction[8]*spacing[2];
      
      const det = d00*(d11*d22 - d12*d21) - d01*(d10*d22 - d12*d20) + d02*(d10*d21 - d11*d20);
      const invDet = 1.0 / det;

      const i00 = (d11*d22 - d12*d21)*invDet, i01 = (d02*d21 - d01*d22)*invDet, i02 = (d01*d12 - d02*d11)*invDet;
      const i10 = (d12*d20 - d10*d22)*invDet, i11 = (d00*d22 - d02*d20)*invDet, i12 = (d02*d10 - d00*d12)*invDet;
      const i20 = (d10*d21 - d11*d20)*invDet, i21 = (d01*d20 - d00*d21)*invDet, i22 = (d00*d11 - d01*d10)*invDet;

      const worldToIndex = (wx, wy, wz) => {
        const dx = wx - origin[0];
        const dy = wy - origin[1];
        const dz = wz - origin[2];
        return [
          Math.round(dx*i00 + dy*i01 + dz*i02),
          Math.round(dx*i10 + dy*i11 + dz*i12),
          Math.round(dx*i20 + dy*i21 + dz*i22)
        ];
      };

      const getPixel = (x, y, z) => {
        if (x < 0 || x >= dimensions[0] || y < 0 || y >= dimensions[1] || z < 0 || z >= dimensions[2]) return 0;
        return volumeData[x + y * dimensions[0] + z * dimensions[0] * dimensions[1]];
      };

      const minVal = wl - ww/2;
      const getIntensity = (ix, iy, iz) => {
        const val = getPixel(ix, iy, iz);
        let norm = (val - minVal) / ww;
        norm = Math.max(0, Math.min(1, norm));
        return Math.floor(norm * 255);
      };

      if (type === 'PANOREX') {
        const panWidthPixels = frames.length;
        const panHeightPixels = Math.floor(panHeight / res);
        const buffer = new Uint8ClampedArray(panWidthPixels * panHeightPixels * 4);
        
        const zStart = frames[0].point.z - panHeight/2;
        
        for (let u = 0; u < panWidthPixels; u++) {
          const pt = frames[u].point;
          for (let v = 0; v < panHeightPixels; v++) {
            const z = zStart + v * res;
            const idx = worldToIndex(pt.x, pt.y, z);
            const intensity = getIntensity(idx[0], idx[1], idx[2]);
            
            const outY = panHeightPixels - 1 - v;
            const outIdx = (outY * panWidthPixels + u) * 4;
            buffer[outIdx] = intensity;
            buffer[outIdx+1] = intensity;
            buffer[outIdx+2] = intensity;
            buffer[outIdx+3] = 255;
          }
        }
        
        self.postMessage({ type: 'PANOREX_RESULT', buffer, width: panWidthPixels, height: panHeightPixels }, [buffer.buffer]);
      } 
      else if (type === 'CROSS_SECTIONS') {
        const csWidthPixels = Math.floor(csWidth / res);
        const csHeightPixels = Math.floor(csHeight / res);
        const totalSlices = 5;
        const buffer = new Uint8ClampedArray((csWidthPixels * totalSlices) * csHeightPixels * 4);

        for (let sliceOffset = -2; sliceOffset <= 2; sliceOffset++) {
          let targetIndex = csIndex + sliceOffset * 4;
          if (targetIndex >= frames.length) targetIndex = frames.length - 1;
          if (targetIndex < 0) targetIndex = 0;

          const frame = frames[targetIndex];
          const centerPt = frame.point;
          const nx = frame.normal.x;
          const ny = frame.normal.y;

          const csZStart = centerPt.z - csHeight/2;
          
          for (let c = 0; c < csWidthPixels; c++) {
            const offset = (c - csWidthPixels/2) * res;
            const wx = centerPt.x + nx * offset;
            const wy = centerPt.y + ny * offset;

            for (let v = 0; v < csHeightPixels; v++) {
              const z = csZStart + v * res;
              const idx = worldToIndex(wx, wy, z);
              const intensity = getIntensity(idx[0], idx[1], idx[2]);

              const outY = csHeightPixels - 1 - v;
              const outX = (sliceOffset + 2) * csWidthPixels + c;
              
              const outIdx = (outY * (csWidthPixels * totalSlices) + outX) * 4;
              buffer[outIdx] = intensity;
              buffer[outIdx+1] = intensity;
              buffer[outIdx+2] = intensity;
              buffer[outIdx+3] = 255;
            }
          }
        }

        self.postMessage({ type: 'CROSS_SECTIONS_RESULT', buffer, width: csWidthPixels * totalSlices, height: csHeightPixels }, [buffer.buffer]);
      }
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};
