/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WAVE 126: CBCT <-> INTRAORAL SCAN REGISTRATION & ICP ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure mathematical engine for registering optical intraoral scans (IOS / STL)
 * with CBCT volumetric datasets:
 *
 *  1. 4×4 Column-Major Matrix Algebra (OpenGL / VTK layout).
 *  2. Cyclic Jacobi Symmetric Eigensolver for 4×4 Horn key matrix.
 *  3. Horn's Unit-Quaternion Rigid Registration (Kabsch algorithm) mapping
 *     corresponding landmark pairs (source optical scan → target CBCT)
 *     with RMS residual fit quality calculation.
 *  4. Point-to-Point ICP (Iterative Closest Point) surface refinement.
 *  5. Möller–Trumbore ray-triangle picking against intraoral scan triangle soups.
 *  6. A4 clinical registration protocol generator compliant with Mandate 8d #7.
 *
 * Adapted from DenCT core/registration.ts reference.
 * 100% pure TypeScript, zero DOM/VTK dependencies, 100% unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Vec3 } from "./cprMath.js";
import {
  jacobiEigenSymmetric,
  type JacobiEigenResult,
} from "./cbctScanMeshEngine.js";

export { jacobiEigenSymmetric, type JacobiEigenResult };

// ── 4×4 Column-Major Matrix Helpers ─────────────────────────────

/** Standard 4×4 column-major identity matrix. */
export const IDENTITY4: number[] = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

/**
 * Multiply two column-major 4×4 matrices: returns a · b.
 */
export function mul4(
  a: readonly number[] | number[],
  b: readonly number[] | number[],
): number[] {
  const out = new Array<number>(16).fill(0);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) {
        const ak = a[k * 4 + r] ?? 0;
        const bk = b[c * 4 + k] ?? 0;
        s += ak * bk;
      }
      out[c * 4 + r] = s;
    }
  }
  return out;
}

/**
 * Apply a column-major 4×4 affine transformation matrix to a 3D point.
 */
export function applyMat4(
  m: readonly number[] | number[],
  p: Vec3,
): Vec3 {
  const m0 = m[0] ?? 0;
  const m1 = m[1] ?? 0;
  const m2 = m[2] ?? 0;
  const m4 = m[4] ?? 0;
  const m5 = m[5] ?? 0;
  const m6 = m[6] ?? 0;
  const m8 = m[8] ?? 0;
  const m9 = m[9] ?? 0;
  const m10 = m[10] ?? 0;
  const m12 = m[12] ?? 0;
  const m13 = m[13] ?? 0;
  const m14 = m[14] ?? 0;

  return [
    m0 * p[0] + m4 * p[1] + m8 * p[2] + m12,
    m1 * p[0] + m5 * p[1] + m9 * p[2] + m13,
    m2 * p[0] + m6 * p[1] + m10 * p[2] + m14,
  ];
}

/**
 * Construct a column-major rigid matrix from a row-major 3×3 rotation R and translation t.
 */
export function rigidMatrix(R: number[][], t: Vec3): number[] {
  const r0 = R[0] ?? [1, 0, 0];
  const r1 = R[1] ?? [0, 1, 0];
  const r2 = R[2] ?? [0, 0, 1];

  return [
    r0[0] ?? 1, r1[0] ?? 0, r2[0] ?? 0, 0,
    r0[1] ?? 0, r1[1] ?? 1, r2[1] ?? 0, 0,
    r0[2] ?? 0, r1[2] ?? 0, r2[2] ?? 1, 0,
    t[0], t[1], t[2], 1,
  ];
}

// ── Horn's Unit-Quaternion Rigid Registration (Kabsch) ──────────

/**
 * Compute the 3D centroid of an array of points.
 */
export function centroid(pts: Vec3[]): Vec3 {
  if (pts.length === 0) return [0, 0, 0];
  const c: Vec3 = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (p) {
      c[0] += p[0];
      c[1] += p[1];
      c[2] += p[2];
    }
  }
  const inv = 1 / pts.length;
  return [c[0] * inv, c[1] * inv, c[2] * inv];
}

/**
 * Best-fit rigid transform mapping source landmarks to target landmarks (N ≥ 3).
 * Uses Horn's unit-quaternion method (symmetric 4×4 eigenproblem).
 * Returns a 4×4 column-major affine transform matrix, or null if degenerate.
 */
