/**
 * ApexLocatorWorkingLengthService.ts — Сервис учета рабочей длины корневых каналов
 * 
 * КЛИНИЧЕСКИЙ ПРОТОКОЛ (Эндодонтия):
 * 1. Учет каналов по зубам (ISO 3950 FDI).
 * 2. Фиксация:
 *    - Референтная точка (бугор/режущий край)
 *    - Показания апекслокатора (0.0 — апекс, 0.5 — апикальное сужение)
 *    - Рабочая длина (мм, валидный диапазон 15–30 мм)
 *    - Размер мастер-файла (ISO)
 * 3. Валидация полноты каналов (например, МВ2 в верхних молярах).
 */

export type CanalName = 
  | "MB1" | "MB2" | "DB" | "P" // Верхние моляры
  | "M" | "D" | "B" | "L"       // Другие
  | "main";

export interface CanalMeasurement {
  readonly canal: CanalName;
  readonly referencePoint: string; // e.g., "мезиально-щечный бугор"
  readonly apexLocatorReading: number; // 0.0 – 1.0
  readonly workingLengthMm: number;    // 15 – 30 мм
  readonly masterFileIso: number;      // 20, 25, 30, 35...
  readonly taper: 0.04 | 0.06;
}

export interface ToothMeasurementRecord {
  readonly id: string;
  readonly toothNumber: number;
  readonly measuredAt: Date;
  readonly channels: CanalMeasurement[];
}

export class ApexLocatorWorkingLengthService {
  public static readonly MIN_WL = 15;
  public static readonly MAX_WL = 30;

  public static validateWorkingLength(length: number): void {
    if (length < this.MIN_WL || length > this.MAX_WL) {
      throw new Error(`Рабочая длина ${length} мм вне диапазона [${this.MIN_WL}, ${this.MAX_WL}].`);
    }
  }

  public static validateCanalCompleteness(toothNumber: number, channels: CanalMeasurement[]): string[] {
    const warnings: string[] = [];
    // Пример: Верхние моляры (16, 26) должны иметь МВ2
    if ([16, 26].includes(toothNumber)) {
      const canalNames = channels.map(c => c.canal);
      if (!canalNames.includes("MB2")) {
        warnings.push(`В зубе ${toothNumber} не зафиксирован канал МВ2 (типично для верхних моляров).`);
      }
    }
    return warnings;
  }

  public static createRecord(toothNumber: number, channels: CanalMeasurement[]): ToothMeasurementRecord {
    channels.forEach(c => this.validateWorkingLength(c.workingLengthMm));
    
    return {
      id: crypto.randomUUID(),
      toothNumber,
      measuredAt: new Date(),
      channels,
    };
  }
}
