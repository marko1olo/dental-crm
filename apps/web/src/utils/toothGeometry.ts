export type ToothGeometryType = {
  root: string;
  crown: string;
  canals?: string;
  fissures?: string;
  core?: string;
  apex?: { x: number; y: number }[];
  surfaces: {
    V: string;
    O: string;
    M: string;
    D: string;
    [key: string]: string;
  };
};

export const TOOTH_GEOMETRY = {
  UPPER_CENTRAL_INCISOR: {
    root: "M35 85 C33 60, 35 25, 50 5 C65 25, 67 60, 65 85 Z",
    crown: "M35 85 C30 95, 22 125, 32 145 C40 148, 60 148, 68 145 C72 125, 75 95, 65 85 Q50 82 35 85",
    canals: "M50 120 C 52 90, 48 50, 50 15", 
    apex: [{ x: 50, y: 5 }],
    core: "M42 85 L44 115 Q50 120 56 115 L58 85 Z", 
    surfaces: {
      V: "M35 85 C40 90, 60 90, 65 85 L68 115 Q50 120 32 115 Z",
      O: "M32 115 Q50 120 68 115 L68 145 C60 148, 40 148, 32 145 Z",
      M: "M35 85 C30 95, 28 125, 32 145 L42 145 L42 85 Z",
      D: "M65 85 C70 95, 72 125, 68 145 L58 145 L58 85 Z"
    }
  },

  UPPER_LATERAL_INCISOR: {
    root: "M38 85 C36 60, 40 30, 50 10 C60 30, 64 60, 62 85 Z",
    crown: "M38 85 C34 95, 35 120, 40 135 C45 138, 55 138, 60 135 C65 120, 66 95, 62 85 Q50 82 38 85",
    fissures: "M50 129 L50 135",
    core: "M42 85 L44 115 Q50 120 56 115 L58 85 Z", 
    canals: "M50 120 C 51 90, 49 40, 52 15", 
    apex: [{ x: 50, y: 10 }],
    surfaces: {
      V: "M38 85 C42 90, 58 90, 62 85 L62 105 Q50 110 38 105 Z",
      O: "M38 105 Q50 110 62 105 L60 135 C55 138, 45 138, 40 135 Z",
      M: "M38 85 C34 95, 35 120, 40 135 L45 135 L45 85 Z",
      D: "M62 85 C66 95, 65 120, 60 135 L55 135 L55 85 Z"
    }
  },

  UPPER_CANINE: {
    root: "M35 85 C33 50, 38 30, 45 2 C60 15, 67 50, 65 85 Z",
    crown: "M35 85 C30 105, 15 125, 53 148 C65 135, 90 115, 65 85 Q50 80 35 85",
    core: "M42 85 L44 115 Q50 120 56 115 L58 85 Z", 
    canals: "M50 125 C 53 90, 47 40, 50 5", 
    apex: [{ x: 45, y: 2 }],
    surfaces: {
      V: "M35 85 C40 90, 60 90, 65 85 L65 115 Q50 120 35 115 Z",
      O: "M35 115 Q50 120 65 115 L50 148 Z",
      M: "M35 85 C30 105, 35 125, 50 148 C45 125, 40 105, 35 85 Z",
      D: "M65 85 C70 105, 65 125, 50 148 C55 125, 60 105, 65 85 Z"
    }
  },

  UPPER_PREMOLAR: {
    root: "M32 85 C30 60, 35 25, 43 19 C50 32, 50 32, 52 15 C65 25, 70 60, 68 85 Z",
    crown: "M33 85 C25 100, 8 135, 40 142 Q50 138 68 142 C79 135, 75 100, 68 85 Q50 82 32 85",
    canals: "M50 115 Q 45 70 42 20 M50 115 Q 55 70 58 20", 
    core: "M38 85 L40 110 Q50 115 60 110 L62 85 Z",
    apex: [{ x: 43, y: 19 }, { x: 52, y: 15 }],
    surfaces: {
      V: "M32 85 C35 90, 65 90, 68 85 L68 110 Q50 115 32 110 Z",
      O: "M32 110 Q50 115 68 110 L68 142 C50 138, 40 142, 32 142 Z",
      M: "M33 85 C15 100, 8 135, 40 142 C30 130, 30 100, 33 85 Z",
      D: "M68 85 C75 100, 79 135, 60 142 C65 130, 65 100, 68 85 Z"
    }
  },

  UPPER_MOLAR: {
    root: "M45 50 C 45 25, 45 20, 50 6 C 55 2, 67 10, 58 45 Q 50 65 42 46 M20 85 C 20 60, 18 65, 25 10 C 29 5, 40 25, 42 45 Q 50 65 58 45 C 60 25, 68 5, 79 4 C 82 25, 80 80, 92 85 Z",
    crown: "M20 85 C 13 105, 3 135, 38 139 C 45 139, 50 139, 50 125 C 50 135, 55 136, 62 137 C 100 135, 88 105, 92 85 Z",
    canals: "M50 110 C 30 100, 40 60, 30 5 M50 110 C 60 100, 70 60, 70 15 M50 110 C 50 80, 55 50, 50 10",
    apex: [{ x: 50, y: 6 }, { x: 25, y: 10 }, { x: 79, y: 4 }],
    core: "M30 85 L35 110 Q55 115 75 110 L80 85 Z",
    fissures: "M50 115 L50 125",
    surfaces: {
      V: "M20 85 C30 90, 80 90, 92 85 L92 110 Q50 115 20 110 Z",
      O: "M20 110 Q50 115 92 110 L62 137 C50 125, 38 139, 20 130 Z",
      M: "M20 85 C13 105, 3 135, 38 139 C30 125, 25 105, 20 85 Z",
      D: "M92 85 C88 105, 100 135, 62 137 C75 125, 85 105, 92 85 Z"
    }
  },

  LOWER_INCISOR: {
    root: "M40 75 C38 100, 42 135, 50 145 C58 135, 62 100, 60 75 Z",
    crown: "M40 75 C36 60, 36 35, 40 25 C45 22, 55 22, 60 25 C64 35, 64 60, 60 75 Q50 78 40 75",
    fissures: "M45 23 L45 30 M55 30 L55 23",
    canals: "M50 55 C 51 80, 49 110, 50 140",
    core: "M44 75 L46 45 Q50 40 54 45 L56 75 Z",
    apex: [{ x: 50, y: 145 }],
    surfaces: {
      V: "M40 75 C42 70, 58 70, 60 75 L60 55 Q50 50 40 55 Z",
      O: "M40 55 Q50 50 60 55 L60 25 C55 22, 45 22, 40 25 Z",
      M: "M40 75 C36 60, 36 35, 40 25 C40 45, 40 65, 40 75 Z",
      D: "M60 75 C64 60, 64 35, 60 25 C60 45, 60 65, 60 75 Z"
    }
  },

  LOWER_CANINE: {
    root: "M35 72 C33 100, 40 140, 50 150 C60 140, 67 100, 65 72 Z",
    crown: "M35 72 C30 55, 35 30, 50 12 C65 30, 70 55, 65 72 Q50 75 35 72",
    canals: "M50 55 C 52 80, 48 110, 50 145",
    core: "M44 75 L46 45 Q50 40 54 45 L56 75 Z",
    apex: [{ x: 50, y: 150 }],
    surfaces: {
      V: "M35 72 C40 68, 60 68, 65 72 L65 45 Q50 40 35 45 Z",
      O: "M35 45 Q50 40 65 45 L50 12 Z",
      M: "M35 72 C30 55, 35 30, 50 12 C45 35, 40 55, 35 72 Z",
      D: "M65 72 C70 55, 65 30, 50 12 C55 35, 60 55, 65 72 Z"
    }
  },

  LOWER_PREMOLAR: {
    root: "M32 75 C30 100, 35 140, 50 145 C65 140, 70 100, 68 75 Z",
    crown: "M32 75 C25 60, 28 35, 40 28 Q50 32 60 28 C72 35, 75 60, 68 75 Q50 78 32 75",
    canals: "M50 55 C 52 80, 48 110, 50 140",
    core: "M38 75 L40 50 Q50 45 60 50 L62 75 Z",
    apex: [{ x: 50, y: 145 }],
    surfaces: {
      V: "M32 75 C35 70, 65 70, 68 75 L68 50 Q50 45 32 50 Z",
      O: "M32 50 Q50 45 68 50 L60 28 C50 32, 40 28, 32 35 Z",
      M: "M32 75 C25 60, 28 35, 40 28 C35 45, 35 60, 32 75 Z",
      D: "M68 75 C75 60, 72 35, 60 28 C65 45, 65 60, 68 75 Z"
    }
  },

  LOWER_MOLAR: {
    root: "M15 80 C8 110, 19 135, 20 145 C33 145, 35 125, 38 115 Q49 85 52 100 C55 105, 62 145, 70 150 C80 145, 85 110, 85 80 Z",
    crown: "M15 80 C5 40, 15 35, 30 25 C40 20, 48 23, 50 30 C52 23, 60 20, 70 23 C85 35, 95 30, 85 80 Q50 85 15 80",
    fissures: "M50 30 L50 40 55 M50 55 L50 80",
    core: "M25 80 L30 55 Q50 50 70 55 L75 80 Z",
    canals: "M50 60 Q 25 70 30 140 M50 60 Q 75 70 70 145",
    apex: [{ x: 20, y: 145 }, { x: 80, y: 145 }],
    surfaces: {
      V: "M15 80 C20 75, 80 75, 85 80 L85 55 Q50 50 15 55 Z",
      O: "M15 55 Q50 50 85 55 L70 23 C50 30, 30 25, 15 40 Z",
      M: "M15 80 C5 40, 15 35, 30 25 C25 45, 20 60, 15 80 Z",
      D: "M85 80 C95 30, 85 35, 70 23 C75 45, 80 60, 85 80 Z"
    }
  }
} satisfies Record<string, ToothGeometryType>;

