/**
 * DENTE CRM — CBCT CLINICAL EXPORT & EMR REPORTING ENGINE
 *
 * Implements:
 * 1. Clean viewport snapshot extraction without UI button overlays.
 * 2. Inscription of calibrated 10 mm scale ruler bar and patient metadata.
 * 3. Printable A4 CBCT Implant Planning Protocol (4-slice MPR matrix, Carl Misch D1..D4 bone tables,
 *    torque & ISQ stability predictions, virtual implant specs, mandibular nerve clearance).
 * 4. 1-Click export to Form 043/u outpatient diary.
 *
 * Standards:
 * - Misch CE (2008): Bone density classification (D1..D4) & drilling protocols.
 * - Buser et al. (2004): 1.5 mm buccal bone containment rule.
 * - Order 804n / Form 043/u: Russian statutory clinical dental documentation.
 */

import type {
	HUZoneSampling, MischBoneClass, MischClassificationResult,
} from "./boneDensityMischMath";
import type {
	AlveolarContainmentResult, CrossSectionImplantPose,
	MandibularCanalCrossSection, NerveSafetyAuditResult, VirtualImplantSpec,
} from "./implantSafetyEngine";
import {
	type CbctVoxelVolume,
	type Point3D,
	type ObliqueRotationAngles,
	type MprPlane,
	DEFAULT_OBLIQUE_ROTATION,
	extractObliqueMprSlice,
	clampCoordinateToVolume,
} from "./cbctMprMath";
import {
	type DentalArchCurve,
	type CrossSectionSliceData,
	buildDentalArchCurve,
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	reconstructPanoramicView,
	generateCrossSectionSlices,
} from "./dentalCurveEngine";

export interface CbctReportPatientInfo {
	readonly patientName: string;
	readonly birthDate?: string | undefined;
	readonly age?: number | undefined;
	readonly cardRecordNumber?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly studyDate?: string | undefined;
	readonly reportDate?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly isAnonymized?: boolean | undefined;
	readonly fov?: string | undefined;
	readonly windowWidth?: number | undefined;
	readonly windowLevel?: number | undefined;
	readonly clinicLogoSvg?: string | undefined;
}