export function kabschTransform(src: Vec3[], tgt: Vec3[]): number[] | null {
  if (src.length < 3 || src.length !== tgt.length) return null;

  const cs = centroid(src);
  const ct = centroid(tgt);

  // Cross-covariance matrix S[a][b] = Σ (src - cs)[a] · (tgt - ct)[b]
  const S: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  for (let i = 0; i < src.length; i++) {
    const sp = src[i]!;
    const tp = tgt[i]!;
    const p: Vec3 = [sp[0] - cs[0], sp[1] - cs[1], sp[2] - cs[2]];
    const q: Vec3 = [tp[0] - ct[0], tp[1] - ct[1], tp[2] - ct[2]];
    for (let a = 0; a < 3; a++) {
      const sa = S[a]!;
      for (let b = 0; b < 3; b++) {
        sa[b] = (sa[b] ?? 0) + p[a]! * q[b]!;
      }
    }
  }

  const row0 = S[0]!;
  const row1 = S[1]!;
  const row2 = S[2]!;

  const Sxx = row0[0] ?? 0;
  const Sxy = row0[1] ?? 0;
  const Sxz = row0[2] ?? 0;

  const Syx = row1[0] ?? 0;
  const Syy = row1[1] ?? 0;
  const Syz = row1[2] ?? 0;

  const Szx = row2[0] ?? 0;
  const Szy = row2[1] ?? 0;
  const Szz = row2[2] ?? 0;

  // Horn's 4×4 symmetric key matrix N
  const N: number[][] = [
    [Sxx + Syy + Szz, Syz - Szy, Szx - Sxz, Sxy - Syx],
    [Syz - Szy, Sxx - Syy - Szz, Sxy + Syx, Szx + Sxz],
    [Szx - Sxz, Sxy + Syx, -Sxx + Syy - Szz, Syz + Szy],
    [Sxy - Syx, Szx + Sxz, Syz + Szy, -Sxx - Syy + Szz],
  ];

  const { values, vectors } = jacobiEigenSymmetric(N, 4);

  // Optimal rotation quaternion corresponds to maximum eigenvalue
  let best = 0;
  for (let i = 1; i < 4; i++) {
    if ((values[i] ?? -Infinity) > (values[best] ?? -Infinity)) best = i;
  }

  const q0 = vectors[0]?.[best] ?? 1;
  const q1 = vectors[1]?.[best] ?? 0;
  const q2 = vectors[2]?.[best] ?? 0;
  const q3 = vectors[3]?.[best] ?? 0;
  const nrm = Math.hypot(q0, q1, q2, q3) || 1;
  const w = q0 / nrm;
  const x = q1 / nrm;
  const y = q2 / nrm;
  const z = q3 / nrm;

  // Convert unit quaternion to 3×3 rotation matrix R
  const R: number[][] = [
    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
  ];

  const r0 = R[0]!;
  const r1 = R[1]!;
  const r2 = R[2]!;

  // R * cs
  const Rcs: Vec3 = [
    (r0[0] ?? 0) * cs[0] + (r0[1] ?? 0) * cs[1] + (r0[2] ?? 0) * cs[2],
    (r1[0] ?? 0) * cs[0] + (r1[1] ?? 0) * cs[1] + (r1[2] ?? 0) * cs[2],
    (r2[0] ?? 0) * cs[0] + (r2[1] ?? 0) * cs[1] + (r2[2] ?? 0) * cs[2],
  ];

  // Translation vector t = ct - R * cs
  const t: Vec3 = [ct[0] - Rcs[0], ct[1] - Rcs[1], ct[2] - Rcs[2]];

  return rigidMatrix(R, t);
}

export interface KabschResultWithRms {
  matrix: number[];
  rmsMm: number;
}

/**
 * kabschTransform() plus the RMS point-pair residual in mm.
 * High RMS (> 1.0 mm) indicates inconsistent landmark selection.
 */
export function kabschTransformWithRms(
  src: Vec3[],
  tgt: Vec3[],
): KabschResultWithRms | null {
  const matrix = kabschTransform(src, tgt);
  if (!matrix) return null;
  let sum = 0;
  for (let i = 0; i < src.length; i++) {
    const sp = src[i]!;
    const tp = tgt[i]!;
    const p = applyMat4(matrix, sp);
    sum += (p[0] - tp[0]) ** 2 + (p[1] - tp[1]) ** 2 + (p[2] - tp[2]) ** 2;
  }
  return { matrix, rmsMm: Math.sqrt(sum / src.length) };
}

// ── Iterative Closest Point (Surface Refinement) ────────────────

export interface IcpOptions {
  /** Maximum iterations (default 40). */
  maxIterations?: number;
  /** Stop when the RMS improvement between iterations drops below this threshold in mm (default 1e-4). */
  tolerance?: number;
  /** Initial source → target transform (4×4 column-major, default identity). */
  initial?: number[];
}

