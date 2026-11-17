/**
 * DENTE CRM — Radiology Consultation Initial State Helpers (Layer 2)
 * Directed Acyclic Graph (DAG): Layer 2 (Pure domain state factories)
 */

import {
	CONSULTATION_PATHOLOGY_CATALOG,
	type ConsultationPathologyItem,
} from "../ConsultationPathologyLibrary.js";
import { formatFilmstripDateTime, type RadiologyFilmstripItem } from "../RadiologyFilmstripDock.js";
import type { RadiologyStudy } from "../types.js";
import type { ViewportState } from "../consultationCanvasRenderers.js";
import type { ConsultationSplitMode } from "../ConsultationTopToolbar.js";
import type { ConsultationNoteItem } from "./types.js";

type StudyWithTitleFields = {
	readonly title?: string | undefined;
	readonly studyDescription?: string | undefined;
};

export function getStudyTitle(
	study: RadiologyStudy | RadiologyFilmstripItem | undefined,
	fallback: string,
): string {
	if (!study) return fallback;
	const candidate = study as (RadiologyStudy | RadiologyFilmstripItem) & StudyWithTitleFields;
	if (candidate.title) return candidate.title;
	if (candidate.studyDescription) return candidate.studyDescription;
	return fallback;
}

export function createDefaultEffectivePatientStudies(
	history: readonly (RadiologyStudy | RadiologyFilmstripItem)[],
): readonly (RadiologyStudy | RadiologyFilmstripItem)[] {
	if (history.length > 0) return history;
	return [
		{
			id: "sample-study-baseline-pathology",
			imageUrl: "/radiology/sample_rvg_pathology.jpg",
			thumbnailUrl: "/radiology/sample_rvg_pathology.jpg",
			title: "Снимок ДО лечения (Кариес / Очаг)",
			studyDate: "2024-01-12T09:15:00.000Z",
			modality: "IO_SENSOR",
			teethFdi: ["16"],
		},
		{
			id: "sample-study-followup-obturation",
			imageUrl: "/radiology/sample_rvg_tooth16.jpg",
			thumbnailUrl: "/radiology/sample_rvg_tooth16.jpg",
			title: "Контроль ПОСЛЕ лечения (Обтурация каналов)",
			studyDate: "2024-05-16T10:45:00.000Z",
			modality: "IO_SENSOR",
			teethFdi: ["16"],
		},
	];
}

export function createInitialLeftViewport(options: {
	readonly initialLeftStudy?: RadiologyStudy | RadiologyFilmstripItem | undefined;
	readonly effectiveStudies: readonly (RadiologyStudy | RadiologyFilmstripItem)[];
	readonly activeToothFdi?: string | number | undefined;
}): ViewportState {
	const { initialLeftStudy, effectiveStudies, activeToothFdi } = options;
	const s = initialLeftStudy || effectiveStudies[0];
	const fallbackTitle = s?.teethFdi?.[0] ? `Снимок зуба ${s.teethFdi[0]} (ДО)` : "Снимок ДО лечения";
	return {
		imageSrc: s?.imageUrl || s?.thumbnailUrl || "/radiology/sample_rvg_pathology.jpg",
		title: getStudyTitle(s, fallbackTitle),
		subtitle: s?.studyDate ? formatFilmstripDateTime(s.studyDate).dateStr : "12.01.2024",
		toothCode: s?.teethFdi?.[0] || (activeToothFdi ? String(activeToothFdi) : "16"),
		zoom: 1.0,
		panX: 0,
		panY: 0,
		invert: false,
		sharpness: false,
		annotations: [],
	};
}

