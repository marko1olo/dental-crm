/**
 * DENTE CRM — CBCT 3D Volume Viewport Constants (Layer 0)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x
 */

import type { ExtraSkullProjectionItem } from "./types";

export const EXTRA_SKULL_PROJECTIONS: readonly ExtraSkullProjectionItem[] = [
	{
		id: "posterior",
		label: "Затылок",
		tooltip: "Затылок / Posterior: основание черепа сзади (Yaw 180°, Pitch 0°)",
		yaw: 180,
		pitch: 0,
		testId: "cbct-proj-posterior",
	},
	{
		id: "left_lateral",
		label: "Левый профиль",
		tooltip:
			"Левый профиль: латеральный вид левой челюсти и ВНЧС (Yaw -90°, Pitch 0°)",
		yaw: -90,
		pitch: 0,
		testId: "cbct-proj-left-lateral",
	},
	{
		id: "superior",
		label: "Сверху (Окклюзия)",
		tooltip:
			"Сверху: аксиальный вид на окклюзионную поверхность зубного ряда (Yaw 0°, Pitch +85°)",
		yaw: 0,
		pitch: 85,
		testId: "cbct-proj-superior",
	},
	{
		id: "inferior",
		label: "Снизу (Базис)",
		tooltip:
			"Снизу: подбородочный вид на базис нижней челюсти (Yaw 0°, Pitch -85°)",
		yaw: 0,
		pitch: -85,
		testId: "cbct-proj-inferior",
	},
	{
		id: "left_oblique",
		label: "3/4 Левый",
		tooltip:
			"3/4 Левый: изометрический левый ракурс челюсти (Yaw -45°, Pitch 15°)",
		yaw: -45,
		pitch: 15,
		testId: "cbct-proj-left-oblique",
	},
];

export const DEFAULT_CAMERA_YAW = 0;
export const DEFAULT_CAMERA_PITCH = 0;
export const DEFAULT_CAMERA_ZOOM = 1.0;
export const MIN_CAMERA_ZOOM = 0.4;
export const MAX_CAMERA_ZOOM = 5.0;
export const PITCH_CLAMP_MIN = -85;
export const PITCH_CLAMP_MAX = 85;

export const DEFAULT_VIEWPORT_BACKGROUND = "#000000";
export const CLEAR_COLOR_GL: [number, number, number, number] = [0.035, 0.035, 0.043, 1.0];
