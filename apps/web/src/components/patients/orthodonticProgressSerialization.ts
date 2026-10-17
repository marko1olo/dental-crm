import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";

export interface OrthoData {
	currentAligner: number;
	totalAligners: number;
	startDate: string;
}

export const getTodayString = (): string => {
	const parts = new Date().toISOString().split("T");
	return parts[0] || "";
};

export function serializeOrthoProgress(data: OrthoData): string {
	return JSON.stringify({
		currentAligner: data.currentAligner,
		totalAligners: data.totalAligners,
		startDate: data.startDate,
	});
}

export function parseOrthoProgress(raw: unknown): OrthoData | null {
	if (raw == null || raw === "") return null;
	let obj: unknown = raw;
	if (typeof raw === "string") {
		try {
			obj = JSON.parse(raw);
		} catch {
			return null;
		}
	}
	if (!obj || typeof obj !== "object") return null;
	const rec = obj as Record<string, unknown>;
	const currentAligner = Number(rec.currentAligner ?? rec.current);
	const totalAligners = Number(rec.totalAligners ?? rec.total);
	const startDate =
		typeof rec.startDate === "string"
			? rec.startDate
			: typeof rec.start === "string"
				? rec.start
				: "";
	if (!Number.isFinite(currentAligner) || currentAligner < 1) return null;
	if (!Number.isFinite(totalAligners) || totalAligners < 1) return null;
	return {
		currentAligner: Math.floor(currentAligner),
		totalAligners: Math.floor(totalAligners),
		startDate: startDate || getTodayString(),
	};
}

export function parseLegacyOrthoNotes(notesText: string | null | undefined): {
	cleanNotes: string;
	legacyOrtho: OrthoData | null;
} {
	const text = notesText || "";
	const separator = "\n\n===ORTHO===\n";
	const parts = text.split(separator);

	if (parts.length < 2) {
		return { cleanNotes: text, legacyOrtho: null };
	}

	try {
		const orthoData = JSON.parse(parts[1] || "{}");
		return {
			cleanNotes: parts[0] || "",
			legacyOrtho: {
				currentAligner: Number(orthoData.current) || 1,
				totalAligners: Number(orthoData.total) || 40,
				startDate: orthoData.start || getTodayString(),
			},
		};
	} catch (_e) {
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(_e as { status?: number })?.status ?? null,
			),
			"error",
		);
		return { cleanNotes: text, legacyOrtho: null };
	}
}

export function formatOrthoDate(dateStr: string): string {
	try {
		if (typeof dateStr !== "string" || !dateStr) return dateStr || "";
		const [y, m, d] = (dateStr ?? "").split("-");
		if (!y || !m || !d) return dateStr;
		return `${d}.${m}.${y}`;
	} catch {
		return dateStr || "";
	}
}
