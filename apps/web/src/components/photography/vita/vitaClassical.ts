/**
 * VITA Classical Catalog (16 standard + 4 Bleach shades)
 */

import { VitaShade } from './types';
import { createVitaShade } from './createShade';

export const VITA_CLASSICAL_BLEACH_SHADES: VitaShade[] = [
	createVitaShade('BL1', 'VITA Bleach BL1 (Ultra White)', 'classical', { r: 254, g: 252, b: 246 }, 'Bleach', 1, 1, 'Максимально яркий отбеленный оттенок (Hollywood White)'),
	createVitaShade('BL2', 'VITA Bleach BL2 (Bright White)', 'classical', { r: 250, g: 246, b: 236 }, 'Bleach', 2, 1, 'Яркий натуральный отбеленный оттенок'),
	createVitaShade('BL3', 'VITA Bleach BL3 (Natural Bleach)', 'classical', { r: 247, g: 242, b: 228 }, 'Bleach', 3, 2, 'Мягкий естественный отбеленный тон'),
	createVitaShade('BL4', 'VITA Bleach BL4 (Light Natural)', 'classical', { r: 245, g: 239, b: 222 }, 'Bleach', 4, 2, 'Светлый естественный тон на границе с B1'),
];

export const VITA_CLASSICAL_STANDARD_SHADES: VitaShade[] = [
	createVitaShade('B1', 'VITA B1 (Ультрасветлый)', 'classical', { r: 245, g: 238, b: 220 }, 'B', 5, 1, 'Красновато-желтоватый, наивысшая светлота классической шкалы'),
	createVitaShade('A1', 'VITA A1 (Светлый базовый)', 'classical', { r: 242, g: 232, b: 212 }, 'A', 6, 1, 'Красновато-коричневатый, высокая светлота'),
	createVitaShade('B2', 'VITA B2', 'classical', { r: 238, g: 225, b: 198 }, 'B', 7, 2, 'Красновато-желтоватый, средняя насыщенность'),
	createVitaShade('D2', 'VITA D2', 'classical', { r: 232, g: 222, b: 202 }, 'D', 8, 2, 'Красновато-серый, нейтральная светлота'),
	createVitaShade('A2', 'VITA A2 (Универсальный эталон)', 'classical', { r: 234, g: 218, b: 192 }, 'A', 9, 2, 'Самый частый естественный оттенок (60% взрослых пациентов)'),
	createVitaShade('C1', 'VITA C1', 'classical', { r: 226, g: 218, b: 204 }, 'C', 10, 1, 'Сероватый оттенок низкой насыщенности'),
	createVitaShade('C2', 'VITA C2', 'classical', { r: 222, g: 210, b: 190 }, 'C', 11, 2, 'Сероватый со средней насыщенностью'),
	createVitaShade('D3', 'VITA D3', 'classical', { r: 225, g: 208, b: 180 }, 'D', 12, 3, 'Красновато-серый глубокий'),
	createVitaShade('A3', 'VITA A3', 'classical', { r: 226, g: 204, b: 172 }, 'A', 13, 3, 'Красновато-коричневатый, зрелый натуральный оттенок'),
	createVitaShade('B3', 'VITA B3', 'classical', { r: 228, g: 202, b: 160 }, 'B', 14, 3, 'Красновато-желтоватый насыщенный'),
	createVitaShade('A3.5', 'VITA A3.5', 'classical', { r: 218, g: 192, b: 156 }, 'A', 15, 4, 'Повышенная хроматичность для клыков и шеек зубов'),
	createVitaShade('B4', 'VITA B4', 'classical', { r: 216, g: 188, b: 142 }, 'B', 16, 4, 'Интенсивный желтый тон высокой насыщенности'),
	createVitaShade('C3', 'VITA C3', 'classical', { r: 208, g: 194, b: 170 }, 'C', 17, 3, 'Глубокий серый оттенок'),
	createVitaShade('D4', 'VITA D4', 'classical', { r: 212, g: 192, b: 164 }, 'D', 18, 4, 'Красновато-серый приглушенный'),
	createVitaShade('A4', 'VITA A4 (Темный насыщенный)', 'classical', { r: 202, g: 174, b: 138 }, 'A', 19, 5, 'Глубокий коричневатый оттенок'),
	createVitaShade('C4', 'VITA C4 (Темный серый)', 'classical', { r: 192, g: 176, b: 150 }, 'C', 20, 4, 'Темный серо-коричневый тон'),
];

export const VITA_CLASSICAL_SHADES: VitaShade[] = [
	...VITA_CLASSICAL_BLEACH_SHADES,
	...VITA_CLASSICAL_STANDARD_SHADES,
];
