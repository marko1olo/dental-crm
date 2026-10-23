/**
 * VITA 3D-Master Catalog (29 shades: Groups 0..5)
 */

import { VitaShade } from './types';
import { createVitaShade } from './createShade';

export const VITA_3D_MASTER_SHADES: VitaShade[] = [
	// Group 0 (Bleach)
	createVitaShade('0M1', '3D-Master 0M1 (Ultra Bleach)', '3d_master', { r: 254, g: 251, b: 243 }, 'Bleach', 1, 1, 'Максимально осветленный оттенок 3D-Master'),
	createVitaShade('0M2', '3D-Master 0M2 (Bleach)', '3d_master', { r: 249, g: 245, b: 233 }, 'Bleach', 2, 2, 'Ультрабелый натуральный оттенок'),
	createVitaShade('0M3', '3D-Master 0M3 (Soft Bleach)', '3d_master', { r: 245, g: 239, b: 223 }, 'Bleach', 3, 3, 'Мягкий отбеленный тон'),

	// Group 1 (Value 1)
	createVitaShade('1M1', '3D-Master 1M1', '3d_master', { r: 242, g: 234, b: 218 }, 'M', 4, 1, 'Высокая светлота, средний цветовой тон'),
	createVitaShade('1M2', '3D-Master 1M2', '3d_master', { r: 238, g: 226, b: 202 }, 'M', 5, 2, 'Высокая светлота, повышенная насыщенность'),

	// Group 2 (Value 2)
	createVitaShade('2L1.5', '3D-Master 2L1.5', '3d_master', { r: 236, g: 224, b: 198 }, 'L', 6, 1, 'Желтоватый тон (L), светлота 2'),
	createVitaShade('2L2.5', '3D-Master 2L2.5', '3d_master', { r: 232, g: 218, b: 186 }, 'L', 7, 2, 'Желтоватый тон (L), насыщенность 2.5'),
	createVitaShade('2M1', '3D-Master 2M1', '3d_master', { r: 235, g: 222, b: 200 }, 'M', 8, 1, 'Средний тон (M), светлота 2'),
	createVitaShade('2M2', '3D-Master 2M2', '3d_master', { r: 232, g: 216, b: 188 }, 'M', 9, 2, 'Средний тон (M), насыщенность 2'),
	createVitaShade('2M3', '3D-Master 2M3', '3d_master', { r: 228, g: 208, b: 174 }, 'M', 10, 3, 'Средний тон (M), насыщенность 3'),
	createVitaShade('2R1.5', '3D-Master 2R1.5', '3d_master', { r: 236, g: 220, b: 202 }, 'R', 11, 1, 'Красноватый тон (R), светлота 2'),
	createVitaShade('2R2.5', '3D-Master 2R2.5', '3d_master', { r: 231, g: 212, b: 190 }, 'R', 12, 2, 'Красноватый тон (R), насыщенность 2.5'),

	// Group 3 (Value 3)
	createVitaShade('3L1.5', '3D-Master 3L1.5', '3d_master', { r: 226, g: 212, b: 182 }, 'L', 13, 1, 'Желтоватый тон (L), средняя светлота 3'),
	createVitaShade('3L2.5', '3D-Master 3L2.5', '3d_master', { r: 221, g: 204, b: 168 }, 'L', 14, 2, 'Желтоватый тон (L), насыщенность 2.5'),
	createVitaShade('3M1', '3D-Master 3M1', '3d_master', { r: 224, g: 210, b: 184 }, 'M', 15, 1, 'Универсальный средний тон (M)'),
	createVitaShade('3M2', '3D-Master 3M2', '3d_master', { r: 220, g: 202, b: 172 }, 'M', 16, 2, 'Средний тон (M), насыщенность 2'),
	createVitaShade('3M3', '3D-Master 3M3', '3d_master', { r: 215, g: 194, b: 158 }, 'M', 17, 3, 'Высокая насыщенность 3M3'),
	createVitaShade('3R1.5', '3D-Master 3R1.5', '3d_master', { r: 225, g: 206, b: 184 }, 'R', 18, 1, 'Красноватый тон (R), светлота 3'),
	createVitaShade('3R2.5', '3D-Master 3R2.5', '3d_master', { r: 218, g: 196, b: 172 }, 'R', 19, 2, 'Красноватый зрелый тон (R)'),

	// Group 4 (Value 4)
	createVitaShade('4L1.5', '3D-Master 4L1.5', '3d_master', { r: 214, g: 200, b: 170 }, 'L', 20, 1, 'Желтоватый тон (L), низкая светлота 4'),
	createVitaShade('4L2.5', '3D-Master 4L2.5', '3d_master', { r: 208, g: 190, b: 154 }, 'L', 21, 2, 'Желтоватый тон (L), насыщенность 2.5'),
	createVitaShade('4M1', '3D-Master 4M1', '3d_master', { r: 212, g: 198, b: 170 }, 'M', 22, 1, 'Низкая светлота 4M1'),
	createVitaShade('4M2', '3D-Master 4M2', '3d_master', { r: 206, g: 188, b: 156 }, 'M', 23, 2, 'Низкая светлота, насыщенный 4M2'),
	createVitaShade('4M3', '3D-Master 4M3', '3d_master', { r: 198, g: 178, b: 142 }, 'M', 24, 3, 'Глубокий оттенок 4M3'),
	createVitaShade('4R1.5', '3D-Master 4R1.5', '3d_master', { r: 212, g: 194, b: 172 }, 'R', 25, 1, 'Красноватый тон (R), светлота 4'),
	createVitaShade('4R2.5', '3D-Master 4R2.5', '3d_master', { r: 205, g: 184, b: 158 }, 'R', 26, 2, 'Красноватый тон (R), насыщенность 2.5'),

	// Group 5 (Value 5)
	createVitaShade('5M1', '3D-Master 5M1', '3d_master', { r: 196, g: 180, b: 152 }, 'M', 27, 1, 'Минимальная светлота 5M1'),
	createVitaShade('5M2', '3D-Master 5M2', '3d_master', { r: 188, g: 170, b: 138 }, 'M', 28, 2, 'Темный глубокий оттенок 5M2'),
	createVitaShade('5M3', '3D-Master 5M3', '3d_master', { r: 180, g: 160, b: 126 }, 'M', 29, 3, 'Максимально темный оттенок 5M3'),
];
