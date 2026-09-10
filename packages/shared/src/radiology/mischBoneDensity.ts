/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL DENTAL CBCT: MISCH BONE DENSITY & OSTEOTOMY BED SAMPLING ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Quantitative bone quality evaluation at dental implant osteotomy sites.
 * Implements the Carl E. Misch bone density classification (D1–D5):
 * - D1: Dense cortical bone (> 1250 GV / HU)
 * - D2: Thick porous cortical and dense trabecular (850–1250 GV / HU)
 * - D3: Thin porous cortical and fine trabecular (350–850 GV / HU)
 * - D4: Fine trabecular bone with minimal/no cortical (150–350 GV / HU)
 * - D5: Immature or unmineralized bone (< 150 GV / HU)
 *
 * 3D Osteotomy Bed Sampling:
 * - Centerline sampling along implant axis [entry -> apex]
 * - 4-point radial ring at 60% radius (osteotomy contact zone) across 12 axial levels
 * - Trilinear voxel interpolation, discarding out-of-volume air voxels
 * - Clinical drilling protocol suggestions and primary stability estimates
 *
 * 100% pure TypeScript, zero DOM/React dependencies, unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { cross3, normalize3, sub3, type Vec3 } from "./cbctSafetyEngine.js";
import { trilinear, type VolumeSamplingData } from "./panoramicCprMath.js";

export type BoneClass = "D1" | "D2" | "D3" | "D4" | "D5";

export interface MischDensityProfile {
  boneClass: BoneClass;
  minHU: number;
  maxHU: number;
  anatomicLocation: string;
  corticalDescription: string;
  trabecularDescription: string;
  drillingProtocol: string;
  expectedTorqueNcm: string;
  recommendedHealingMonths: number;
}

export const MISCH_BONE_PROFILES: Record<BoneClass, MischDensityProfile> = {
  D1: {
    boneClass: "D1",
    minHU: 1250,
    maxHU: 3000,
    anatomicLocation: "Передний отдел нижней челюсти (симфиз)",
    corticalDescription: "Плотная гомогенная кортикальная кость («кость дуба»)",
    trabecularDescription: "Практически отсутствует, минимальные костномозговые пространства",
    drillingProtocol: "Полное препарирование ложа, нарезание резьбы метчиком на всю глубину, обильное охлаждение для защиты от термонекроза",
    expectedTorqueNcm: "45–60 Н·см",
    recommendedHealingMonths: 3,
  },
  D2: {
    boneClass: "D2",
    minHU: 850,
    maxHU: 1250,
    anatomicLocation: "Передний и боковой отделы нижней челюсти, передний отдел верхней челюсти",
    corticalDescription: "Выраженная плотная кортикальная пластинка",
    trabecularDescription: "Плотная губчатая кость с высокой минерализацией",
    drillingProtocol: "Стандартный хирургический протокол, метчик при плотной кортикальной пластинке в области шейки",
    expectedTorqueNcm: "35–45 Н·см",
    recommendedHealingMonths: 3,
  },
  D3: {
    boneClass: "D3",
    minHU: 350,
    maxHU: 850,
    anatomicLocation: "Боковые отделы верхней и нижней челюсти",
    corticalDescription: "Тонкая пористая кортикальная пластинка",
    trabecularDescription: "Мелкоячеистая губчатая кость средней плотности",
    drillingProtocol: "Протокол недопрепарирования (under-drilling) на 0.5 мм тоньше диаметра имплантата для остеоконденсации",
    expectedTorqueNcm: "25–35 Н·см",
    recommendedHealingMonths: 4,
  },
  D4: {
    boneClass: "D4",
    minHU: 150,
    maxHU: 350,
    anatomicLocation: "Задний отдел верхней челюсти (бугор верхней челюсти)",
    corticalDescription: "Практически отсутствует",
    trabecularDescription: "Крупноячеистая редкая губчатая кость низкой плотности («пенопласт»)",
    drillingProtocol: "Остеотомический протокол с биконденсацией кости, конусный имплантат с агрессивной резьбой, без финишных фрез",
    expectedTorqueNcm: "15–25 Н·см",
    recommendedHealingMonths: 6,
  },
  D5: {
    boneClass: "D5",
    minHU: -1000,
    maxHU: 150,
    anatomicLocation: "Зоны недавнего удаления, выраженной атрофии или кистозных полостей",
    corticalDescription: "Отсутствует",
    trabecularDescription: "Незрелая неминерализованная кость или фиброзная ткань",
    drillingProtocol: "Прямая имплантация противопоказана без предварительной костной пластики (GBR / аугментация)",
    expectedTorqueNcm: "< 15 Н·см (первичная стабильность не гарантирована)",
    recommendedHealingMonths: 6,
  },
};

