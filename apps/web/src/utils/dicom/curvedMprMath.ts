export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface CurveFrame {
  point: Point3D;
  tangent: Point3D;
  normal: Point3D; // Perpendicular to tangent (pointing inward/outward)
  up: Point3D;     // Z axis usually
}

/**
 * Normalizes a 3D vector
 */
function normalize(v: Point3D): Point3D {
  const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (length === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

/**
 * Cross product of two 3D vectors
 */
function cross(a: Point3D, b: Point3D): Point3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

/**
 * Calculates a Catmull-Rom spline from a set of control points
 * @param points Control points (e.g. from SplineROITool)
 * @param samples Number of points to generate for the smooth curve
 */
export function generateCatmullRomSpline(points: Point3D[], samples: number = 200): Point3D[] {
  if (points.length < 2) return points;
  
  const curve: Point3D[] = [];
  
  // To correctly compute the spline, we duplicate the first and last points
  // to act as ghost control points for the tangents.
  const pList = [points[0]!, ...points, points[points.length - 1]!];
  
  for (let i = 1; i < pList.length - 2; i++) {
    const p0 = pList[i - 1]!;
    const p1 = pList[i]!;
    const p2 = pList[i + 1]!;
    const p3 = pList[i + 2]!;
    
    const segmentSamples = Math.floor(samples / (points.length - 1));
    for (let t = 0; t < 1.0; t += 1.0 / segmentSamples) {
      const t2 = t * t;
      const t3 = t2 * t;
      
      const x = 0.5 * (
        (2 * p1.x) +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
      );
      
      const y = 0.5 * (
        (2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
      );
      
      const z = 0.5 * (
        (2 * p1.z) +
        (-p0.z + p2.z) * t +
        (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
        (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3
      );
      
      curve.push({ x, y, z });
    }
  }
  
  // Add the last point
  curve.push(points[points.length - 1]!);
  return curve;
}

/**
 * Calculates the Frenet-Serret frames (tangents and normals) for every point on the curve.
 * This is essential for generating Cross-Sections (trans-axial cuts).
 */
export function calculateCurveFrames(curve: Point3D[]): CurveFrame[] {
  if (curve.length < 2) return [];
  
  const frames: CurveFrame[] = [];
  const up: Point3D = { x: 0, y: 0, z: -1 }; // Usually Z is up/down in dental CBCT
  
  for (let i = 0; i < curve.length; i++) {
    const p = curve[i]!;
    let tangent: Point3D;
    
    if (i === 0) {
      const next = curve[i + 1]!;
      tangent = normalize({ x: next.x - p.x, y: next.y - p.y, z: next.z - p.z });
    } else if (i === curve.length - 1) {
      const prev = curve[i - 1]!;
      tangent = normalize({ x: p.x - prev.x, y: p.y - prev.y, z: p.z - prev.z });
    } else {
      const next = curve[i + 1]!;
      const prev = curve[i - 1]!;
      tangent = normalize({ x: next.x - prev.x, y: next.y - prev.y, z: next.z - prev.z });
    }
    
    // Cross-section normal is perpendicular to the tangent curve and the Up vector.
    // This gives us the line pointing inside/outside the dental arch.
    const normal = normalize(cross(up, tangent));
    
    frames.push({ point: p, tangent, normal, up });
  }
  
  return frames;
}
