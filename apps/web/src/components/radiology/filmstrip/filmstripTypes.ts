import type { RadiologyStudy } from "../types.js";

export interface RadiologyFilmstripItem {
	readonly id: string;
	readonly title?: string;
	readonly modality: "intraoral_rvg" | "optg_panoramic" | "cbct_3d" | "trg_ceph" | "photo_clinical" | string;
	readonly modalityLabel?: string;
	readonly studyDate: string; // ISO date or "DD.MM.YYYY HH:mm:ss"
	readonly teethFdi?: string[];
	readonly imageUrl?: string;
	readonly thumbnailUrl?: string;
	readonly effectiveDoseMicrosv?: number;
	readonly apparatusModel?: string;
}

export interface RadiologyFilmstripDockProps {
	readonly studies: readonly (RadiologyStudy | RadiologyFilmstripItem)[];
	readonly activeStudyId: string | null;
	readonly onSelectStudy: (study: RadiologyStudy | RadiologyFilmstripItem) => void;
	readonly onDoubleClickStudy?: (study: RadiologyStudy | RadiologyFilmstripItem) => void;
	readonly className?: string;
	readonly isCollapsed?: boolean;
	readonly onToggleCollapse?: () => void;
}

export function formatFilmstripDateTime(rawDate: string): { dateStr: string; timeStr: string } {
	if (!rawDate) return { dateStr: "—", timeStr: "—" };

	if (/^\d{2}\.\d{2}\.\d{4}/.test(rawDate)) {
		const parts = rawDate.split(" ");
		return { dateStr: parts[0] || rawDate, timeStr: parts[1] || "" };
	}

	try {
		const d = new Date(rawDate);
		if (!Number.isNaN(d.getTime())) {
			const day = String(d.getDate()).padStart(2, "0");
			const month = String(d.getMonth() + 1).padStart(2, "0");
			const year = d.getFullYear();
			const hours = String(d.getHours()).padStart(2, "0");
			const mins = String(d.getMinutes()).padStart(2, "0");
			const secs = String(d.getSeconds()).padStart(2, "0");
			return { dateStr: `${day}.${month}.${year}`, timeStr: `${hours}:${mins}:${secs}` };
		}
	} catch {}

	return { dateStr: rawDate, timeStr: "" };
}

export function getModalityBadge(modality: string): { label: string; bg: string; color: string } {
	const norm = modality.toLowerCase();
	if (norm.includes("intraoral") || norm.includes("rvg") || norm.includes("io") || norm.includes("sensor")) {
		return { label: "IO-СЕНСОР", bg: "rgba(16, 185, 129, 0.2)", color: "#10b981" };
	}
	if (norm.includes("optg") || norm.includes("pano") || norm.includes("панорам")) {
		return { label: "ПАНОРАМА", bg: "rgba(6, 182, 212, 0.2)", color: "#06b6d4" };
	}
	if (norm.includes("cbct") || norm.includes("3d") || norm.includes("кт")) {
		return { label: "КЛКТ 3D", bg: "rgba(99, 102, 241, 0.2)", color: "#818cf8" };
	}
	if (norm.includes("ceph") || norm.includes("trg") || norm.includes("трг")) {
		return { label: "ТРГ", bg: "rgba(245, 158, 11, 0.2)", color: "#fbbf24" };
	}
	return { label: "СНИМОК", bg: "rgba(148, 163, 184, 0.2)", color: "#cbd5e1" };
}