export interface IcpResult {
  /** Refined source → target rigid transform (4×4 column-major). */
  transform: number[];
  /** Final RMS of each source point to its nearest target point in mm. */
  rmsMm: number;
  /** Total iterations executed. */
  iterations: number;
}

/** Find nearest target point to point q. */
export function nearestPoint(target: Vec3[], q: Vec3): Vec3 {
  let bd = Infinity;
  let bj = 0;
  for (let j = 0; j < target.length; j++) {
    const t = target[j]!;
    const d = (q[0] - t[0]) ** 2 + (q[1] - t[1]) ** 2 + (q[2] - t[2]) ** 2;
    if (d < bd) {
      bd = d;
      bj = j;
    }
  }
  return target[bj]!;
}

/** RMS of transformed source points to their nearest target points in mm. */
export function nearestRms(source: Vec3[], target: Vec3[], m: number[]): number {
  let sum = 0;
  for (let i = 0; i < source.length; i++) {
    const p = source[i]!;
    const q = applyMat4(m, p);
    const t = nearestPoint(target, q);
    sum += (q[0] - t[0]) ** 2 + (q[1] - t[1]) ** 2 + (q[2] - t[2]) ** 2;
  }
  return Math.sqrt(sum / source.length);
}

/**
 * Point-to-point ICP (Iterative Closest Point):
 * Refines an initial alignment between source and target point clouds by repeatedly
 * finding closest-point correspondences and estimating the optimal rigid transform.
 */
export function icpAlign(
  source: Vec3[],
  target: Vec3[],
  opts: IcpOptions = {},
): IcpResult | null {
  const maxIter = opts.maxIterations ?? 40;
  const tol = opts.tolerance ?? 1e-4;
  if (source.length < 3 || target.length < 1) return null;

  let current: number[] = opts.initial ? [...opts.initial] : [...IDENTITY4];
  let prevRms = Infinity;
  let iter = 0;

  for (; iter < maxIter; iter++) {
    const moved = source.map((p) => applyMat4(current, p));
    const matched = moved.map((m) => nearestPoint(target, m));
    const delta = kabschTransform(moved, matched);
    if (!delta) break;

    current = mul4(delta, current);
    const rms = nearestRms(source, target, current);
    const improved = prevRms - rms;
    prevRms = rms;

    if (improved >= 0 && improved < tol) {
      iter++;
      break;
    }
  }

  const rmsMm = prevRms === Infinity ? nearestRms(source, target, current) : prevRms;
  return { transform: current, rmsMm, iterations: iter };
}

// ── Möller–Trumbore Ray-Triangle Picking ─────────────────────────

/**
 * Möller–Trumbore ray-triangle intersection test.
 * Returns the ray parameter t at intersection (> 1e-6), or null if no hit.
 */
export function rayTriangleHit(
  orig: Vec3,
  dir: Vec3,
  a: Vec3,
  b: Vec3,
  c: Vec3,
): number | null {
  const e1: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const e2: Vec3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];

  const px = dir[1] * e2[2] - dir[2] * e2[1];
  const py = dir[2] * e2[0] - dir[0] * e2[2];
  const pz = dir[0] * e2[1] - dir[1] * e2[0];
  const det = e1[0] * px + e1[1] * py + e1[2] * pz;

  if (Math.abs(det) < 1e-9) return null;
  const inv = 1 / det;

  const tv: Vec3 = [orig[0] - a[0], orig[1] - a[1], orig[2] - a[2]];
  const u = (tv[0] * px + tv[1] * py + tv[2] * pz) * inv;
  if (u < 0 || u > 1) return null;

  const qx = tv[1] * e1[2] - tv[2] * e1[1];
  const qy = tv[2] * e1[0] - tv[0] * e1[2];
  const qz = tv[0] * e1[1] - tv[1] * e1[0];
  const v = (dir[0] * qx + dir[1] * qy + dir[2] * qz) * inv;
  if (v < 0 || u + v > 1) return null;

  const t = (e2[0] * qx + e2[1] * qy + e2[2] * qz) * inv;
  return t > 1e-6 ? t : null;
}

/**
 * Find nearest ray hit against a triangle soup [ax,ay,az, bx,by,bz, cx,cy,cz, ...].
 * Returns the 3D world hit point, or null if no triangle was hit.
 */
export function pickTriangleSoup(
  orig: Vec3,
  dir: Vec3,
  tris: Float32Array | number[],
): Vec3 | null {
  let bestT = Infinity;
  for (let i = 0; i + 8 < tris.length; i += 9) {
    const a: Vec3 = [tris[i] ?? 0, tris[i + 1] ?? 0, tris[i + 2] ?? 0];
    const b: Vec3 = [tris[i + 3] ?? 0, tris[i + 4] ?? 0, tris[i + 5] ?? 0];
    const c: Vec3 = [tris[i + 6] ?? 0, tris[i + 7] ?? 0, tris[i + 8] ?? 0];
    const t = rayTriangleHit(orig, dir, a, b, c);
    if (t !== null && t < bestT) {
      bestT = t;
    }
  }
  if (!Number.isFinite(bestT)) return null;
  return [
    orig[0] + dir[0] * bestT,
    orig[1] + dir[1] * bestT,
    orig[2] + dir[2] * bestT,
  ];
}

