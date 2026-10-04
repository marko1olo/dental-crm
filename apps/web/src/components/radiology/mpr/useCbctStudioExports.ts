/**
 * DENTE CRM — CBCT Implant Studio Export Handlers Hook
 * Standards: Mandate 8b (<= 800 lines), Mandate 8e (Doctor Autonomy).
 */

import { useState, useCallback } from "react";
import type { CrossSectionSliceData } from "../dentalCurveEngine";
import { measureAlveolarRidgeCrossSection } from "../dentalCurveEngine";
import {
	type VirtualImplantSpec,
	type CrossSectionImplantPose,
	type MandibularCanalCrossSection,
	type NerveSafetyAuditResult,
	buildImplantProstheticSuite,
} from "../implantSafetyEngine";
import type { AlveolarRidgeCaliperMeasurement } from "../cbctCaliperNerveMath";
import type { HUZoneSampling, MischClassificationResult } from "../boneDensityMischMath";
import type { RadiologyStudy } from "../types";
import type { TreatmentPlanItem } from "../../treatment-plans/types";
import { showToast } from "../../GlobalToast";
import { exportCleanViewportSnapshot } from "../cbctSnapshotExportMath";
import type { DentalLabOrderData } from "../../lab/labMath";
import {
	exportImplantToTreatmentPlan,
	exportImplantToDiary043,
	exportImplantToScheduleDraft,
	exportPdfImplantReport,
	addCbctToFinanceAndPlan,
	addCbctSurgicalToVisitFinance,
	addCbctServiceToTreatmentPlan,
	savePersistedCustomPlanItem,
	updateOdontogramToothToPlannedImplant,
} from "../ctImplantIntegrationBridge";

export interface UseCbctStudioExportsProps {
	readonly patientId?: string | undefined;
	readonly patientDisplayName: string;
	readonly study?: RadiologyStudy | null | undefined;
	readonly activeCrossSection: CrossSectionSliceData | null;
	readonly activeCaliper?: AlveolarRidgeCaliperMeasurement | null | undefined;
	readonly ridgeHeightMm?: number | null | undefined;
	readonly ridgeWidthMm?: number | null | undefined;
	readonly currentImplantSpec: VirtualImplantSpec;
	readonly currentImplantPose: CrossSectionImplantPose;
	readonly currentCanal: MandibularCanalCrossSection;
	readonly implantAngulationDeg: number;
	readonly displayBoneClass: string;
	readonly displayMeanHU: number | null;
	readonly displayNerveClearanceMm: number | null;
	readonly displayTorque: string;
	readonly displayDrillingProtocol: string;
	readonly nerveAuditResult: NerveSafetyAuditResult;
	readonly huSamplingResult: HUZoneSampling;
	readonly mischClassification: MischClassificationResult;
	readonly onApplyToPlan?: ((item: TreatmentPlanItem) => void) | undefined;
	readonly onApplyToDiary043?: ((summary: any) => void) | undefined;
	readonly onOpenLabOrder?: ((draft: DentalLabOrderData) => void) | undefined;
	readonly crossSectionCanvasRef?: React.RefObject<HTMLCanvasElement | null> | undefined;
}

