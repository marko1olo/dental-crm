/**
 * DENTE CRM — DICOM Toolbox Ribbon Constants & Clinical Presets (Layer 1)
 * Strict invariants: Mandate 8b (<=800 lines), Mandate 8d (Clinical density), Mandate 8e (Doctor Autonomy).
 */

import type { DicomTabType } from "./types.js";
export * from "./dicomRibbonStyles";

export const DICOM_TAB_LABELS: Record<DicomTabType, string> = {
	"2D": "2D СРЕЗ",
	MPR: "MPR",
	SECTION: "РАЗДЕЛ",
	"3D_PANO": "3D ПАНОРАМА",
	TMJ: "ВНЧС (TMJ)",
};

export const BONE_PRESET = {
	windowWidth: 2000,
	windowCenter: 500,
	sharpen: 35,
	invert: false,
	emboss: false,
} as const;

export const ENAMEL_PRESET = {
	windowWidth: 4000,
	windowCenter: 1500,
	sharpen: 40,
	invert: false,
	emboss: false,
} as const;

export const DENTIN_PRESET = {
	windowWidth: 1500,
	windowCenter: 300,
	sharpen: 30,
	invert: false,
	emboss: false,
} as const;

export const RESET_WINDOW_PRESET = {
	windowWidth: 2000,
	windowCenter: 500,
	smooth: false,
	maxRes: false,
	mip: false,
	vr: false,
	invert: false,
	sharpen: 0,
} as const;

export const MISCH_CLINICAL_GUIDES: Record<string, string> = {
	D1: "Плотная кортикальная кость (симфиз). Обязательно полное препарирование с охлаждением физраствором и нарезанием резьбы метчиком (bone tap) на 15-25 об/мин во избежание термического остеонекроза.",
	D2: "Оптимальная плотная губчатая кость с выраженным кортексом. Стандартный ступенчатый протокол сверления. Первичная стабильность прогнозируется на уровне 35–45 Н·см.",
	D3: "Пористая губчатая кость (верхняя челюсть). Рекомендуется протокол щадящего сверления (under-drilling на 0.5 мм меньше диаметра имплантата) и остеоконденсация для уплотнения ложа.",
	D4: "Мягкая кость низкой плотности (бугор верхней челюсти). Требуется бикортикальная фиксация или остеоконденсация остеотомами. Прогноз первичной стабильности снижен.",
	D5: "Зона выраженной атрофии или дефекта костной ткани. Необходима направленная костная регенерация (НКР) до установки имплантата.",
};
