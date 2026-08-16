export type PressureStatus = 'normal' | 'warning' | 'emergency_lockout';

export interface GasPressureReading {
  compressedAirBar: number;
  vacuumBar: number;
  n2oBar: number;
  o2Bar: number;
}

export interface PressureSafetyReport {
  compressedAir: { status: PressureStatus; message?: string };
  vacuum: { status: PressureStatus; message?: string };
  n2o: { status: PressureStatus; message?: string };
  o2: { status: PressureStatus; message?: string };
}

export class MedicalGasPressureSentryService {
  checkReadings(readings: GasPressureReading): PressureSafetyReport {
    return {
      compressedAir: this.checkCompressedAir(readings.compressedAirBar),
      vacuum: this.checkVacuum(readings.vacuumBar),
      n2o: this.checkGas(readings.n2oBar, 'N2O'),
      o2: this.checkGas(readings.o2Bar, 'O2'),
    };
  }

  private checkCompressedAir(bar: number): { status: PressureStatus; message?: string } {
    if (bar < 5.0) return { status: 'emergency_lockout', message: 'Критическое падение давления воздуха' };
    if (bar < 5.5 || bar > 6.5) return { status: 'warning', message: 'Давление воздуха вне нормы' };
    return { status: 'normal' };
  }

  private checkVacuum(bar: number): { status: PressureStatus; message?: string } {
    if (bar > -0.15) return { status: 'emergency_lockout', message: 'Критическая потеря вакуума' };
    if (bar < -0.35 || bar > -0.20) return { status: 'warning', message: 'Вакуум вне нормы' };
    return { status: 'normal' };
  }

  private checkGas(bar: number, gasName: string): { status: PressureStatus; message?: string } {
    if (bar < 3.5) return { status: 'emergency_lockout', message: `Критическое падение давления ${gasName}` };
    if (bar < 4.0 || bar > 5.0) return { status: 'warning', message: `Давление ${gasName} вне нормы` };
    return { status: 'normal' };
  }
}
