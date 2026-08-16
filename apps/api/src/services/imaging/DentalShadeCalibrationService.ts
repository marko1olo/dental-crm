export type VitaClassicalShade = 'A1' | 'A2' | 'A3' | 'A3.5' | 'A4' | 'B1' | 'B2' | 'B3' | 'B4' | 'C1' | 'C2' | 'C3' | 'C4' | 'D2' | 'D3' | 'D4';

export type Vita3DMasterShade = `${1|2|3|4|5}M${1|2|3}`;
export type BleachShade = 'BL1' | 'BL2' | 'BL3' | 'BL4';

export type ShadeScale = 'VITA_CLASSICAL' | 'VITA_3D_MASTER' | 'BLEACH';

export interface CalibrationMetadata {
  hasReferenceScale: boolean;
  hasCrossPolarization: boolean;
  lightingCondition: 'D65' | 'TL84' | 'A';
}

export class DentalShadeCalibrationService {
  private static readonly CLASSICAL_SHADES: Set<string> = new Set([
    'A1', 'A2', 'A3', 'A3.5', 'A4', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4', 'D2', 'D3', 'D4'
  ]);

  private static readonly BLEACH_SHADES: Set<string> = new Set(['BL1', 'BL2', 'BL3', 'BL4']);

  /**
   * Validates if the calibration photo meets clinical standards for shade analysis.
   */
  public validateCalibrationPhoto(meta: CalibrationMetadata): boolean {
    if (!meta.hasReferenceScale) {
      console.error('Calibration validation failed: No reference scale detected.');
      return false;
    }
    if (!meta.hasCrossPolarization) {
      console.error('Calibration validation failed: Cross-polarization filter missing or ineffective (glare detected).');
      return false;
    }
    return true;
  }

  /**
   * Calibrates the detected shade value against the standard clinical scales.
   */
  public calibrate(shade: string, scale: ShadeScale): string {
    switch (scale) {
      case 'VITA_CLASSICAL':
        if (!DentalShadeCalibrationService.CLASSICAL_SHADES.has(shade)) {
          throw new Error(`Invalid shade '${shade}' for VITA Classical scale.`);
        }
        return shade;
      
      case 'BLEACH':
        if (!DentalShadeCalibrationService.BLEACH_SHADES.has(shade)) {
          throw new Error(`Invalid shade '${shade}' for Bleach scale.`);
        }
        return shade;

      case 'VITA_3D_MASTER':
        // Simplified regex validation for 1M1-5M3 pattern
        if (!/^[1-5]M[1-3]$/.test(shade)) {
          throw new Error(`Invalid shade '${shade}' for VITA 3D-Master scale.`);
        }
        return shade;

      default:
        throw new Error(`Unsupported scale: ${scale}`);
    }
  }
}
