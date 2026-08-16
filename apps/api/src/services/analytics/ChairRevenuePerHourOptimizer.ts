import { Decimal } from 'decimal.js';

export interface ChairStats {
  roomId: string;
  specialty: 'surgery' | 'orthopedics' | 'therapy' | 'hygiene';
  totalRevenue: Decimal;
  workedHours: Decimal;
  totalAvailableHours: Decimal; // e.g., working shift duration
}

export interface OptimizationResult {
  roomId: string;
  currentRevenuePerHour: Decimal;
  benchmarkRevenuePerHour: Decimal;
  isPerforming: boolean;
  vacantChairLoss: Decimal;
}

export class ChairRevenuePerHourOptimizer {
  private static readonly BENCHMARKS: Record<ChairStats['specialty'], Decimal> = {
    surgery: new Decimal(15000),
    orthopedics: new Decimal(12000),
    therapy: new Decimal(6000),
    hygiene: new Decimal(4000),
  };

  public static analyze(stats: ChairStats): OptimizationResult {
    const benchmark = this.BENCHMARKS[stats.specialty];
    const currentRevenuePerHour = stats.workedHours.greaterThan(0)
      ? stats.totalRevenue.dividedBy(stats.workedHours)
      : new Decimal(0);

    const vacantHours = stats.totalAvailableHours.minus(stats.workedHours);
    const vacantChairLoss = vacantHours.times(benchmark);

    return {
      roomId: stats.roomId,
      currentRevenuePerHour,
      benchmarkRevenuePerHour: benchmark,
      isPerforming: currentRevenuePerHour.greaterThanOrEqualTo(benchmark),
      vacantChairLoss: vacantChairLoss.greaterThan(0) ? vacantChairLoss : new Decimal(0),
    };
  }
}