/**
 * Classifies CT Hounsfield Units (HU) or CBCT Gray Values (GV) into Misch bone classes.
 */
export function classifyBone(hu: number): BoneClass {
  if (hu > 1250) return "D1";
  if (hu >= 850) return "D2";
  if (hu >= 350) return "D3";
  if (hu >= 150) return "D4";
  return "D5";
}

/**
 * Returns complete Misch clinical profile for a given density value or bone class.
 */
export function getMischProfile(huOrClass: number | BoneClass): MischDensityProfile {
  const boneClass = typeof huOrClass === "number" ? classifyBone(huOrClass) : huOrClass;
  return MISCH_BONE_PROFILES[boneClass];
}

export interface BoneSample {
  meanHU: number;
  bone: BoneClass;
  samples: number;
  minHU: number;
  maxHU: number;
  stdDevHU: number;
  profile?: MischDensityProfile;
}

/**
 * Sample a 3D world coordinate; returns null when outside the valid volume bounding box.
 */
function sampleWorld(vol: VolumeSamplingData, x: number, y: number, z: number): number | null {
  const ci = (x - vol.origin[0]) * vol.invSx;
  const cj = (y - vol.origin[1]) * vol.invSy;
  const ck = (z - vol.origin[2]) * vol.invSz;

  if (
    ci < 0 ||
    cj < 0 ||
    ck < 0 ||
    ci >= vol.dims[0] - 1 ||
    cj >= vol.dims[1] - 1 ||
    ck >= vol.dims[2] - 1
  ) {
    return null;
  }

  return trilinear(vol.getVoxel, vol.dims, ci, cj, ck);
}

/**
 * High-precision volumetric sampling of bone density along the planned implant bed:
 * - Evaluates axial steps from entry to apex (default 12 steps)
 * - At each axial level, samples the central axis point plus a radial ring of points
 *   at 60% radius (representing the intimate implant-bone contact zone)
 * - Computes mean HU, min, max, standard deviation, and determines Misch D1-D5 class.
 *
 * Returns null if the implant length is negligible or lies completely outside the volume.
 */
export function sampleImplantBoneHU(
  vol: VolumeSamplingData,
  entry: Vec3,
  apex: Vec3,
  radius: number,
  axialSteps = 12,
  radialSteps = 4,
): BoneSample | null {
  const dir = sub3(apex, entry);
  const len = Math.hypot(dir[0], dir[1], dir[2]);
  if (len < 1e-6) return null;

  const u: Vec3 = [dir[0] / len, dir[1] / len, dir[2] / len];
  const ref: Vec3 = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const p1 = normalize3(cross3(u, ref));
  const p2 = cross3(u, p1);
  const rr = radius * 0.6; // 60% radius for peri-implant cancellous/cortical interface

  const collected: number[] = [];

  for (let a = 0; a <= axialSteps; a++) {
    const t = a / axialSteps;
    const cx = entry[0] + dir[0] * t;
    const cy = entry[1] + dir[1] * t;
    const cz = entry[2] + dir[2] * t;

    // Center point sample
    const c = sampleWorld(vol, cx, cy, cz);
    if (c !== null) collected.push(c);

    // Radial ring samples
    for (let r = 0; r < radialSteps; r++) {
      const ang = (2 * Math.PI * r) / radialSteps;
      const ca = Math.cos(ang) * rr;
      const sa = Math.sin(ang) * rr;
      const px = cx + p1[0] * ca + p2[0] * sa;
      const py = cy + p1[1] * ca + p2[1] * sa;
      const pz = cz + p1[2] * ca + p2[2] * sa;

      const v = sampleWorld(vol, px, py, pz);
      if (v !== null) collected.push(v);
    }
  }

  if (collected.length === 0) return null;

  let sum = 0;
  let min = Infinity;
  let max = -Infinity;

  for (const v of collected) {
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }

  const meanHU = sum / collected.length;

  let varSum = 0;
  for (const v of collected) {
    const diff = v - meanHU;
    varSum += diff * diff;
  }
  const stdDevHU = Math.sqrt(varSum / collected.length);
  const bone = classifyBone(meanHU);

  return {
    meanHU: Math.round(meanHU),
    bone,
    samples: collected.length,
    minHU: Math.round(min),
    maxHU: Math.round(max),
    stdDevHU: Math.round(stdDevHU * 10) / 10,
    profile: getMischProfile(bone),
  };
}