export function useCbctStudioExports({
	patientId,
	patientDisplayName,
	study,
	activeCrossSection,
	activeCaliper,
	ridgeHeightMm,
	ridgeWidthMm,
	currentImplantSpec,
	currentImplantPose,
	currentCanal,
	implantAngulationDeg,
	displayBoneClass,
	displayMeanHU,
	displayNerveClearanceMm,
	displayTorque,
	displayDrillingProtocol,
	nerveAuditResult,
	huSamplingResult,
	mischClassification,
	onApplyToPlan,
	onApplyToDiary043,
	onOpenLabOrder,
	crossSectionCanvasRef,
}: UseCbctStudioExportsProps) {
	const crossSectionMeasurement = activeCrossSection
		? measureAlveolarRidgeCrossSection(activeCrossSection)
		: null;

	const effectiveRidgeHeightMm =
		activeCaliper?.heightMm ??
		ridgeHeightMm ??
		crossSectionMeasurement?.heightMm ??
		activeCrossSection?.corticalCrestHeightMm ??
		null;

	const effectiveRidgeWidthMm =
		activeCaliper?.crestWidthMm ??
		ridgeWidthMm ??
		crossSectionMeasurement?.crestWidthMm ??
		activeCrossSection?.alveolarRidgeWidthMm ??
		null;

	const handleExportToPlan = useCallback(() => {
		const targetTooth = Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
		const isMaxilla = targetTooth < 30;
		const anatomyLabel = isMaxilla ? "пазухи" : "канала IAN";
		const nerveStatus = displayNerveClearanceMm !== null
			? `дистанция до ${anatomyLabel}: ${displayNerveClearanceMm.toFixed(1)} мм`
			: "дистанция не определена";
		const ridgeHStr = typeof effectiveRidgeHeightMm === "number" ? `H=${effectiveRidgeHeightMm.toFixed(1)} мм` : "H: —";
		const ridgeWStr = typeof effectiveRidgeWidthMm === "number" ? `W=${effectiveRidgeWidthMm.toFixed(1)} мм` : "W: —";

		const clinicalRationale =
			`КЛКТ-планирование (зуб #${targetTooth}): гребень ${ridgeHStr}, ${ridgeWStr}. ` +
			`Плотность кости: Misch ${displayBoneClass} (гребень ${Math.round(huSamplingResult.coronalCrestalHU)} HU, тело ${Math.round(huSamplingResult.trabecularCoreHU)} HU, апекс ${Math.round(huSamplingResult.apicalBaseHU)} HU, среднее ${Math.round(displayMeanHU ?? huSamplingResult.overallMeanHU)} HU). ` +
			`${nerveStatus}. Протокол: ${mischClassification?.clinicalDrillingRecommendation || displayDrillingProtocol}. Ожидаемый торк: ${displayTorque}.`;

		// 0. Capture slice dataUrl for plan attachment
		let sliceDataUrl: string | null = null;
		try {
			const targetCanvas =
				crossSectionCanvasRef?.current ||
				(typeof document !== "undefined"
					? (document.querySelector('canvas[data-testid="cbct-cross-section-sidebar-canvas"]') as HTMLCanvasElement | null) ||
					  (document.querySelector('canvas') as HTMLCanvasElement | null)
					: null);
			if (targetCanvas) {
				sliceDataUrl = targetCanvas.toDataURL("image/png");
			}
		} catch {
			// ignore canvas capture failure
		}

		// 1. Build complete 3-position surgical & prosthetic suite (implant + healing abutment + custom abutment)
		const suite = buildImplantProstheticSuite(currentImplantSpec, targetTooth, clinicalRationale);

		// 2. Persist all 3 items to localStorage for patient plan
		const planItems: TreatmentPlanItem[] = suite.suiteItems.map((item, idx) => ({
			id: `plan-implant-suite-${targetTooth}-${idx}-${Date.now()}`,
			toothNumber: targetTooth,
			code804n: item.code804n,
			name: item.name,
			category: item.category as any,
			priceRub: item.priceRub,
			unitPriceRub: item.priceRub,
			discountRub: 0,
			quantity: 1,
			phase: item.phase,
			stageKind: item.stageKind as any,
			isAuto: false,
			materials: item.materials,
			clinicalRationale: item.clinicalRationale,
		}));

		if (patientId && typeof window !== "undefined") {
			for (const pItem of planItems) {
				savePersistedCustomPlanItem(patientId, pItem);
			}

			if (sliceDataUrl) {
				try {
					const planAttachment = {
						id: `plan-cbct-slice-${targetTooth}-${Date.now()}`,
						patientId,
						toothNumber: targetTooth,
						title: `КЛКТ срез для хирургического этапа (зуб #${targetTooth})`,
						sliceUrl: sliceDataUrl,
						capturedAt: new Date().toISOString(),
						implantInfo: `${currentImplantSpec.brandName} Ø${currentImplantSpec.diameterMm}x${currentImplantSpec.lengthMm}`,
					};
					const attachKey = `dente_patient_treatment_plan_attachments_${patientId}`;
					const existingAttachRaw = window.localStorage.getItem(attachKey);
					const existingAttaches = existingAttachRaw ? JSON.parse(existingAttachRaw) : [];
					existingAttaches.push(planAttachment);
					window.localStorage.setItem(attachKey, JSON.stringify(existingAttaches));
					window.dispatchEvent(new CustomEvent("dente-treatment-plan-attachment-added", { detail: planAttachment }));
				} catch {
					// ignore
				}
			}
		}

		// 3. Mark tooth in odontogram
		updateOdontogramToothToPlannedImplant(targetTooth);

		// 4. Dispatch events for UI reactivity
		if (typeof window !== "undefined") {
			for (const pItem of planItems) {
				try {
					window.dispatchEvent(
						new CustomEvent("dente-add-treatment-plan-item", {
							detail: {
								item: pItem,
								toothNumber: targetTooth,
								patientId,
								sliceDataUrl,
							},
						}),
					);
				} catch {
					// ignore
				}
			}
		}

		// 5. Callback for parent modal
		if (onApplyToPlan && planItems[0]) {
			onApplyToPlan(planItems[0]);
		}

		const totalRub = suite.totalPriceRub.toLocaleString("ru-RU");
		showToast(
			`Хирургический этап #${targetTooth} со срезом КЛКТ: имплантат (${(suite.implantPriceKopecks / 100).toLocaleString("ru-RU")} ₽) + формирователь + абатмент = ${totalRub} ₽ добавлен в план лечения!`,
			"success",
			5000,
		);
	}, [
		patientId, activeCrossSection, currentImplantSpec, effectiveRidgeHeightMm,
		effectiveRidgeWidthMm, displayBoneClass, displayMeanHU, displayNerveClearanceMm,
		displayTorque, displayDrillingProtocol, huSamplingResult, mischClassification,
		onApplyToPlan, crossSectionCanvasRef,
	]);

	const handleExportToSchedule = useCallback(() => {
		const targetTooth = Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
		exportImplantToScheduleDraft({
			patientId,
			patientName: patientDisplayName,
			toothFdi: targetTooth,
			implantSpec: currentImplantSpec,
			angulationDeg: implantAngulationDeg,
			ridgeHeightMm: effectiveRidgeHeightMm,
			ridgeWidthMm: effectiveRidgeWidthMm,
			mischClass: displayBoneClass,
			meanHU: displayMeanHU,
			nerveClearanceMm: displayNerveClearanceMm,
			recommendedTorqueNcm: displayTorque,
			drillingProtocol: displayDrillingProtocol,
		});
	}, [
		patientId, patientDisplayName, activeCrossSection, currentImplantSpec,
		implantAngulationDeg, effectiveRidgeHeightMm, effectiveRidgeWidthMm,
		displayBoneClass, displayMeanHU, displayNerveClearanceMm,
		displayTorque, displayDrillingProtocol,
	]);

	const handleExportToEmr = useCallback(async () => {
		const targetTooth = Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
		const isMaxilla = targetTooth < 30;
		const anatomyLabel = isMaxilla ? "пазухи" : "канала IAN";
		const effectivePatientId = patientId || "cbct-patient";

		// 1. Capture high-resolution slice image from cross-section canvas
		let sliceDataUrl: string | null = null;
		try {
			const targetCanvas =
				crossSectionCanvasRef?.current ||
				(typeof document !== "undefined"
					? (document.querySelector('canvas[data-testid="cbct-cross-section-sidebar-canvas"]') as HTMLCanvasElement | null) ||
					  (document.querySelector('canvas') as HTMLCanvasElement | null)
					: null);
			if (targetCanvas) {
				sliceDataUrl = targetCanvas.toDataURL("image/png");
			}
		} catch {
			// ignore canvas capture failure
		}

		// 2. Attach high-resolution slice to patient EMR in localStorage & reactive event
		if (sliceDataUrl && typeof window !== "undefined") {
			try {
				const emrAttachment = {
					id: `emr-cbct-slice-${targetTooth}-${Date.now()}`,
					patientId: effectivePatientId,
					patientName: patientDisplayName,
					title: `КЛКТ срез (300 DPI) — планирование имплантата #${targetTooth} (${currentImplantSpec.brandName} Ø${currentImplantSpec.diameterMm}x${currentImplantSpec.lengthMm})`,
					kind: "cbct",
					toothCode: String(targetTooth),
					teethFdi: [String(targetTooth)],
					previewUrl: sliceDataUrl,
					viewerUrl: sliceDataUrl,
					capturedAt: new Date().toISOString(),
					effectiveDoseMicrosv: 15,
					status: "available",
					notes: `Плотность Misch ${displayBoneClass} (${Math.round(displayMeanHU ?? huSamplingResult.overallMeanHU)} HU), зазор до канала: ${displayNerveClearanceMm ?? "—"} мм`,
				};

				const storageKey = `dente_patient_emr_attachments_${effectivePatientId}`;
				const existingRaw = window.localStorage.getItem(storageKey);
				const existing = existingRaw ? JSON.parse(existingRaw) : [];
				existing.push(emrAttachment);
				window.localStorage.setItem(storageKey, JSON.stringify(existing));

				// Global imaging studies registry
				const studiesRaw = window.localStorage.getItem("dente_imaging_studies");
				const existingStudies = studiesRaw ? JSON.parse(studiesRaw) : [];
				existingStudies.push(emrAttachment);
				window.localStorage.setItem("dente_imaging_studies", JSON.stringify(existingStudies));

				window.dispatchEvent(new CustomEvent("dente-add-imaging-study", { detail: emrAttachment }));
				window.dispatchEvent(new CustomEvent("dente-emr-attachment", { detail: emrAttachment }));
			} catch {
				// ignore
			}
		}

		// 3. Update visit diary Form 043/u via visitStore and custom events
		const isMaxillaZone = targetTooth < 30;
		const isSinusZone = isMaxillaZone && targetTooth >= 14 && targetTooth <= 27;
		let sinusRecommendation: string | null = null;
		if (isSinusZone && typeof effectiveRidgeHeightMm === "number") {
			if (effectiveRidgeHeightMm < 5.0) {
				sinusRecommendation = `Выраженная вертикальная атрофия (H=${effectiveRidgeHeightMm.toFixed(1)} мм < 5 мм). Показан открытый (латеральный) синус-лифтинг с остеопластикой.`;
			} else if (effectiveRidgeHeightMm < 10.0) {
				sinusRecommendation = `Умеренный дефицит высоты кости (H=${effectiveRidgeHeightMm.toFixed(1)} мм). Показан закрытый (транскрестальный) синус-лифтинг.`;
			} else {
				sinusRecommendation = `Высота кости достаточна (H=${effectiveRidgeHeightMm.toFixed(1)} мм >= 10 мм). Синус-лифтинг не требуется.`;
			}
		}

		exportImplantToDiary043(
			{
				patientId,
				patientName: patientDisplayName,
				doctorId: study?.doctorId,
				doctorName: study?.doctorName,
				toothFdi: targetTooth,
				implantSpec: currentImplantSpec,
				angulationDeg: implantAngulationDeg,
				ridgeHeightMm: effectiveRidgeHeightMm,
				ridgeWidthMm: effectiveRidgeWidthMm,
				ridgeW2Mm: (activeCaliper as any)?.crestWidthMm ?? effectiveRidgeWidthMm,
				ridgeW6Mm: (activeCaliper as any)?.midWidthMm ?? null,
				sinusLiftRecommendation: sinusRecommendation,
				mischClass: displayBoneClass,
				meanHU: Math.round(displayMeanHU ?? huSamplingResult.overallMeanHU),
				nerveClearanceMm: displayNerveClearanceMm,
				recommendedTorqueNcm: displayTorque,
				drillingProtocol: mischClassification?.clinicalDrillingRecommendation || displayDrillingProtocol,
				isNerveWarning: nerveAuditResult.isWarning,
				isNerveDanger: nerveAuditResult.isDangerous,
			},
			onApplyToDiary043,
		);

		showToast(
			`Клинический протокол и срез КЛКТ высокого разрешения успешно сохранены в медкарту пациента ${patientDisplayName}!`,
			"success",
			4500,
		);
	}, [
		patientId, patientDisplayName, study, activeCrossSection, currentImplantSpec,
		implantAngulationDeg, effectiveRidgeHeightMm, effectiveRidgeWidthMm,
		displayBoneClass, displayMeanHU, displayNerveClearanceMm,
		displayTorque, displayDrillingProtocol, nerveAuditResult, huSamplingResult,
		mischClassification, crossSectionCanvasRef, onApplyToDiary043,
	]);

	const handleExportCbctToFinance = useCallback(() => {
		const targetTooth = Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
		addCbctSurgicalToVisitFinance({
			patientId,
			toothFdi: targetTooth,
			implantSpec: currentImplantSpec,
			ridgeHeightMm: effectiveRidgeHeightMm,
			ridgeWidthMm: effectiveRidgeWidthMm,
			doctorName: study?.doctorName,
		});
		addCbctServiceToTreatmentPlan({
			patientId,
			toothFdi: targetTooth,
			doctorName: study?.doctorName,
		});
	}, [activeCrossSection, currentImplantSpec, effectiveRidgeHeightMm, effectiveRidgeWidthMm, patientId, study]);

	const handleExportToLab = useCallback(() => {
		const targetTooth = Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
		const isMaxilla = targetTooth < 30;
		const effectivePatientId = patientId || "cbct-patient";

		let sliceDataUrl: string | null = null;
		try {
			const targetCanvas =
				crossSectionCanvasRef?.current ||
				(typeof document !== "undefined"
					? (document.querySelector('canvas[data-testid="cbct-cross-section-sidebar-canvas"]') as HTMLCanvasElement | null) ||
					  (document.querySelector('canvas') as HTMLCanvasElement | null)
					: null);
			if (targetCanvas) {
				sliceDataUrl = targetCanvas.toDataURL("image/png");
			}
		} catch {
			// ignore canvas capture failure
		}

		const hStr = typeof effectiveRidgeHeightMm === "number" ? `H=${effectiveRidgeHeightMm.toFixed(1)} мм` : "H: —";
		const wStr = typeof effectiveRidgeWidthMm === "number" ? `W=${effectiveRidgeWidthMm.toFixed(1)} мм` : "W: —";
		const nerveStr = displayNerveClearanceMm !== null ? `${displayNerveClearanceMm.toFixed(1)} мм` : "не определена";
		const meanHU = Math.round(displayMeanHU ?? huSamplingResult.overallMeanHU);

		const clinicalNotes =
			`3D КЛКТ-планирование навигационного хирургического шаблона (зуб #${targetTooth}):\n` +
			`• Имплантационная система: ${currentImplantSpec.brandName} (Ø${currentImplantSpec.diameterMm} × ${currentImplantSpec.lengthMm} мм, угол наклона: ${implantAngulationDeg.toFixed(1)}°)\n` +
			`• Костный гребень: ${hStr}, ${wStr}\n` +
			`• Плотность костной ткани: Misch ${displayBoneClass} (${meanHU} HU)\n` +
			`• Безопасный зазор до IAN / синуса: ${nerveStr}\n` +
			`• Хирургический протокол: ${mischClassification?.clinicalDrillingRecommendation || displayDrillingProtocol}\n` +
			`• Ожидаемый торк: ${displayTorque}`;

		const labDraft: DentalLabOrderData = {
			id: `lab-cbct-guide-${targetTooth}-${Date.now()}`,
			patientId: effectivePatientId,
			patientName: patientDisplayName,
			doctorId: study?.doctorId ?? null,
			doctorName: study?.doctorName ?? null,
			toothFdi: String(targetTooth),
			selectedTeeth: [targetTooth],
			jawScope: isMaxilla ? "upper" : "lower",
			constructionType: "surgical_guide",
			material: "Биосовместимый фотополимер (Surgical Guide 3D Resin)",
			impressionType: "cbct_dicom",
			clinicalNotes,
			attachedImageUrl: sliceDataUrl,
			status: "draft",
			priceRub: 7500,
			createdAt: new Date().toISOString(),
		};

		if (typeof window !== "undefined") {
			try {
				window.localStorage.setItem("dente_pending_lab_order_draft", JSON.stringify(labDraft));
				window.dispatchEvent(
					new CustomEvent("dente-open-lab-order", {
						detail: labDraft,
					}),
				);
			} catch {
				// ignore
			}
		}

		if (onOpenLabOrder) {
			onOpenLabOrder(labDraft);
		}

		showToast(
			`Наряд ЗТЛ на хирургический навигационный шаблон (зуб #${targetTooth}) сформирован с КЛКТ-данными и срезом!`,
			"success",
			4500,
		);

		return labDraft;
	}, [
		patientId, patientDisplayName, study, activeCrossSection, currentImplantSpec,
		implantAngulationDeg, effectiveRidgeHeightMm, effectiveRidgeWidthMm,
		displayBoneClass, displayMeanHU, displayNerveClearanceMm, displayTorque,
		displayDrillingProtocol, huSamplingResult, mischClassification, crossSectionCanvasRef,
		onOpenLabOrder,
	]);

	const [isAnonymized, setIsAnonymized] = useState(false);

	const handleToggleAnonymize = useCallback(() => {
		setIsAnonymized((prev) => {
			const next = !prev;
			showToast(
				next
					? "Анонимизация включена (152-ФЗ): персональные данные скрыты"
					: "Анонимизация отключена: отображаются полные данные пациента",
				"info",
				3000,
			);
			return next;
		});
	}, []);

	const handleExportPdfReport = useCallback(() => {
		const targetTooth = Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
		exportPdfImplantReport({
			targetTooth,
			currentImplantPose,
			currentCanal,
			huSamplingResult,
			patientDisplayName: isAnonymized ? "АНОНИМИЗИРОВАН (152-ФЗ / КОНСИЛИУМ)" : patientDisplayName,
			study,
			mischClassification,
			nerveAuditResult,
			activeCaliper,
			ridgeHeightMm: effectiveRidgeHeightMm,
			ridgeWidthMm: effectiveRidgeWidthMm,
		});
	}, [
		activeCrossSection, currentImplantPose, currentCanal, huSamplingResult,
		patientDisplayName, isAnonymized, study, mischClassification, nerveAuditResult,
		activeCaliper, effectiveRidgeHeightMm, effectiveRidgeWidthMm,
	]);

	const handleExport300DpiSnapshot = useCallback(async (canvas?: HTMLCanvasElement | null, title = "КЛКТ Срез (300 DPI)") => {
		if (!canvas) {
			showToast("Холст среза не найден для экспорта", "error");
			return;
		}
		const targetTooth = Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
		const spacing = 0.4;
		const dataUrl = await exportCleanViewportSnapshot(canvas, title, spacing, {
			patientName: isAnonymized ? "АНОНИМИЗИРОВАН (152-ФЗ)" : patientDisplayName,
			studyDate: isAnonymized ? "[СКРЫТО]" : study?.studyDate || new Date().toLocaleDateString("ru-RU"),
			targetToothFdi: targetTooth,
			isAnonymized,
			targetDpi: 300,
			fov: "8×8 см",
			cleanForReport: true,
		});
		if (typeof window !== "undefined" && typeof document !== "undefined") {
			const link = document.createElement("a");
			link.href = dataUrl;
			link.download = `CBCT_Snapshot_300DPI_${isAnonymized ? "ANONYMIZED" : patientDisplayName.replace(/\s+/g, "_")}_FDI${targetTooth}.png`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
		showToast("Снимок высокого разрешения (300 DPI) успешно сохранен", "success");
	}, [activeCrossSection, isAnonymized, patientDisplayName, study]);

	return {
		isAnonymized,
		handleToggleAnonymize,
		handleExportToPlan,
		handleExportToSchedule,
		handleExportToEmr,
		handleExportCbctToFinance,
		handleExportToLab,
		handleExportPdfReport,
		handleExport300DpiSnapshot,
	};
}
