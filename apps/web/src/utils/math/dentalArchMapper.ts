export function mapToothNumber(fdiNumber: number, isPediatric: boolean): number {
  if (!isPediatric) {
    return fdiNumber;
  }

  // Convert adult tooth number to pediatric tooth number if possible
  // FDI Adult: 11-18, 21-28, 31-38, 41-48
  // FDI Pediatric: 51-55, 61-65, 71-75, 81-85

  const quadrant = Math.floor(fdiNumber / 10);
  const toothIndex = fdiNumber % 10;

  // Baby teeth only go up to 5
  if (toothIndex > 5) {
    return fdiNumber;
  }

  let pedQuadrant = quadrant;
  switch (quadrant) {
    case 1: pedQuadrant = 5; break;
    case 2: pedQuadrant = 6; break;
    case 3: pedQuadrant = 7; break;
    case 4: pedQuadrant = 8; break;
  }

  return pedQuadrant * 10 + toothIndex;
}

export function mapCoordinateToTooth(
  x: number,
  y: number,
  z: number,
  isPediatric: boolean
): number | null {
  // Skeleton implementation for mapping 3D coordinates to tooth number.
  // In a real scenario, this would use a spatial bounding box or curve mapping.
  
  // Dummy logic: just return 11 or 51 as an example.
  return isPediatric ? 51 : 11;
}
