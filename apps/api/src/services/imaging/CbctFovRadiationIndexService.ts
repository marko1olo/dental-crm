export type FovSize = 'SMALL_5x5' | 'MEDIUM_8x8' | 'LARGE_12x10';

export interface RadiationData {
  effectiveDoseMicrosv: number;
  dapMgyCm2: number;
}

export class CbctFovRadiationIndexService {
  private static readonly FOV_DATA: Record<FovSize, RadiationData> = {
    'SMALL_5x5': { effectiveDoseMicrosv: 22.5, dapMgyCm2: 225 },
    'MEDIUM_8x8': { effectiveDoseMicrosv: 60, dapMgyCm2: 525 },
    'LARGE_12x10': { effectiveDoseMicrosv: 120, dapMgyCm2: 1050 },
  };

  public calculate(fov: FovSize): RadiationData {
    const data = CbctFovRadiationIndexService.FOV_DATA[fov];
    if (!data) {
      throw new Error(`Invalid FOV size: ${fov}`);
    }
    return { ...data };
  }
}
