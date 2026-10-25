import type { OrthodonticService } from "./orthoServicesCalculator";

export type OrthodonticStageFilter =
	| "all"
	| "leveling"
	| "working"
	| "finishing"
	| "aligners"
	| "retention";

export const ORTHODONTIC_STAGE_TABS: Array<{
	id: OrthodonticStageFilter;
	label: string;
	shortLabel: string;
	desc: string;
}> = [
	{ id: "all", label: "Все этапы", shortLabel: "Все", desc: "Полный клинический арсенал" },
	{ id: "leveling", label: "1. Нивелирование", shortLabel: "Нивелирование", desc: "NiTi .012–.016, фиксация аппаратуры" },
	{ id: "working", label: "2. Рабочий / Юстировка", shortLabel: "Рабочий", desc: "Сталь SS, чейн, эластики, закрытие промежутков" },
	{ id: "finishing", label: "3. Детализация & Торк", shortLabel: "Торк & Детализация", desc: "ТМА, расчет торка резцов и ангуляции" },
	{ id: "aligners", label: "4. Элайнеры & Каппы", shortLabel: "Элайнеры", desc: "Трекер капп 1..N, аттачменты, выдача сетов" },
	{ id: "retention", label: "5. Снятие & Ретенция", shortLabel: "Ретенция", desc: "Снятие брекетов, ретейнеры, ретенционные каппы" },
];

export type TargetArch = "upper" | "lower" | "both";

export type OrthoClinicalPresetId =
	| "activation"
	| "wire_change"
	| "bonding"
	| "debonding"
	| "leveling"
	| "springs"
	| "separation"
	| "rebracket"
	| "niti_014_activation"
	| "power_chain_change"
	| "bonding_both_mbt"
	| "aligner_scan"
	| "aligner_trays_1_4"
	| "aligner_trays_5_8"
	| "lab_aligners"
	| "lab_retainer"
	| "lab_plate"
	| "lab_splint";

export interface OrthodonticVisitProtocolWidgetProps {
	isOpen: boolean;
	onClose: () => void;
	patientId?: string | undefined;
	patientName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly doctorName?: string | undefined;
	selectedTooth?: number | null;
	onSelectTooth?: (toothNumber: number) => void;
	currentAligner?: number | undefined;
	totalAligners?: number | undefined;
	currentAlignerUpper?: number | undefined;
	currentAlignerLower?: number | undefined;
	totalAlignersUpper?: number | undefined;
	totalAlignersLower?: number | undefined;
	onIssueAlignerSet?: ((count: number, days: number) => void) | undefined;
	onAddToInvoice?: ((services: OrthodonticService[]) => void) | undefined;
}

export const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export const ANTERIOR_TEETH = [13, 12, 11, 21, 22, 23, 43, 42, 41, 31, 32, 33];

export const CLINICAL_ACTIONS = [
	{ id: "wire_change", label: "Смена дуги + активация замков" },
	{ id: "ligature_change", label: "Смена эластических лигатур" },
	{ id: "power_chain", label: "Установка цепочки Power Chain" },
	{ id: "rebracket", label: "Переклейка отклеившегося брекета" },
	{ id: "ipr", label: "Сепарация эмали (IPR)" },
	{ id: "separation", label: "Сепарационные эластики (сепараторы)" },
	{ id: "plate_activation", label: "Активация дуги и кламмеров пластинки" },
	{ id: "expansion_screw_activation", label: "Раскрутка расширяющего винта (1/4 об. = 0.25 мм)" },
	{ id: "debonding", label: "Снятие аппаратуры + ретейнер" },
];

// Re-exports from dedicated modules
export {
	type OrthodonticService,
	type OrthodonticService804n,
	type CalculateOrthoServicesParams,
	calculateOrthodonticServices,
	calculateOrthodonticServices804n,
	ORTHO_ACTIONS_SERVICES_MAP,
	ORTHO_804N_ACTIONS_MAP,
	ALIGNER_SERVICES,
	ALIGNER_804N_SERVICES,
} from "./orthoServicesCalculator";

export {
	type OrthodonticPatientMemoParams,
	formatOrthodonticPatientMemo,
	getRuDateString,
} from "./orthoPatientMemo";