// ── Printable Clinical A4 Protocol (0 Emojis, Mandate 8d #7) ──────

export interface RegistrationProtocolInput {
  landmarkRmsMm: number;
  icpRmsMm: number;
  iterations: number;
  scanPointsCount: number;
  isClinicallyAcceptable: boolean;
}

/**
 * Formats an A4-printable clinical protocol for optical intraoral scan to CBCT registration.
 * Fully compliant with Mandate 8d item 7: strictly zero cartoon emojis, professional medical terminology.
 */
export function formatRegistrationA4Protocol(
  result: RegistrationProtocolInput,
  patientName: string,
  doctorName: string,
): string {
  const statusText = result.isClinicallyAcceptable
    ? "[ДОПУЩЕНО К КЛИНИЧЕСКОМУ ИСПОЛЬЗОВАНИЮ]"
    : "[ВНИМАНИЕ: ТРЕБУЕТСЯ ПОВТОРНАЯ КАЛИБРОВКА]";

  const recommendation = result.isClinicallyAcceptable
    ? "Точность оптико-томографического совмещения находится в пределах клинического допуска (RMS <= 0.500 мм). Данные согласованы для прецизионного моделирования хирургических навигационных шаблонов и позиционирования дентальных имплантатов."
    : "Среднеквадратическое отклонение превышает допустимый клинический порог (RMS > 0.500 мм). Рекомендуется повторно расставить анатомические ориентиры (минимум 3 не коллинеарные пары реперов на твердых тканях зубов) и исключить участки с артефактами металлоконструкций.";

  const lines = [
    "================================================================================",
    "        ПРОТОКОЛ СОПОСТАВЛЕНИЯ КЛКТ И ОПТИЧЕСКОГО ИНТРАОРАЛЬНОГО СКАНИРОВАНИЯ   ",
    "               (CBCT <-> INTRAORAL OPTICAL SCAN REGISTRATION REPORT)            ",
    "================================================================================",
    "",
    `Пациент: ${patientName.trim() || "Не указан"}`,
    `Лечащий врач: ${doctorName.trim() || "Не указан"}`,
    `Дата формирования: ${new Date().toISOString().slice(0, 10)}`,
    "Стандарт протокола: Форма 043/у / Предоперационное 3D-планирование",
    "",
    "--------------------------------------------------------------------------------",
    "1. ПАРАМЕТРЫ РЕГИСТРАЦИИ И АЛГОРИТМИЧЕСКИЙ АНАЛИЗ",
    "--------------------------------------------------------------------------------",
    "Математический метод первичной привязки : Horn Unit-Quaternion Absolute Orientation (Kabsch)",
    "Математический метод прецизионной доводки : Iterative Closest Point (Point-to-Point ICP)",
    `Количество обработанных вершин меша    : ${result.scanPointsCount.toLocaleString("ru-RU")}`,
    `Первичное отклонение по реперам (RMS)  : ${result.landmarkRmsMm.toFixed(4)} мм`,
    `Финальное отклонение ICP (RMS)         : ${result.icpRmsMm.toFixed(4)} мм`,
    `Количество выполненных итераций ICP    : ${result.iterations}`,
    "",
    "--------------------------------------------------------------------------------",
    "2. КЛИНИЧЕСКИЙ ВЕРДИКТ И ЗАКЛЮЧЕНИЕ",
    "--------------------------------------------------------------------------------",
    `Статус верификации: ${statusText}`,
    "Клинический допуск: RMS <= 0.500 мм (допустимо для навигационной хирургии)",
    "",
    "Заключение:",
    recommendation,
    "",
    "--------------------------------------------------------------------------------",
    "3. ВЕРИФИКАЦИЯ И ПОДПИСЬ",
    "--------------------------------------------------------------------------------",
    "Протокол проверен врачом-стоматологом у кресла в соответствии с клиническими",
    "рекомендациями Стоматологической Ассоциации России (СтАР).",
    "",
    `Врач-стоматолог (подпись): ____________________ / ${doctorName.trim() || "Врач-клиницист"} /`,
    "",
    "Подпись ответственного лица: ____________________",
    "",
    "М.П. Клиники",
    "================================================================================",
  ];

  return lines.join("\n");
}
