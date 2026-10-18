import { isDemoPatientId, isDemoShowcaseMode } from "../../../../lib/demoMode.js";
import type { RadiologyFilmstripItem } from "../../RadiologyFilmstripDock.js";
import type { RadiologyStudy } from "../../types.js";

export function resolveActiveImageUrl(
	activeStudy: RadiologyStudy | RadiologyFilmstripItem | null,
	initialImageUrl?: string,
	medicalCardNumber?: string,
): string {
	if (activeStudy?.imageUrl) return activeStudy.imageUrl;
	if (activeStudy?.thumbnailUrl) return activeStudy.thumbnailUrl;
	if (initialImageUrl) return initialImageUrl;
	if (isDemoShowcaseMode() || isDemoPatientId((activeStudy as any)?.patientId || medicalCardNumber)) {
		return "/radiology/sample_rvg_tooth16.jpg";
	}
	return "";
}

export function resolveEffectiveStudiesHistory(
	studiesHistory: readonly (RadiologyStudy | RadiologyFilmstripItem)[] | undefined,
	activeStudy: RadiologyStudy | RadiologyFilmstripItem | null,
	effectiveTooth: string,
	activeImageUrl: string,
): readonly (RadiologyStudy | RadiologyFilmstripItem)[] {
	if (studiesHistory && studiesHistory.length > 0) return studiesHistory;
	const curImg = activeImageUrl || "/radiology/sample_rvg_tooth16.jpg";
	return [
		{
			id: activeStudy?.id || "study-current",
			title: (activeStudy as any)?.title || (effectiveTooth ? `Прицельный снимок зуба #${effectiveTooth}` : "Прицельный снимок RVG"),
			modality: "intraoral_rvg",
			modalityLabel: "IO-СЕНСОР",
			studyDate: activeStudy?.studyDate || "01.10.2026 10:14:20",
			teethFdi: effectiveTooth ? [effectiveTooth] : [],
			imageUrl: curImg,
			effectiveDoseMicrosv: 3.0,
		},
		{
			id: "study-prior-1",
			title: "Контроль обтурации каналов",
			modality: "intraoral_rvg",
			modalityLabel: "IO-СЕНСОР",
			studyDate: "20.09.2026 09:14:20",
			teethFdi: ["16"],
			imageUrl: "/radiology/sample_rvg_tooth16.jpg",
			effectiveDoseMicrosv: 3.0,
		},
		{
			id: "study-prior-2",
			title: "Периапикальный снимок",
			modality: "intraoral_rvg",
			modalityLabel: "IO-СЕНСОР",
			studyDate: "24.03.2026 14:30:10",
			teethFdi: ["36"],
			imageUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
			effectiveDoseMicrosv: 3.0,
		},
	];
}
