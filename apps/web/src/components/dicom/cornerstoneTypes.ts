import { vec3 } from "gl-matrix";
import type { MischClass } from "../../utils/dicom/boneQualityEngine";
import type { StoredImplant, WorldPoint3 } from "./ctPlanningPersistence";
import { worldTriple } from "./ctPlanningPersistence";
import { teardownViewportCanvases } from "../../utils/viewportTeardownHelper";

export type ExtendedMischClass = MischClass | "D5";

export interface ImplantData {
	id: string;
	fdiCode: string;
	diameter: number;
	length: number;
	startWorld: vec3;
	endWorld: vec3;
	boneDensity: {
		averageHU: number;
		classification: ExtendedMischClass;
		drillingAdvice?: string;
		corticalHU?: number;
		cancellousHU?: number;
		apicalHU?: number;
	};
	distanceToNerve?: number | null;
	systemId?: string | undefined;
	brandName?: string | undefined;
	lineName?: string | undefined;
	platformCode?: string | undefined;
	platformColor?: string | undefined;
}

export interface Cornerstone3DViewerProps {
	imageIds: string[];
	patientId?: string | null | undefined;
	patientName?: string | undefined;
	studyDate?: string | undefined;
	voxelSpacing?: { readonly x: number; readonly y: number; readonly z: number } | undefined;
	authHeaders?: Record<string, string> | undefined;
	onClose?: (() => void) | undefined;
}

export const MARKUP_SAVE_DEBOUNCE_MS = 1500;
export const MANDIBULAR_NERVE_DANGER_THRESHOLD_MM = 2.0;

export function classifyExtendedBoneDensity(hu: number): {
	mischClass: ExtendedMischClass;
	label: string;
	drillingRecommendation: string;
} {
	if (hu > 1250) {
		return {
			mischClass: "D1",
			label: "D1 (>1250 HU) — Плотная кортикальная кость",
			drillingRecommendation:
				"Обязательна кортикальная фреза (Cortical Tap), низкие обороты (400–600 RPM) с обильным охлаждением. Высокий риск перегрева/остеонекроза!",
		};
	}
	if (hu >= 850) {
		return {
			mischClass: "D2",
			label: "D2 (850–1250 HU) — Пористая кортикальная и плотная губчатая",
			drillingRecommendation:
				"Стандартный хирургический протокол (800–1000 RPM). Идеальная первичная стабильность.",
		};
	}
	if (hu >= 350) {
		return {
			mischClass: "D3",
			label: "D3 (350–850 HU) — Тонкая кортикальная и мелкая губчатая",
			drillingRecommendation:
				"Стандартный протокол с финишным профильным сверлом (1000 RPM). Хороший прогноз остеоинтеграции.",
		};
	}
	if (hu >= 150) {
		return {
			mischClass: "D4",
			label: "D4 (150–350 HU) — Мягкая губчатая кость",
			drillingRecommendation:
				"Недопрепарирование (Under-drilling) на 1.0–1.5 мм меньше диаметра имплантата для компрессии кости и набора торка.",
		};
	}
	return {
		mischClass: "D5",
		label: "D5 (<150 HU) — Сверхмягкая / резорбированная кость",
		drillingRecommendation:
			"Критическое недопрепарирование (Under-drilling) на 1.5–2.0 мм, костная конденсация остеотомами или бикортикальная фиксация.",
	};
}

export function storedImplantsOf(implants: readonly ImplantData[]): StoredImplant[] {
	const out: StoredImplant[] = [];
	for (const implant of implants) {
		const startWorld = worldTriple(Array.from(implant.startWorld));
		const endWorld = worldTriple(Array.from(implant.endWorld));
		if (!startWorld || !endWorld) continue;
		out.push({
			id: implant.id,
			fdiCode: implant.fdiCode,
			diameter: implant.diameter,
			length: implant.length,
			startWorld,
			endWorld,
			boneDensity: {
				averageHU: implant.boneDensity.averageHU,
				classification: implant.boneDensity.classification,
			},
			...(typeof implant.distanceToNerve === "number"
				? { distanceToNerve: implant.distanceToNerve }
				: {}),
			...(implant.systemId ? { systemId: implant.systemId } : {}),
			...(implant.brandName ? { brandName: implant.brandName } : {}),
			...(implant.lineName ? { lineName: implant.lineName } : {}),
			...(implant.platformCode ? { platformCode: implant.platformCode } : {}),
			...(implant.platformColor ? { platformColor: implant.platformColor } : {}),
		});
	}
	return out;
}

export function implantDataOf(stored: readonly StoredImplant[]): ImplantData[] {
	return stored.map((implant) => {
		const densityInfo = classifyExtendedBoneDensity(implant.boneDensity.averageHU);
		return {
			id: implant.id,
			fdiCode: implant.fdiCode,
			diameter: implant.diameter,
			length: implant.length,
			startWorld: vec3.fromValues(
				implant.startWorld[0],
				implant.startWorld[1],
				implant.startWorld[2],
			),
			endWorld: vec3.fromValues(
				implant.endWorld[0],
				implant.endWorld[1],
				implant.endWorld[2],
			),
			boneDensity: {
				averageHU: implant.boneDensity.averageHU,
				classification: densityInfo.mischClass,
				drillingAdvice: densityInfo.drillingRecommendation,
			},
			distanceToNerve: implant.distanceToNerve ?? null,
			systemId: implant.systemId,
			brandName: implant.brandName,
			lineName: implant.lineName,
			platformCode: implant.platformCode,
			platformColor: implant.platformColor,
		};
	});
}

export function implantProtocolLog(implant: ImplantData): string {
	const isDanger =
		implant.distanceToNerve != null &&
		implant.distanceToNerve < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM;
	const nerveStatusText =
		implant.distanceToNerve != null
			? isDanger
				? `ВНИМАНИЕ: дистанция до нижнечелюстного канала ${implant.distanceToNerve.toFixed(1)} мм (< 2.0 мм) — опасная зона риска травматизации сосудисто-нервного пучка!`
				: `Дистанция до нижнечелюстного канала ${implant.distanceToNerve.toFixed(1)} мм (безопасный коридор ≥ 2.0 мм).`
			: "Нижнечелюстной нерв не размечен. Контроль дистанции безопасности невозможен.";

	const densityInfo = classifyExtendedBoneDensity(implant.boneDensity.averageHU);
	const brandTitle = implant.brandName
		? `${implant.brandName} ${implant.lineName ?? ""}`.trim()
		: "Дентальный имплантат";
	const platformText = implant.platformCode ? ` (Платформа ${implant.platformCode})` : "";

	return `В область зуба ${implant.fdiCode} запланирована установка имплантата ${brandTitle} Ø${implant.diameter.toFixed(1)}x${implant.length.toFixed(1)} мм${platformText}. Плотность кости: ${densityInfo.label} (${Math.round(implant.boneDensity.averageHU)} HU). Протокол препарирования: ${densityInfo.drillingRecommendation}. ${nerveStatusText}`;
}

export const VIEWPORT_IDS = {
	axial: "AXIAL",
	sagittal: "SAGITTAL",
	coronal: "CORONAL",
} as const;

export { teardownViewportCanvases };
