export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface ImplantPlanningState {
  id: string;
  brand: string;
  diameter: number;
  length: number;
  position: Point3D;
}

/**
 * Calculates the Euclidean distance between two 3D points.
 */
function distance(p1: Point3D, p2: Point3D): number {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) + 
    Math.pow(p1.y - p2.y, 2) + 
    Math.pow(p1.z - p2.z, 2)
  );
}

/**
 * Projects a point onto a line segment and returns the projected point
 * and the parameter t (0 to 1) along the segment.
 */
function projectPointOnSegment(p: Point3D, a: Point3D, b: Point3D): { pt: Point3D, t: number } {
  const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const ap = { x: p.x - a.x, y: p.y - a.y, z: p.z - a.z };
  
  const abSquared = ab.x * ab.x + ab.y * ab.y + ab.z * ab.z;
  if (abSquared === 0) return { pt: a, t: 0 };
  
  let t = (ap.x * ab.x + ap.y * ab.y + ap.z * ab.z) / abSquared;
  t = Math.max(0, Math.min(1, t)); // Clamp to segment
  
  return {
    pt: {
      x: a.x + t * ab.x,
      y: a.y + t * ab.y,
      z: a.z + t * ab.z
    },
    t
  };
}

/**
 * Принимает 3D точку установленного на КТ имплантата и массив точек
 * аппроксимированного сплайна челюсти. Возвращает номер зуба по стандарту FDI (11-48).
 */
export function mapCtCoordinatesToFdiNumber(
  implantPos: Point3D,
  splinePoints: Point3D[]
): number {
  if (splinePoints.length < 2) return 11; // Fallback

  // 1. Calculate total length of the spline
  let totalLength = 0;
  const segmentLengths: number[] = [];
  for (let i = 0; i < splinePoints.length - 1; i++) {
    const p1 = splinePoints[i];
    const p2 = splinePoints[i+1];
    if (p1 && p2) {
      const len = distance(p1, p2);
      segmentLengths.push(len);
      totalLength += len;
    } else {
      segmentLengths.push(0);
    }
  }

  // 2. Find the closest projection of the implant onto the spline
  let minDistance = Infinity;
  let bestArcLength = 0;

  let currentArcLength = 0;
  for (let i = 0; i < splinePoints.length - 1; i++) {
    const a = splinePoints[i];
    const b = splinePoints[i+1];
    
    if (a && b) {
      const { pt, t } = projectPointOnSegment(implantPos, a, b);
      const dist = distance(implantPos, pt);
      
      if (dist < minDistance) {
        minDistance = dist;
        bestArcLength = currentArcLength + (t * (segmentLengths[i] || 0));
      }
      currentArcLength += (segmentLengths[i] || 0);
    }
  }

  // 3. Normalized position on the curve [0.0, 1.0]
  // Normalize arc ratio
  let ratio = totalLength > 0 ? bestArcLength / totalLength : 0;
  
  // Ensure ratio runs from Patient Right (0.0) to Patient Left (1.0)
  // Assuming the spline starts at Patient Right and goes to Patient Left.

  // 4. Map to FDI tooth number
  // A full arch has 16 teeth.
  // ratio ranges:
  // [0.00, 0.50) -> Right quadrant (teeth 8 to 1)
  // [0.50, 1.00] -> Left quadrant (teeth 1 to 8)
  
  // Z logic: if implant is placed above the mean Z of the jaw spline, we assume it's maxilla.
  // Wait, if it's a mandibular nerve spline, it might be in the mandible. Let's just use Z comparison:
  const midPoint = splinePoints[Math.floor(splinePoints.length/2)];
  const isMaxilla = midPoint && implantPos.z > midPoint.z;  
  
  const rightTeeth = [8, 7, 6, 5, 4, 3, 2, 1]; // From back to midline
  const leftTeeth = [1, 2, 3, 4, 5, 6, 7, 8];  // From midline to back

  let toothId = 1;
  let quadrant = 1; // 1: Upper Right, 2: Upper Left, 3: Lower Left, 4: Lower Right

  if (ratio <= 0.5) {
    // Right side
    const normalizedRatio = ratio / 0.5; // [0.0, 1.0] from back to midline
    const index = Math.floor(normalizedRatio * rightTeeth.length);
    toothId = rightTeeth[Math.min(index, rightTeeth.length - 1)] || 1;
    quadrant = isMaxilla ? 1 : 4;
  } else {
    // Left side
    const normalizedRatio = (ratio - 0.5) / 0.5; // [0.0, 1.0] from midline to back
    const index = Math.floor(normalizedRatio * leftTeeth.length);
    toothId = leftTeeth[Math.min(index, leftTeeth.length - 1)] || 1;
    quadrant = isMaxilla ? 2 : 3;
  }

  const fdiStr = `${quadrant}${toothId}`;
  return parseInt(fdiStr, 10);
}
