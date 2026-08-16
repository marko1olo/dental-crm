export type CeramicType = 'LithiumDisilicate' | 'Feldspathic' | 'Zirconia';
export type HFConcentration = 5 | 9.5;

export interface EtchingProtocol {
  acidConcentration: HFConcentration;
  etchingTimeSeconds: number;
  safetyNotes: string;
}

export class HydrofluoricAcidSafetyService {
  /**
   * Retrieves the etching protocol based on ceramic type and HF concentration.
   * Throws Error if protocol is invalid or unsafe.
   */
  public getEtchingProtocol(ceramic: CeramicType, concentration: HFConcentration): EtchingProtocol {
    switch (ceramic) {
      case 'LithiumDisilicate':
        if (concentration === 5) {
          return {
            acidConcentration: 5,
            etchingTimeSeconds: 20,
            safetyNotes: 'Neutralize with calcium gluconate for 2 minutes before silanization.'
          };
        }
        throw new Error('HF 9.5% is prohibited for Lithium Disilicate (risk of structural degradation).');

      case 'Feldspathic':
        if (concentration === 9.5) {
          return {
            acidConcentration: 9.5,
            etchingTimeSeconds: 60, // Minimum of 60s
            safetyNotes: 'Neutralize with calcium gluconate for 2 minutes before silanization.'
          };
        }
        throw new Error('For Feldspathic ceramics, use HF 9.5% for optimal etching.');

      case 'Zirconia':
        throw new Error('Hydrofluoric acid is strictly prohibited for Zirconia. Use air abrasion (CoJet/Al2O3 50um).');

      default:
        throw new Error('Unknown ceramic type.');
    }
  }

  public validateNeutralization(timeSeconds: number): boolean {
    return timeSeconds >= 120; // 2 minutes
  }
}