export const DEFAULT_CLINIC_VECTOR_LOGO_SVG = `<svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="34" height="34" rx="7" fill="#0284c7"/>
  <path d="M17 7C13.5 7 10.5 9.5 10.5 14C10.5 18 12 21.5 13.5 25.5C14.2 27.5 15.5 28.5 17 28.5C18.5 28.5 19.8 27.5 20.5 25.5C22 21.5 23.5 18 23.5 14C23.5 9.5 20.5 7 17 7Z" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M13.5 14C14.5 15 16 15.5 17 15.5C18 15.5 19.5 15 20.5 14" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

export interface CbctReportSliceSnapshot {
	readonly title: string;
	readonly dataUrl: string;
	readonly orientationLabel?: string | undefined;
	readonly sliceLocationMm?: number | undefined;
	readonly scaleMm?: number | undefined;
}

export interface CbctReportImplantData {
	readonly brandName: string;
	readonly lineName: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly platformDiameterMm?: number | undefined;
	readonly apexDiameterMm?: number | undefined;
	readonly articleNumber?: string | undefined;
	readonly angulationDeg: number;
	readonly entryDepthMm: number;
	readonly targetToothFdi: number;
	readonly priceKopecks?: number | undefined;
}

export interface CbctReportImplantRow {
	readonly toothFdi: number;
	readonly brandName: string;
	readonly lineName: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly platformDiameterMm?: number | undefined;
	readonly apexDiameterMm?: number | undefined;
	readonly articleNumber?: string | undefined;
	readonly angulationDeg?: number | undefined;
	readonly entryDepthMm?: number | undefined;
	readonly mischClass: MischBoneClass;
	readonly boneDensityHU: number;
	readonly expectedTorqueNcm: number;
	readonly minTorqueNcm?: number | undefined;
	readonly maxTorqueNcm?: number | undefined;
	readonly distanceToIanMm?: number | undefined;
	readonly ianSafetyStatus?: "safe" | "warning" | "danger" | "na" | "unmeasured" | undefined;
	readonly ianMessageRu?: string | undefined;
	readonly immediateLoading?: boolean | undefined;
}

export interface CbctReportBoneData {
	readonly mischClass: MischBoneClass;
	readonly classNameRu: string;
	readonly coronalCrestalHU: number;
	readonly trabecularCoreHU: number;
	readonly apicalBaseHU: number;
	readonly overallMeanHU: number;
	readonly ridgeWidthMm?: number | null | undefined;
	readonly ridgeHeightMm?: number | null | undefined;
	readonly residualBuccalBoneMm?: number | null | undefined;
	readonly residualLingualBoneMm?: number | null | undefined;
	readonly requiresGbrAugmentation: boolean;
	readonly isApexContained: boolean;
}

export interface CbctReportStabilityData {
	readonly expectedTorqueNcm: number;
	readonly minTorqueNcm: number;
	readonly maxTorqueNcm: number;
	readonly expectedIsq: number;
	readonly minIsq: number;
	readonly maxIsq: number;
	readonly isImmediateLoadingEligible: boolean;
	readonly recommendedDrillingRpm: string;
	readonly underdrillingRecommended: boolean;
	readonly underdrillingMm?: number | undefined;
	readonly corticalTapRequired: boolean;
	readonly healingPeriodWeeks: number;
}

export interface CbctReportNerveData {
	readonly distanceToCanalCenterMm: number;
	readonly netClearanceToCanalWallMm: number;
	readonly netClearanceToSafetyCorridorMm: number;
	readonly safetyStatus: "safe" | "warning" | "danger" | "unmeasured";
	readonly clinicalMessageRu: string;
}

export interface CbctReportData {
	readonly patient: CbctReportPatientInfo;
	readonly targetToothFdi: number;
	readonly snapshots: {
		readonly axial?: CbctReportSliceSnapshot | undefined;
		readonly coronal?: CbctReportSliceSnapshot | undefined;
		readonly sagittal?: CbctReportSliceSnapshot | undefined;
		readonly panoramic?: CbctReportSliceSnapshot | undefined;
		readonly crossSection?: CbctReportSliceSnapshot | undefined;
	};
	readonly implant: CbctReportImplantData;
	readonly bone: CbctReportBoneData;
	readonly stability: CbctReportStabilityData;
	readonly nerve?: CbctReportNerveData | undefined;
	readonly implantsTable?: readonly CbctReportImplantRow[] | undefined;
	readonly clinicalRecommendations?: readonly string[] | undefined;
	readonly diary043Text?: string | undefined;
	readonly tonerSavingEnabled?: boolean | undefined;
}

import {
	type ViewportSnapshotOptions,
	exportCleanViewportSnapshot,
	generateFallbackRadiologicalFrame,
	FALLBACK_DICOM_BASE64_PNG,
} from "./cbctSnapshotExportMath";
export * from "./cbctSnapshotExportMath";

export interface CbctReportRenderOptions {
	readonly tonerSaving?: boolean | undefined;
	readonly includeForm043Diary?: boolean | undefined;
	readonly customClinicTitle?: string | undefined;
	readonly isAnonymized?: boolean | undefined;
	readonly fov?: string | undefined;
	readonly windowWidth?: number | undefined;
	readonly windowLevel?: number | undefined;
	readonly clinicLogoSvg?: string | undefined;
}

export interface GenerateReportSnapshotsParams {
	readonly volume: CbctVoxelVolume;
	readonly archCurve?: DentalArchCurve | null | undefined;
	readonly crosshairMm: Point3D;
	readonly obliqueAngles?: ObliqueRotationAngles | undefined;
	readonly windowWidth?: number | undefined;
	readonly windowLevel?: number | undefined;
	readonly targetToothFdi?: number | undefined;
	readonly tonerSaving?: boolean | undefined;
	readonly patientName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly studyDate?: string | undefined;
	readonly isAnonymized?: boolean | undefined;
	readonly targetDpi?: number | undefined;
	readonly fov?: string | undefined;
}

/**
 * Synchronously generates all diagnostic report slice snapshots directly from 3D voxel volume:
 * 1. Axial MPR slice.
 * 2. Coronal (Frontal) MPR slice.
 * 3. Panoramic (OPG) reconstructed dental arch slice.
 * 4. Transversal Cross-Section slice (perpendicular to dental arch at target tooth).
 * 5. Sagittal MPR slice.
 *
 * Supports true 300 DPI high-resolution export and 152-FZ anonymization.
 * Guarantees zero blank/white windows in PDF exports.
 */
export async function generateSynchronizedReportSnapshots(
	params: GenerateReportSnapshotsParams,
): Promise<{
	axial: CbctReportSliceSnapshot;
	coronal: CbctReportSliceSnapshot;
	panoramic: CbctReportSliceSnapshot;
	crossSection: CbctReportSliceSnapshot;
	sagittal: CbctReportSliceSnapshot;
}> {
	const {
		volume,
		archCurve,
		crosshairMm,
		obliqueAngles = DEFAULT_OBLIQUE_ROTATION,
		windowWidth = 4400,
		windowLevel = 1300,
		targetToothFdi = 46,
		tonerSaving = true,
		patientName = "Пациент",
		clinicName = "Стоматологический центр DENTE",
		studyDate = new Date().toLocaleDateString("ru-RU"),
		isAnonymized = false,
		targetDpi = 300,
		fov = "8×8 см",
	} = params;

	const pixelSpacing = volume.spacingMm.x || 0.4;
	const safeCrosshair = clampCoordinateToVolume(crosshairMm, volume);

	const createSliceCanvas = (data: Uint8ClampedArray, w: number, h: number): HTMLCanvasElement => {
		if (typeof document === "undefined" || !document.createElement) {
			return {
				width: w,
				height: h,
				toDataURL: () => generateFallbackRadiologicalFrame(w, h),
			} as unknown as HTMLCanvasElement;
		}
		const c = document.createElement("canvas");
		c.width = Math.max(1, w);
		c.height = Math.max(1, h);
		const ctx = c.getContext("2d");
		if (ctx) {
			const img = ctx.createImageData(c.width, c.height);
			img.data.set(data.slice(0, c.width * c.height * 4));
			ctx.putImageData(img, 0, 0);
		}
		return c;
	};

	const commonSnapshotOpts = {
		patientName,
		clinicName,
		studyDate,
		targetToothFdi,
		invertToner: tonerSaving,
		cleanForReport: true,
		isAnonymized,
		targetDpi,
		fov,
		windowWidth,
		windowLevel,
	};

	// 1. Axial MPR Slice
	const axialRes = extractObliqueMprSlice(volume, "axial", safeCrosshair, obliqueAngles, {
		windowWidth,
		windowLevel,
		invert: false,
		slabMode: "single",
	});
	const axialCanvas = createSliceCanvas(axialRes.data, axialRes.metadata.widthPx, axialRes.metadata.heightPx);
	const axialDataUrl = await exportCleanViewportSnapshot(
		axialCanvas,
		`Аксиальный срез (Z = ${safeCrosshair.z.toFixed(1)} мм)`,
		pixelSpacing,
		{
			...commonSnapshotOpts,
			sliceLocationMm: safeCrosshair.z,
		},
	);

	// 2. Coronal (Frontal) MPR Slice
	const coronalRes = extractObliqueMprSlice(volume, "coronal", safeCrosshair, obliqueAngles, {
		windowWidth,
		windowLevel,
		invert: false,
		slabMode: "single",
	});
	const coronalCanvas = createSliceCanvas(coronalRes.data, coronalRes.metadata.widthPx, coronalRes.metadata.heightPx);
	const coronalDataUrl = await exportCleanViewportSnapshot(
		coronalCanvas,
		`Корональный срез (Y = ${safeCrosshair.y.toFixed(1)} мм)`,
		pixelSpacing,
		{
			...commonSnapshotOpts,
			sliceLocationMm: safeCrosshair.y,
		},
	);

	// 3. Panoramic (OPG) Reconstructed Slice
	const effectiveCurve = archCurve ?? buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
	const panoRes = reconstructPanoramicView(volume, effectiveCurve, {
		windowWidth,
		windowLevel,
		invert: false,
		heightMm: 38.0,
		heightPx: 280,
	});
	const panoCanvas = panoRes
		? createSliceCanvas(panoRes.pixelData, panoRes.widthPx, panoRes.heightPx)
		: createSliceCanvas(new Uint8ClampedArray(512 * 280 * 4), 512, 280);
	const panoDataUrl = await exportCleanViewportSnapshot(
		panoCanvas,
		"Панорамная томограмма (ОПТГ сляб 15 мм)",
		pixelSpacing,
		commonSnapshotOpts,
	);

	// 4. Cross-Section Transversal Slice
	const csSlices = generateCrossSectionSlices(volume, effectiveCurve, 1.5, safeCrosshair.z, {
		windowWidth,
		windowLevel,
		invert: false,
	});
	const targetToothStr = targetToothFdi.toString();
	const targetCs =
		csSlices.find((s) => s.nearestToothFdi === targetToothStr) ??
		csSlices[Math.floor(csSlices.length / 2)] ??
		csSlices[0];

	const csCanvas = targetCs
		? createSliceCanvas(targetCs.pixelData, targetCs.widthPx, targetCs.heightPx)
		: createSliceCanvas(new Uint8ClampedArray(256 * 256 * 4), 256, 256);
	const csDataUrl = await exportCleanViewportSnapshot(
		csCanvas,
		`Трансверзальный срез (Зуб #${targetToothFdi})`,
		pixelSpacing,
		commonSnapshotOpts,
	);

	// 5. Sagittal MPR Slice
	const sagittalRes = extractObliqueMprSlice(volume, "sagittal", safeCrosshair, obliqueAngles, {
		windowWidth,
		windowLevel,
		invert: false,
		slabMode: "single",
	});
	const sagittalCanvas = createSliceCanvas(sagittalRes.data, sagittalRes.metadata.widthPx, sagittalRes.metadata.heightPx);
	const sagittalDataUrl = await exportCleanViewportSnapshot(
		sagittalCanvas,
		`Сагиттальный срез (X = ${safeCrosshair.x.toFixed(1)} мм)`,
		pixelSpacing,
		{
			...commonSnapshotOpts,
			sliceLocationMm: safeCrosshair.x,
		},
	);

	return {
		axial: {
			title: `Аксиальный срез (Z = ${safeCrosshair.z.toFixed(1)} мм)`,
			dataUrl: axialDataUrl,
			orientationLabel: "AXIAL",
			sliceLocationMm: safeCrosshair.z,
			scaleMm: pixelSpacing,
		},
		coronal: {
			title: `Корональный срез (Y = ${safeCrosshair.y.toFixed(1)} мм)`,
			dataUrl: coronalDataUrl,
			orientationLabel: "CORONAL",
			sliceLocationMm: safeCrosshair.y,
			scaleMm: pixelSpacing,
		},
		panoramic: {
			title: "Панорамная реконструкция (ОПТГ сляб 15 мм)",
			dataUrl: panoDataUrl,
			orientationLabel: "PANORAMIC",
			scaleMm: pixelSpacing,
		},
		crossSection: {
			title: `Кросс-секция (Зуб #${targetToothFdi})`,
			dataUrl: csDataUrl,
			orientationLabel: `FDI #${targetToothFdi}`,
			scaleMm: pixelSpacing,
		},
		sagittal: {
			title: `Сагиттальный срез (X = ${safeCrosshair.x.toFixed(1)} мм)`,
			dataUrl: sagittalDataUrl,
			orientationLabel: "SAGITTAL",
			sliceLocationMm: safeCrosshair.x,
			scaleMm: pixelSpacing,
		},
	};
}

