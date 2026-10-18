import type { ImagingStudy } from "@dental/shared";

export type TimelineDatePreset = "all" | "today" | "yesterday" | "3days" | "last_week" | "last_month";

export const TIMELINE_DATE_PRESETS: Array<{ id: TimelineDatePreset; label: string }> = [
	{ id: "all", label: "Все даты" },
	{ id: "today", label: "Сегодня" },
	{ id: "yesterday", label: "Вчера" },
	{ id: "3days", label: "3 дня" },
	{ id: "last_week", label: "Неделя" },
	{ id: "last_month", label: "Месяц" },
];

export const FDI_TEETH_LIST = [
	"18", "17", "16", "15", "14", "13", "12", "11",
	"21", "22", "23", "24", "25", "26", "27", "28",
	"48", "47", "46", "45", "44", "43", "42", "41",
	"31", "32", "33", "34", "35", "36", "37", "38",
];

export interface PatientTimelineProps {
	readonly studies: readonly ImagingStudy[];
	readonly activeStudyId?: string | null | undefined;
	readonly onSelectStudy?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenStudio?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenScan3d?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenViewer?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenControl?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenTactileSearch?: (() => void) | undefined;
	readonly defaultZoomPx?: number | undefined;
	readonly className?: string | undefined;
}

export interface GroupedDateStudies {
	readonly dateKey: string;
	readonly formattedDate: string;
	readonly timestampMs: number;
	readonly items: readonly ImagingStudy[];
}

export function formatStudyDateKey(dateStr: string | null | undefined): {
	dateKey: string;
	formattedDate: string;
	timeStr: string;
	timestampMs: number;
} {
	if (!dateStr) {
		return { dateKey: "undated", formattedDate: "Без даты", timeStr: "", timestampMs: 0 };
	}

	const ruMatch = /^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}:\d{2}(?::\d{2})?))?/.exec(dateStr);
	if (ruMatch) {
		const [, day, month, year, time] = ruMatch;
		const d = new Date(Number(year), Number(month) - 1, Number(day));
		return {
			dateKey: `${year}-${month}-${day}`,
			formattedDate: `${day}.${month}.${year}`,
			timeStr: time || "",
			timestampMs: d.getTime(),
		};
	}

	try {
		const d = new Date(dateStr);
		if (!Number.isNaN(d.getTime())) {
			const day = String(d.getDate()).padStart(2, "0");
			const month = String(d.getMonth() + 1).padStart(2, "0");
			const year = d.getFullYear();
			const hours = String(d.getHours()).padStart(2, "0");
			const mins = String(d.getMinutes()).padStart(2, "0");
			const secs = String(d.getSeconds()).padStart(2, "0");
			return {
				dateKey: `${year}-${month}-${day}`,
				formattedDate: `${day}.${month}.${year}`,
				timeStr: `${hours}:${mins}:${secs}`,
				timestampMs: d.getTime(),
			};
		}
	} catch {
		// Fallback
	}

	return { dateKey: dateStr, formattedDate: dateStr, timeStr: "", timestampMs: 0 };
}

export function getModalityColor(modality: string | null | undefined): {
	label: string;
	bg: string;
	text: string;
	border: string;
} {
	const norm = (modality || "").toLowerCase();
	if (norm.includes("io") || norm.includes("rvg") || norm.includes("sensor") || norm.includes("сенсор") || norm.includes("periapical")) {
		return { label: "IO-СЕНСОР", bg: "rgba(16, 185, 129, 0.18)", text: "#10b981", border: "rgba(16, 185, 129, 0.4)" };
	}
	if (norm.includes("pano") || norm.includes("opg") || norm.includes("панорам")) {
		return { label: "ПАНОРАМА", bg: "rgba(6, 182, 212, 0.18)", text: "#06b6d4", border: "rgba(6, 182, 212, 0.4)" };
	}
	if (norm.includes("stl") || norm.includes("ply") || norm.includes("obj") || norm.includes("scan") || norm.includes("скан")) {
		return { label: "3D-СКАН", bg: "rgba(13, 148, 136, 0.18)", text: "#2dd4bf", border: "rgba(13, 148, 136, 0.4)" };
	}
	if (norm.includes("cbct") || norm.includes("3d") || norm.includes("кт")) {
		return { label: "КЛКТ 3D", bg: "rgba(99, 102, 241, 0.18)", text: "#818cf8", border: "rgba(99, 102, 241, 0.4)" };
	}
	if (norm.includes("ceph") || norm.includes("trg") || norm.includes("трг")) {
		return { label: "ТРГ", bg: "rgba(245, 158, 11, 0.18)", text: "#fbbf24", border: "rgba(245, 158, 11, 0.4)" };
	}
	if (norm.includes("camera") || norm.includes("камер") || norm.includes("video")) {
		return { label: "IO-КАМЕРА", bg: "rgba(236, 72, 153, 0.18)", text: "#f472b6", border: "rgba(236, 72, 153, 0.4)" };
	}
	if (norm.includes("photo") || norm.includes("фото") || norm.includes("twain")) {
		return { label: "ДРУГОЕ", bg: "rgba(168, 85, 247, 0.18)", text: "#c084fc", border: "rgba(168, 85, 247, 0.4)" };
	}
	return { label: "СНИМОК", bg: "rgba(148, 163, 184, 0.18)", text: "#cbd5e1", border: "rgba(148, 163, 184, 0.4)" };
}
