/**
 * DENTE CRM — Radiology Consultation Split: Diagnostic Sync & EHR Tooth Binding
 * Subcontroller for reactive synchronization between X-ray/CBCT findings, Odontogram (FDI), and Form 043/u EHR.
 * Strictly <= 500 lines (Mandate 8b, 8e, 8k, 8n & Zero Mocks).
 */

import { useCallback, useState } from "react";
import type {
	DentalDisciplineId,
	ConsultationPathologyItem,
} from "../ConsultationPathologyLibrary.js";
import { formatFilmstripDateTime, type RadiologyFilmstripItem } from "../RadiologyFilmstripDock.js";
import { showToast } from "../../GlobalToast.js";
import type { RadiologyStudy } from "../types.js";
import type { ConsultationSlot, ViewportState } from "../consultationCanvasRenderers.js";
import { useVisitStore } from "../../../store/visitStore.js";
import type { VisitToothUiState } from "../../../store/visit/types.js";

export interface UseRadiologyDiagnosticSyncControllerProps {
	readonly activeToothFdi?: string | number | undefined;
	readonly leftViewport: ViewportState;
	readonly setLeftViewport: React.Dispatch<React.SetStateAction<ViewportState>>;
	readonly setRightViewport: React.Dispatch<React.SetStateAction<ViewportState>>;
	readonly activeSlot: ConsultationSlot;
	readonly setActiveSlot: (slot: ConsultationSlot) => void;
}

/**
 * Определяет UI-статус зуба в одонтограмме по коду патологии или дисциплине
 */
function mapPathologyToToothUiState(pathology: ConsultationPathologyItem): VisitToothUiState {
	const code = pathology.code.toUpperCase();
	const discipline = pathology.disciplineId;

	if (code.includes("IMP") || discipline === "implant") {
		return "planned";
	}
	if (code.includes("PERIO") || discipline === "periodontics") {
		return "treatment";
	}
	if (code.includes("ENDO") || code.includes("PULP") || pathology.titleRu.toLowerCase().includes("периодонтит") || pathology.titleRu.toLowerCase().includes("пульпит")) {
		return "pulpitis";
	}
	if (code.includes("CAR") || pathology.titleRu.toLowerCase().includes("кариес")) {
		return "caries";
	}
	if (discipline === "prosthodontics") {
		return "crown";
	}
	return "treatment";
}