export const getToothPath = (toothId: number): ToothGeometryType => {
  const quadrant = Math.floor(toothId / 10);
  const index = toothId % 10;

  if (quadrant === 1 || quadrant === 2) { 
    if (index === 1) return TOOTH_GEOMETRY.UPPER_CENTRAL_INCISOR;
    if (index === 2) return TOOTH_GEOMETRY.UPPER_LATERAL_INCISOR;
    if (index === 3) return TOOTH_GEOMETRY.UPPER_CANINE;
    if (index <= 5) return TOOTH_GEOMETRY.UPPER_PREMOLAR;
    return TOOTH_GEOMETRY.UPPER_MOLAR;
  } else { 
    if (index <= 2) return TOOTH_GEOMETRY.LOWER_INCISOR;
    if (index === 3) return TOOTH_GEOMETRY.LOWER_CANINE;
    if (index <= 5) return TOOTH_GEOMETRY.LOWER_PREMOLAR;
    return TOOTH_GEOMETRY.LOWER_MOLAR;
  }
};

export const getToothConfig = (toothId: number) => {
  const num = toothId % 10;
  if (num <= 2) return { width: "36px", height: "56px", viewWidth: 100, viewHeight: 150 };
  if (num === 3) return { width: "40px", height: "64px", viewWidth: 100, viewHeight: 150 };
  if (num <= 5) return { width: "44px", height: "70px", viewWidth: 100, viewHeight: 150 };
  return { width: "50px", height: "78px", viewWidth: 100, viewHeight: 150 };
};
