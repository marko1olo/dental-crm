import { formatShortDate } from "../../../AppHelpers.js";
import type { ImagingStudy } from "../../imaging/types.js";

export const regionBadgeMap: Record<string, string> = {
	maxilla_mandible: "Обе чел.",
	maxilla: "В/Ч",
	mandible: "Н/Ч",
	anterior: "Фронт",
	posterior: "Жев.",
	tmj: "ВНЧС",
	sinus: "Пазухи",
};

export const kindShortMap: Record<string, string> = {
	periapical: "RVG",
	bitewing: "Прикус",
	opg: "ОПТГ",
	ceph: "ТРГ",
	cbct: "КТ 3D",
	photo: "Фото",
};

export function getPixelSpacingMm(kind?: string): number {
	if (kind === "periapical" || kind === "bitewing") return 0.04;
	if (kind === "opg") return 0.1;
	if (kind === "cbct") return 0.125;
	return 0.04;
}

export function formatStudyToothBadge(study?: ImagingStudy | null): string {
	if (!study) return "RVG";
	if (study.toothCode) return `#${study.toothCode}`;
	if (study.region) return regionBadgeMap[study.region] ?? study.region;
	return "RVG";
}

export function formatModalityTitle(
	study?: ImagingStudy | null,
	labels: Record<string, string> = {},
): string {
	if (!study) return "Рентген";
	return labels[study.kind] || kindShortMap[study.kind] || study.kind;
}

export function formatStudyDate(study?: ImagingStudy | null): string {
	return study?.capturedAt ? formatShortDate(study.capturedAt) : "Сегодня";
}

export function findComparisonStudy(
	studies: ImagingStudy[],
	current?: ImagingStudy | null,
): ImagingStudy | null {
	if (!current) return null;
	return (
		studies.find(
			(s) =>
				s.id !== current.id &&
				((current.toothCode && s.toothCode === current.toothCode) ||
					(current.region && s.region === current.region)),
		) ||
		studies.find((s) => s.id !== current.id) ||
		null
	);
}
