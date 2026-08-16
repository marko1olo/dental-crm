/**
 * PeriodontalChartingEngine.ts
 * 
 * Provides calculation logic for:
 * 1. Clinical Attachment Level (CAL = Pocket Depth + Recession)
 * 2. Bleeding on Probing (BOP) Index
 * 3. O'Leary Plaque Index
 * 4. Miller Mobility & Furcation indices
 */

export interface PeriodontalPoint {
  pocketDepth: number;
  recession: number;
  hasBleeding: boolean;
  hasPlaque: boolean;
}

export interface ToothChart {
  toothId: string;
  points: {
    mesioBuccal: PeriodontalPoint;
    buccal: PeriodontalPoint;
    distoBuccal: PeriodontalPoint;
    mesioLingual: PeriodontalPoint;
    lingual: PeriodontalPoint;
    distoLingual: PeriodontalPoint;
  };
  mobility: '0' | 'I' | 'II' | 'III';
  furcation: '0' | 'I' | 'II' | 'III';
}

export class PeriodontalChartingEngine {
  calculateCAL(point: PeriodontalPoint): number {
    return point.pocketDepth + point.recession;
  }

  calculateBOP(chart: ToothChart[]): number {
    const points = this.getAllPoints(chart);
    if (points.length === 0) return 0;
    const bleedingPoints = points.filter(p => p.hasBleeding).length;
    return (bleedingPoints / points.length) * 100;
  }

  calculateOLearyIndex(chart: ToothChart[]): number {
    const points = this.getAllPoints(chart);
    if (points.length === 0) return 0;
    const plaquePoints = points.filter(p => p.hasPlaque).length;
    return (plaquePoints / points.length) * 100;
  }

  private getAllPoints(chart: ToothChart[]): PeriodontalPoint[] {
    return chart.flatMap(c => Object.values(c.points));
  }
}
