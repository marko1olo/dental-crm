/**
 * DENTE CRM — DICOM Toolbox Ribbon Constants & Clinical Presets (Layer 1)
 * Strict invariants: Mandate 8b (<=800 lines), Mandate 8d (Clinical density), Mandate 8e (Doctor Autonomy).
 */

import type React from "react";
import type { DicomTabType } from "./types.js";

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

export const dropdownSectionHeaderStyle: React.CSSProperties = {
	fontSize: "12px",
	fontWeight: 800,
	color: "#94a3b8",
	padding: "4px 6px",
	textTransform: "uppercase",
	borderBottom: "1px solid #1e293b",
};

export const menuItemStyle: React.CSSProperties = {
	textAlign: "left",
	padding: "6px 8px",
	fontSize: "12px",
	borderRadius: "5px",
	background: "transparent",
	border: "none",
	color: "#e2e8f0",
	cursor: "pointer",
	display: "flex",
	alignItems: "center",
	gap: "8px",
	transition: "background 0.15s ease",
};

export const checkboxLabelStyle: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: "6px",
	fontSize: "12px",
	color: "#cbd5e1",
	cursor: "pointer",
	userSelect: "none",
};

export const selectInputStyle: React.CSSProperties = {
	width: "100%",
	height: "26px",
	backgroundColor: "#1e293b",
	border: "1px solid #334155",
	borderRadius: "6px",
	color: "#f8fafc",
	fontSize: "12px",
	padding: "0 6px",
};

export const numberInputStyle: React.CSSProperties = {
	width: "80px",
	height: "26px",
	backgroundColor: "#1e293b",
	border: "1px solid #475569",
	borderRadius: "6px",
	color: "#f8fafc",
	fontSize: "12px",
	fontWeight: 700,
	fontFamily: "monospace",
	textAlign: "right",
	padding: "0 6px",
};

export const statPillStyle: React.CSSProperties = {
	backgroundColor: "#020617",
	border: "1px solid #1e293b",
	borderRadius: "6px",
	padding: "6px 8px",
	display: "flex",
	flexDirection: "column",
	gap: "2px",
};