export function useRadiologyDiagnosticSyncController({
	activeToothFdi,
	leftViewport,
	setLeftViewport,
	setRightViewport,
	activeSlot,
	setActiveSlot,
}: UseRadiologyDiagnosticSyncControllerProps) {
	// 8 Dental Disciplines State
	const [selectedDiscipline, setSelectedDiscipline] = useState<DentalDisciplineId>("conservative");

	/**
	 * Реактивная привязка выбранного снимка к активному зубу в одонтограмме и карте визита
	 */
	const syncToothWithEhr = useCallback((toothFdi: string | number | undefined) => {
		if (!toothFdi) return;
		const toothNum = typeof toothFdi === "number" ? toothFdi : Number.parseInt(String(toothFdi), 10);
		if (Number.isFinite(toothNum) && toothNum >= 11 && toothNum <= 85) {
			try {
				useVisitStore.getState().setActiveToothNumber(toothNum);
			} catch {
				// Outside active visit context
			}
		}
	}, []);

	/**
	 * Назначение снимка из ленты пациента в активный слот
	 */
	const handleSelectCapturedStudy = useCallback(
		(study: RadiologyStudy | RadiologyFilmstripItem) => {
			const imgSrc = study.imageUrl || study.thumbnailUrl || "";
			const title =
				(study as any).title ||
				(study as any).studyDescription ||
				(study.teethFdi?.[0] ? `Зуб ${study.teethFdi[0]}` : "Рентген визиографа");
			const dateStr = formatFilmstripDateTime(study.studyDate).dateStr;
			const targetTooth = study.teethFdi?.[0];

			const targetUpdater = (prev: ViewportState) => ({
				...prev,
				imageSrc: imgSrc,
				title,
				subtitle: dateStr,
				toothCode: targetTooth || prev.toothCode,
				zoom: 1.0,
				panX: 0,
				panY: 0,
			});

			if (activeSlot === "left") {
				setLeftViewport(targetUpdater);
			} else {
				setRightViewport(targetUpdater);
			}

			// Реактивно привязываем одонтограмму к зубу со снимка
			if (targetTooth) {
				syncToothWithEhr(targetTooth);
			}

			showToast(
				`Снимок назначен в ${activeSlot === "left" ? "левое (До)" : "правое (После)"} окно${targetTooth ? ` · Привязан к зубу ${targetTooth}` : ""}`,
				"info",
			);
		},
		[activeSlot, setLeftViewport, setRightViewport, syncToothWithEhr],
	);

	/**
	 * Реактивный выбор патологии из атласа:
	 * 1. Выводит рентген-эталон в правый демонстрационный экран
	 * 2. Автоматически вносит диагноз (МКБ-10) и план лечения в Форму 043/у
	 * 3. Обновляет статус зуба в одонтограмме без необходимости F5
	 */
	const handleSelectPathology = useCallback(
		(pathology: ConsultationPathologyItem) => {
			const src = pathology.imageUrl || pathology.previewUrl || "/radiology/sample_rvg_tooth16.jpg";

			// 1. Обновляем правый вьюпорт
			setRightViewport((prev) => ({
				...prev,
				imageSrc: src,
				title: pathology.titleRu,
				subtitle: `${pathology.code} · ${pathology.titleEn}`,
				zoom: 1.0,
				panX: 0,
				panY: 0,
				annotations: [],
			}));
			setActiveSlot("right");

			// 2. Определяем целевой зуб
			const storeActiveTooth = useVisitStore.getState().activeToothNumber;
			const resolvedTooth =
				leftViewport.toothCode ||
				activeToothFdi ||
				(storeActiveTooth ? String(storeActiveTooth) : "16");
			const toothKey = String(resolvedTooth);
			const toothNum = Number.parseInt(toothKey, 10) || 16;

			// 3. Формируем диагноз и план лечения
			const icdPrefix = pathology.icd10 ? `${pathology.icd10} ` : "";
			const diagnosisLine = `Зуб #${toothKey}: ${icdPrefix}${pathology.titleRu}`;
			const treatmentLine = `Зуб #${toothKey}: ${pathology.recommendedTreatmentRu}`;
			const objectiveNote = `Зуб #${toothKey}: на рентгенограмме/КТ — ${pathology.titleRu}. ${pathology.descriptionRu}`;

			const targetToothState = mapPathologyToToothUiState(pathology);

			// 4. Реактивно гидратируем visitStore
			try {
				const store = useVisitStore.getState();

				// Устанавливаем активный зуб в одонтограмме
				store.setActiveToothNumber(toothNum);

				// Обновляем одонтограмму и статус зуба
				store.setVisitToothRecord(toothKey, {
					toothNumber: toothNum,
					state: targetToothState,
					diagnosis: `${icdPrefix}${pathology.titleRu}`,
					...(pathology.icd10 ? { diagnosisIcd10: pathology.icd10 } : {}),
					treatmentPlan: treatmentLine,
				});

				// Вносим запись в Форму 043/у (Осмотр, Диагноз, План лечения)
				store.setVisitNoteForm((prev) => {
					const prevObj = prev.objectiveStatus?.trim() || "";
					const prevDiag = prev.diagnosis?.trim() || "";
					const prevPlan = prev.treatmentPlan?.trim() || "";

					const nextObj = prevObj ? `${prevObj}\n${objectiveNote}` : objectiveNote;
					const nextDiag = prevDiag ? `${prevDiag}\n${diagnosisLine}` : diagnosisLine;
					const nextPlan = prevPlan ? `${prevPlan}\n${treatmentLine}` : treatmentLine;

					return {
						...prev,
						objectiveStatus: nextObj,
						diagnosis: nextDiag,
						treatmentPlan: nextPlan,
					};
				});

				// Диспетчеризуем глобальное событие SOAP-протокола для мгновенного обновления любых открытых вкладок
				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("dente-apply-soap-protocol", {
							detail: {
								soap: {
									statusLocalis: objectiveNote,
									diagnosis: diagnosisLine,
									treatmentDescription: treatmentLine,
								},
								mode: "smart_append",
								immediate: true,
							},
						}),
					);
				}
			} catch {
				// Outside active visit store context
			}

			showToast(
				`«${pathology.titleRu}» привязана к зубу #${toothKey} и внесена в диагноз и план лечения Формы 043/у`,
				"success",
			);
		},
		[activeToothFdi, leftViewport.toothCode, setActiveSlot, setRightViewport],
	);

	/**
	 * Назначение снимка в конкретный слот (Левый или Правый)
	 */
	const handleAssignStudyToSlot = useCallback(
		(study: RadiologyStudy | RadiologyFilmstripItem, slot: ConsultationSlot) => {
			const imgSrc = study.imageUrl || study.thumbnailUrl || "";
			const dateStr = formatFilmstripDateTime(study.studyDate).dateStr;
			const title =
				(study as any).title ||
				(study as any).studyDescription ||
				(slot === "left" ? "Снимок ДО лечения" : "Контроль ПОСЛЕ лечения");
			const targetTooth = study.teethFdi?.[0];

			const updater = (prev: ViewportState) => ({
				...prev,
				imageSrc: imgSrc,
				title,
				subtitle: dateStr,
				toothCode: targetTooth || prev.toothCode,
				zoom: 1.0,
				panX: 0,
				panY: 0,
			});

			if (slot === "left") {
				setLeftViewport(updater);
			} else {
				setRightViewport(updater);
			}
			setActiveSlot(slot);

			if (targetTooth) {
				syncToothWithEhr(targetTooth);
			}

			showToast(
				`Снимок назначен в ${slot === "left" ? "левое окно (До)" : "правое окно (После)"}${targetTooth ? ` · Зуб ${targetTooth}` : ""}`,
				"info",
			);
		},
		[setActiveSlot, setLeftViewport, setRightViewport, syncToothWithEhr],
	);

	return {
		selectedDiscipline,
		setSelectedDiscipline,
		handleSelectCapturedStudy,
		handleSelectPathology,
		handleAssignStudyToSlot,
	};
}