/**
 * Assembles complete structured CbctReportData from clinical planning state.
 */
export function buildCbctReportData(params: {
	readonly patientName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly studyDate?: string | undefined;
	readonly targetToothFdi: number;
	readonly implantPose: CrossSectionImplantPose;
	readonly mischResult: MischClassificationResult;
	readonly huSampling: HUZoneSampling;
	readonly containment?: AlveolarContainmentResult | undefined;
	readonly ridgeHeightMm?: number | null | undefined;
	readonly ridgeWidthMm?: number | null | undefined;
	readonly nerveSafety?: NerveSafetyAuditResult | undefined;
	readonly additionalImplants?: readonly CbctReportImplantRow[] | undefined;
	readonly snapshots?: {
		readonly axial?: CbctReportSliceSnapshot | undefined;
		readonly coronal?: CbctReportSliceSnapshot | undefined;
		readonly sagittal?: CbctReportSliceSnapshot | undefined;
		readonly panoramic?: CbctReportSliceSnapshot | undefined;
		readonly crossSection?: CbctReportSliceSnapshot | undefined;
	} | undefined;
	readonly diary043Text?: string | undefined;
	readonly tonerSaving?: boolean | undefined;
	readonly isAnonymized?: boolean | undefined;
	readonly fov?: string | undefined;
	readonly windowWidth?: number | undefined;
	readonly windowLevel?: number | undefined;
	readonly clinicLogoSvg?: string | undefined;
}): CbctReportData {
	const {
		patientName = "Пациент",
		clinicName = "Стоматологический центр DENTE",
		doctorName = "Врач-стоматолог-хирург-имплантолог",
		studyDate = new Date().toLocaleDateString("ru-RU"),
		targetToothFdi,
		implantPose,
		mischResult,
		huSampling,
		containment,
		ridgeHeightMm,
		ridgeWidthMm,
		nerveSafety,
		additionalImplants,
		snapshots = {},
		diary043Text,
		tonerSaving = true,
		isAnonymized = false,
		fov = "8×8 см",
		windowWidth = 4400,
		windowLevel = 1300,
		clinicLogoSvg,
	} = params;

	const spec = implantPose.implantSpec;

	const primaryImplantRow: CbctReportImplantRow = {
		toothFdi: targetToothFdi,
		brandName: spec.brandName,
		lineName: spec.lineName,
		diameterMm: spec.diameterMm,
		lengthMm: spec.lengthMm,
		platformDiameterMm: spec.platformDiameterMm,
		apexDiameterMm: spec.apexDiameterMm,
		articleNumber: spec.articleNumber,
		angulationDeg: implantPose.angulationDeg,
		entryDepthMm: implantPose.entryPoint.y,
		mischClass: mischResult.mischClass,
		boneDensityHU: huSampling.overallMeanHU,
		expectedTorqueNcm: mischResult.estimatedInsertionTorqueNcm.expectedNcm,
		minTorqueNcm: mischResult.estimatedInsertionTorqueNcm.minNcm,
		maxTorqueNcm: mischResult.estimatedInsertionTorqueNcm.maxNcm,
		distanceToIanMm: nerveSafety ? nerveSafety.netClearanceToCanalWallMm : undefined,
		ianSafetyStatus: nerveSafety ? nerveSafety.safetyStatus : "na",
		ianMessageRu: nerveSafety?.clinicalMessageRu,
		immediateLoading: mischResult.isImmediateLoadingEligible,
	};

	const implantsTable =
		additionalImplants && additionalImplants.length > 0
			? [primaryImplantRow, ...additionalImplants.filter((r) => r.toothFdi !== targetToothFdi)]
			: [primaryImplantRow];

	return {
		patient: {
			patientName: isAnonymized ? "АНОНИМИЗИРОВАН (152-ФЗ / КОНСИЛИУМ)" : patientName,
			doctorName,
			studyDate: isAnonymized ? "[СКРЫТО]" : studyDate,
			reportDate: new Date().toLocaleDateString("ru-RU"),
			clinicName: clinicName || "Стоматологический центр DENTE",
			cardRecordNumber: isAnonymized ? "043/у-[СКРЫТО]" : `043/у-${targetToothFdi}`,
			isAnonymized,
			fov,
			windowWidth,
			windowLevel,
			clinicLogoSvg,
		},
		targetToothFdi,
		snapshots,
		implant: {
			brandName: spec.brandName,
			lineName: spec.lineName,
			diameterMm: spec.diameterMm,
			lengthMm: spec.lengthMm,
			platformDiameterMm: spec.platformDiameterMm,
			apexDiameterMm: spec.apexDiameterMm,
			articleNumber: spec.articleNumber,
			angulationDeg: implantPose.angulationDeg,
			entryDepthMm: implantPose.entryPoint.y,
			targetToothFdi,
			priceKopecks: spec.priceKopecks,
		},
		bone: {
			mischClass: mischResult.mischClass,
			classNameRu: mischResult.classNameRu,
			coronalCrestalHU: huSampling.coronalCrestalHU,
			trabecularCoreHU: huSampling.trabecularCoreHU,
			apicalBaseHU: huSampling.apicalBaseHU,
			overallMeanHU: huSampling.overallMeanHU,
			ridgeWidthMm:
				typeof ridgeWidthMm === "number"
					? ridgeWidthMm
					: containment
						? containment.residualBuccalBoneMm + containment.residualLingualBoneMm + spec.diameterMm
						: null,
			ridgeHeightMm: typeof ridgeHeightMm === "number" ? ridgeHeightMm : null,
			residualBuccalBoneMm: containment ? containment.residualBuccalBoneMm : null,
			residualLingualBoneMm: containment ? containment.residualLingualBoneMm : null,
			requiresGbrAugmentation: containment ? containment.requiresGbrAugmentation : false,
			isApexContained: containment ? containment.isApexContained : true,
		},
		stability: {
			expectedTorqueNcm: mischResult.estimatedInsertionTorqueNcm.expectedNcm,
			minTorqueNcm: mischResult.estimatedInsertionTorqueNcm.minNcm,
			maxTorqueNcm: mischResult.estimatedInsertionTorqueNcm.maxNcm,
			expectedIsq: mischResult.estimatedIsqScore.expectedIsq,
			minIsq: mischResult.estimatedIsqScore.minIsq,
			maxIsq: mischResult.estimatedIsqScore.maxIsq,
			isImmediateLoadingEligible: mischResult.isImmediateLoadingEligible,
			recommendedDrillingRpm: mischResult.recommendedDrillingRpm,
			underdrillingRecommended: mischResult.underdrillingRecommended,
			underdrillingMm: mischResult.underdrillingMm,
			corticalTapRequired: mischResult.corticalTapRequired,
			healingPeriodWeeks: mischResult.healingPeriodWeeks,
		},
		nerve: nerveSafety
			? {
					distanceToCanalCenterMm: nerveSafety.distanceToCanalCenterMm,
					netClearanceToCanalWallMm: nerveSafety.netClearanceToCanalWallMm,
					netClearanceToSafetyCorridorMm: nerveSafety.netClearanceToSafetyCorridorMm,
					safetyStatus: nerveSafety.safetyStatus,
					clinicalMessageRu: nerveSafety.clinicalMessageRu,
				}
			: undefined,
		implantsTable,
		clinicalRecommendations: mischResult.clinicalAdvice,
		diary043Text,
		tonerSavingEnabled: tonerSaving,
	};
}

