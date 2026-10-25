import type { TargetArch } from "./orthoProtocolTypes";

export interface OrthodonticService {
	code: string;
	nameRu: string;
	priceRub: number;
	stageKind: "stage_ortho";
	toothNumber?: number | undefined;
	arch?: TargetArch | undefined;
}

// Backward-compatibility alias per Mandate 8ap
export type OrthodonticService804n = OrthodonticService;

export const ORTHO_ACTIONS_SERVICES_MAP: Record<string, Array<Omit<OrthodonticService, "stageKind">>> = {
	wire_change: [
		{ code: "A16.07.048.002", nameRu: "Смена ортодонтической дуги", priceRub: 2500 },
		{ code: "A16.07.048", nameRu: "Коррекция прикуса с использованием брекет-системы", priceRub: 1500 },
	],
	wire_change_leveling: [
		{ code: "A16.07.046", nameRu: "Смена дуг: плановое нивелирование (NiTi / CuNiTi)", priceRub: 3500 },
		{ code: "A16.07.049", nameRu: "Наложение эластической тяги Class II", priceRub: 1200 },
	],
	ligature_change: [{ code: "A16.07.048", nameRu: "Активация элементов брекет-системы / смена лигатур", priceRub: 1500 }],
	activation: [{ code: "A16.07.048", nameRu: "Плановая активация элементов брекет-системы", priceRub: 1500 }],
	niti_014_activation: [{ code: "A16.07.046", nameRu: "Установка первой нивелирующей дуги NiTi .014", priceRub: 3200 }],
	power_chain_change: [{ code: "A16.07.048", nameRu: "Замена / фиксация эластической цепочки Power Chain", priceRub: 1800 }],
	rebracket: [{ code: "A16.07.048.001", nameRu: "Фиксация одного брекета / замка", priceRub: 1200 }],
	bonding: [{ code: "A16.07.047", nameRu: "Фиксация брекет-системы (прямая фиксация)", priceRub: 25000 }],
	bonding_both_mbt: [{ code: "A16.07.047", nameRu: "Полная фиксация аппаратуры (ВЧ + НЧ)", priceRub: 45000 }],
	debonding: [
		{ code: "A16.07.049", nameRu: "Снятие несъемного ортодонтического аппарата", priceRub: 5000 },
		{ code: "A16.07.050", nameRu: "Фиксация несъемного ретейнера", priceRub: 4000 },
	],
	springs: [{ code: "A16.07.048", nameRu: "Установка пружины раскрытия / закрытия промежутка", priceRub: 1200 }],
	spring_activation: [{ code: "A16.07.048.003", nameRu: "Активация пружины раскрытия / закрытия промежутка", priceRub: 1400 }],
	separation: [{ code: "A16.07.048.003", nameRu: "Сепарация / установка сепараторов", priceRub: 800 }],
	separation_rings: [{ code: "A16.07.050", nameRu: "Установка сепарационных колец / эластиков", priceRub: 1200 }],
	plate_activation: [{ code: "A16.07.047", nameRu: "Коррекция съемного ортодонтического аппарата", priceRub: 1000 }],
	expansion_screw_activation: [{ code: "A16.07.047.001", nameRu: "Активация расширяющего винта пластинки", priceRub: 800 }],
	ipr: [{ code: "A16.07.048.003", nameRu: "Сепарация зубов", priceRub: 800 }],
};

export const ALIGNER_SERVICES: Array<Omit<OrthodonticService, "stageKind">> = [
	{ code: "A16.07.046", nameRu: "Ортодонтическая коррекция с применением элайнеров", priceRub: 3000 },
	{ code: "A16.07.046.001", nameRu: "Фиксация композитных аттачментов элайнеров", priceRub: 2000 },
];

export const ORTHO_804N_ACTIONS_MAP = ORTHO_ACTIONS_SERVICES_MAP;
export const ALIGNER_804N_SERVICES = ALIGNER_SERVICES;