export function createInitialRightViewport(options: {
	readonly initialRightStudy?: RadiologyStudy | RadiologyFilmstripItem | undefined;
	readonly effectiveStudies: readonly (RadiologyStudy | RadiologyFilmstripItem)[];
	readonly splitMode: ConsultationSplitMode;
	readonly activeToothFdi?: string | number | undefined;
}): ViewportState {
	const { initialRightStudy, effectiveStudies, splitMode, activeToothFdi } = options;

	if (initialRightStudy) {
		const s = initialRightStudy;
		return {
			imageSrc: s.imageUrl || s.thumbnailUrl || "/radiology/sample_rvg_tooth16.jpg",
			title: getStudyTitle(s, "Контроль ПОСЛЕ лечения (Обтурация)"),
			subtitle: s.studyDate ? formatFilmstripDateTime(s.studyDate).dateStr : "16.05.2024",
			toothCode: s.teethFdi?.[0] || (activeToothFdi ? String(activeToothFdi) : "16"),
			zoom: 1.0,
			panX: 0,
			panY: 0,
			invert: false,
			sharpness: false,
			annotations: [],
		};
	}

	if (splitMode === "atlas") {
		const fallbackPathology: ConsultationPathologyItem = {
			id: "periapical-periodontitis",
			disciplineId: "conservative",
			code: "K04.5",
			titleRu: "Хронический апикальный периодонтит",
			titleEn: "Chronic apical periodontitis",
			descriptionRu: "Хроническое воспаление периапикальных тканей зуба",
			stages: ["Начальная стадия", "Деструктивная стадия"],
			keyEducationalPoints: ["Очаг деструкции костной ткани у апекса"],
			recommendedTreatmentRu: "Эндодонтическое лечение и обтурация корневых каналов",
			previewUrl: "/radiology/sample_rvg_tooth16.jpg",
			imageUrl: "/radiology/sample_rvg_tooth16.jpg",
		};
		const defaultPathology =
			CONSULTATION_PATHOLOGY_CATALOG[1] ??
			CONSULTATION_PATHOLOGY_CATALOG[0] ??
			fallbackPathology;
		return {
			imageSrc:
				defaultPathology.imageUrl ||
				defaultPathology.previewUrl ||
				"/radiology/sample_rvg_tooth16.jpg",
			title: defaultPathology.titleRu,
			subtitle: `${defaultPathology.code} · ${defaultPathology.titleEn}`,
			toothCode: activeToothFdi ? String(activeToothFdi) : undefined,
			zoom: 1.0,
			panX: 0,
			panY: 0,
			invert: false,
			sharpness: false,
			annotations: [],
		};
	}

	const s =
		effectiveStudies.length >= 2 ? effectiveStudies[effectiveStudies.length - 1] : undefined;
	return {
		imageSrc: s?.imageUrl || s?.thumbnailUrl || "/radiology/sample_rvg_tooth16.jpg",
		title: getStudyTitle(s, "Контроль ПОСЛЕ лечения (Обтурация каналов)"),
		subtitle: s?.studyDate ? formatFilmstripDateTime(s.studyDate).dateStr : "16.05.2024",
		toothCode: s?.teethFdi?.[0] || (activeToothFdi ? String(activeToothFdi) : "16"),
		zoom: 1.0,
		panX: 0,
		panY: 0,
		invert: false,
		sharpness: false,
		annotations: [],
	};
}

export function createInitialConsiliumNotes(
	activeToothFdi?: string | number | undefined,
): readonly ConsultationNoteItem[] {
	return [
		{
			id: "note-init-1",
			authorRole: "radiologist",
			authorName: "Д-р Воронов М. К.",
			text: "По КЛКТ определяется деструкция костной ткани у апекса 16 зуба. Резорбция кортикальной пластинки.",
			timestamp: "10:15",
			targetTooth: activeToothFdi ? String(activeToothFdi) : "16",
		},
		{
			id: "note-init-2",
			authorRole: "surgeon",
			authorName: "Д-р Романенко А. И.",
			text: "Возможна одномоментная имплантация после эндодонтической ревизии либо синус-лифтинг.",
			timestamp: "10:22",
			targetTooth: activeToothFdi ? String(activeToothFdi) : "16",
		},
	];
}