export * from "./cbctReportHtmlTemplate";
import { renderCbctReportHtml } from "./cbctReportHtmlTemplate";


/**
 * Generates an A4 PDF / Printable document Blob.
 */
export async function generateCbctPlanningPdfReport(
	data: CbctReportData,
	options: CbctReportRenderOptions = {},
): Promise<Blob> {
	const html = renderCbctReportHtml(data, options);
	// We create an HTML/PDF printable document blob
	return new Blob([html], { type: "text/html;charset=utf-8" });
}

/**
 * Opens printable preview window and triggers browser print dialog.
 */
export function openCbctReportPrintWindow(
	data: CbctReportData,
	options: CbctReportRenderOptions = {},
): Window | null {
	if (typeof window === "undefined" || !window.open) {
		return null;
	}

	const html = renderCbctReportHtml(data, options);
	const printWindow = window.open("", "_blank");
	if (printWindow) {
		printWindow.document.open();
		printWindow.document.write(html);
		printWindow.document.close();
		setTimeout(() => {
			printWindow.print();
		}, 300);
	}
	return printWindow;
}

/**
 * Initiates automatic download of the CBCT Report file.
 */
export function downloadCbctReportFile(
	data: CbctReportData,
	filename?: string,
	options: CbctReportRenderOptions = {},
): void {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return;
	}

	const safeFilename =
		filename ||
		`CBCT_Implant_Protocol_FDI_${data.targetToothFdi}_${(data.patient?.patientName ?? "Patient").replace(/\s+/g, "_")}.html`;
	const html = renderCbctReportHtml(data, options);
	const blob = new Blob([html], { type: "text/html;charset=utf-8" });
	const url = URL.createObjectURL(blob);

	const link = document.createElement("a");
	link.href = url;
	link.download = safeFilename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	setTimeout(() => {
		URL.revokeObjectURL(url);
	}, 1000);
}

