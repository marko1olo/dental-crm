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
	HUZoneSampling,
	MischBoneClass,
	MischClassificationResult,
} from "./boneDensityMischMath";
import type {
	AlveolarContainmentResult,
	CrossSectionImplantPose,
	MandibularCanalCrossSection,
	NerveSafetyAuditResult,
	VirtualImplantSpec,
} from "./implantSafetyEngine";

export interface CbctReportPatientInfo {
	readonly patientName: string;
	readonly birthDate?: string | undefined;
	readonly age?: number | undefined;
	readonly cardRecordNumber?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly studyDate?: string | undefined;
	readonly reportDate?: string | undefined;
	readonly clinicName?: string | undefined;
}

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
	readonly ianSafetyStatus?: "safe" | "warning" | "danger" | "na" | undefined;
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
	readonly ridgeWidthMm: number;
	readonly ridgeHeightMm: number;
	readonly residualBuccalBoneMm: number;
	readonly residualLingualBoneMm: number;
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
	readonly safetyStatus: "safe" | "warning" | "danger";
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

export interface ViewportSnapshotOptions {
	readonly patientName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly studyDate?: string | undefined;
	readonly targetToothFdi?: number | undefined;
	readonly sliceLocationMm?: number | undefined;
	readonly customScaleBarLengthMm?: number | undefined;
	readonly showOrientationBadge?: boolean | undefined;
	readonly orientationBadgeText?: string | undefined;
	readonly invertToner?: boolean | undefined;
	readonly tonerSaving?: boolean | undefined;
	readonly cleanForReport?: boolean | undefined;
	readonly suppressUiOverlays?: boolean | undefined;
	readonly hidePatientBadge?: boolean | undefined;
	readonly hideWatermark?: boolean | undefined;
	readonly hideScaleBar?: boolean | undefined;
	readonly showPatientBadge?: boolean | undefined;
	readonly showWatermark?: boolean | undefined;
	readonly showScaleBar?: boolean | undefined;
}

export interface CbctReportRenderOptions {
	readonly tonerSaving?: boolean | undefined;
	readonly includeForm043Diary?: boolean | undefined;
	readonly customClinicTitle?: string | undefined;
}

/**
 * Generates a clean clinical PNG snapshot from a viewport canvas:
 * 1. Strips out all interactive HTML UI buttons and overlays.
 * 2. Inscribes calibrated 10 mm scale ruler bar (using physical scaleMm pixel spacing).
 * 3. Stamps patient metadata badge (optional for PDF protocol to avoid raster redundancy).
 * 4. Imprints clean clinical orientation & medical branding (optional for PDF protocol).
 */
export async function exportCleanViewportSnapshot(
	canvas: HTMLCanvasElement,
	viewportTitle: string,
	scaleMm: number,
	options: ViewportSnapshotOptions = {},
): Promise<string> {
	if (!canvas) {
		return "";
	}

	// In Node.js testing environment without DOM canvas
	if (typeof document === "undefined" || !document.createElement) {
		if (typeof canvas.toDataURL === "function") {
			try {
				return canvas.toDataURL("image/png");
			} catch {
				return `data:image/png;base64,mock_${viewportTitle.replace(/\s+/g, "_")}`;
			}
		}
		return `data:image/png;base64,mock_${viewportTitle.replace(/\s+/g, "_")}`;
	}

	const width = canvas.width > 0 ? canvas.width : 512;
	const height = canvas.height > 0 ? canvas.height : 512;

	const exportCanvas = document.createElement("canvas");
	exportCanvas.width = width;
	exportCanvas.height = height;

	const ctx = exportCanvas.getContext("2d");
	if (!ctx) {
		try {
			return canvas.toDataURL("image/png");
		} catch {
			return "";
		}
	}

	const isInvertToner = Boolean(options.invertToner || options.tonerSaving);
	const shouldShowPatientBadge =
		options.showPatientBadge ??
		!(options.cleanForReport || options.suppressUiOverlays || options.hidePatientBadge);
	const shouldShowWatermark =
		options.showWatermark ??
		!(options.cleanForReport || options.suppressUiOverlays || options.hideWatermark);
	const shouldShowScaleBar =
		options.showScaleBar ?? !options.hideScaleBar;

	// 1. Draw solid background (white for toner saving, black for dark screen snapshot)
	ctx.fillStyle = isInvertToner ? "#ffffff" : "#000000";
	ctx.fillRect(0, 0, width, height);

	// 2. Draw source slice image from canvas (with LUT pixel inversion if toner saving is active)
	try {
		if (canvas.width > 0 && canvas.height > 0) {
			ctx.drawImage(canvas, 0, 0, width, height);

			if (isInvertToner && typeof ctx.getImageData === "function" && typeof ctx.putImageData === "function") {
				try {
					const imgData = ctx.getImageData(0, 0, width, height);
					if (imgData && imgData.data) {
						const d = imgData.data;
						for (let i = 0; i < d.length; i += 4) {
							d[i] = 255 - d[i]!; // R
							d[i + 1] = 255 - d[i + 1]!; // G
							d[i + 2] = 255 - d[i + 2]!; // B
							// Alpha channel is preserved
						}
						ctx.putImageData(imgData, 0, 0);
					}
				} catch {
					// Fallback for tainted canvas or limited context
				}
			}
		}
	} catch {
		// Ignore draw errors in headless/test environments
	}

	const pad = 12;

	// 3. Stamp Patient & Slice Metadata Badge (Top-Left) - suppressed in clean report export
	if (shouldShowPatientBadge) {
		ctx.save();
		const titleText = viewportTitle;
		const patientText = options.patientName ? `Пациент: ${options.patientName}` : "";
		const dateText = options.studyDate ? `Дата: ${options.studyDate}` : "";
		const toothText = options.targetToothFdi ? `FDI #${options.targetToothFdi}` : "";
		const metaParts = [patientText, toothText, dateText].filter(Boolean).join(" • ");

		ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
		const titleWidth = ctx.measureText(titleText).width;
		ctx.font = "10px system-ui, -apple-system, sans-serif";
		const metaWidth = metaParts ? ctx.measureText(metaParts).width : 0;
		const badgeWidth = Math.min(width - 24, Math.max(180, Math.max(titleWidth, metaWidth) + 20));
		const badgeHeight = metaParts ? 42 : 26;

		ctx.fillStyle = isInvertToner ? "rgba(241, 245, 249, 0.95)" : "rgba(15, 23, 42, 0.92)";
		ctx.strokeStyle = isInvertToner ? "rgba(203, 213, 225, 0.9)" : "#0284c7";
		ctx.lineWidth = 1;
		ctx.beginPath();
		if (typeof ctx.roundRect === "function") {
			ctx.roundRect(pad, pad, badgeWidth, badgeHeight, 6);
		} else {
			ctx.rect(pad, pad, badgeWidth, badgeHeight);
		}
		ctx.fill();
		ctx.stroke();

		// Title
		ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
		ctx.fillStyle = isInvertToner ? "#0369a1" : "#38bdf8";
		ctx.fillText(titleText, pad + 10, pad + 16);

		// Subtitle
		if (metaParts) {
			ctx.font = "10px system-ui, -apple-system, sans-serif";
			ctx.fillStyle = isInvertToner ? "#475569" : "#94a3b8";
			ctx.fillText(metaParts, pad + 10, pad + 33);
		}
		ctx.restore();
	}

	// 4. Inscribe Calibrated 10 mm Scale Ruler Bar (Bottom-Left)
	if (shouldShowScaleBar) {
		ctx.save();
		const safeScaleMm = scaleMm > 0 ? scaleMm : 0.4;
		const pxPerMm = 1.0 / safeScaleMm;
		const scaleBarLengthMm = options.customScaleBarLengthMm ?? 10.0;
		const rawScaleBarPx = scaleBarLengthMm * pxPerMm;
		const scaleBarPx = Math.min(width * 0.45, Math.max(24, rawScaleBarPx));

		const sbX = pad;
		const sbY = height - pad - 24;
		const sbHeight = 24;
		const sbWidth = scaleBarPx + 24;

		ctx.fillStyle = isInvertToner ? "rgba(241, 245, 249, 0.95)" : "rgba(15, 23, 42, 0.92)";
		ctx.strokeStyle = isInvertToner ? "rgba(203, 213, 225, 0.9)" : "#0284c7";
		ctx.lineWidth = 1;
		ctx.beginPath();
		if (typeof ctx.roundRect === "function") {
			ctx.roundRect(sbX, sbY, sbWidth, sbHeight, 4);
		} else {
			ctx.rect(sbX, sbY, sbWidth, sbHeight);
		}
		ctx.fill();
		ctx.stroke();

		const lineStartX = sbX + 12;
		const lineEndX = lineStartX + scaleBarPx;
		const lineY = sbY + 15;

		ctx.strokeStyle = isInvertToner ? "#0284c7" : "#38bdf8";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		// Left bracket tick
		ctx.moveTo(lineStartX, lineY - 6);
		ctx.lineTo(lineStartX, lineY + 2);
		// Horizontal bar
		ctx.moveTo(lineStartX, lineY);
		ctx.lineTo(lineEndX, lineY);
		// Right bracket tick
		ctx.moveTo(lineEndX, lineY - 6);
		ctx.lineTo(lineEndX, lineY + 2);
		// Center tick
		const midX = lineStartX + scaleBarPx / 2;
		ctx.moveTo(midX, lineY - 3);
		ctx.lineTo(midX, lineY);
		ctx.stroke();

		// Label (High contrast text on dark underlay pad: WCAG AAA >= 7:1)
		ctx.font = "bold 9px monospace";
		ctx.fillStyle = isInvertToner ? "#0f172a" : "#f8fafc";
		ctx.textAlign = "center";
		ctx.fillText(`${scaleBarLengthMm} мм`, midX, lineY - 7);
		ctx.restore();
	}

	// 5. Watermark / Branding (Bottom-Right) - suppressed in clean report export
	if (shouldShowWatermark) {
		ctx.save();
		ctx.font = "9px system-ui, -apple-system, sans-serif";
		ctx.fillStyle = isInvertToner ? "rgba(71, 85, 105, 0.85)" : "rgba(148, 163, 184, 0.9)";
		ctx.textAlign = "right";
		ctx.fillText("DENTE 3D CBCT Studio • 16-bit DICOM", width - pad, height - pad);
		ctx.restore();
	}

	try {
		return exportCanvas.toDataURL("image/png");
	} catch {
		return "";
	}
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
	readonly containment: AlveolarContainmentResult;
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
}): CbctReportData {
	const {
		patientName = "Барабаш С.В.",
		clinicName = "Стоматологический центр DENTE",
		doctorName = "Врач-стоматолог-хирург-имплантолог: Барабаш С.В.",
		studyDate = new Date().toLocaleDateString("ru-RU"),
		targetToothFdi,
		implantPose,
		mischResult,
		huSampling,
		containment,
		nerveSafety,
		additionalImplants,
		snapshots = {},
		diary043Text,
		tonerSaving = true,
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
			patientName,
			doctorName,
			studyDate,
			reportDate: new Date().toLocaleDateString("ru-RU"),
			clinicName: clinicName || "Стоматологический центр DENTE",
			cardRecordNumber: `043/у-${targetToothFdi}`,
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
			ridgeWidthMm: containment.residualBuccalBoneMm + containment.residualLingualBoneMm + spec.diameterMm,
			ridgeHeightMm: 22.0,
			residualBuccalBoneMm: containment.residualBuccalBoneMm,
			residualLingualBoneMm: containment.residualLingualBoneMm,
			requiresGbrAugmentation: containment.requiresGbrAugmentation,
			isApexContained: containment.isApexContained,
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

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function renderStructuredDiary043(text: string): string {
	const lines = text.split("\n");
	const output: string[] = [];

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line) {
			continue;
		}
		// Skip purely decorative ASCII borders
		if (/^={4,}$/.test(line) || /^-{4,}$/.test(line)) {
			continue;
		}
		// Clean line: purge emojis, unify torque units and warnings
		const cleanLine = line
			.replace(/🏥\s*/g, "")
			.replace(/🌱\s*/g, "")
			.replace(/⚠️\s*ПРИБЛИЖЕНИЕ/g, "ВНИМАНИЕ: ЗОНА ПРИБЛИЖЕНИЯ К НЕРВУ")
			.replace(/⚠️\s*/g, "")
			.replace(/⛔\s*/g, "")
			.replace(/✅\s*/g, "")
			.replace(/N[·*]?cm/gi, "Н·см")
			.replace(/Н[·*]см/gi, "Н·см")
			.replace(/Нсм/gi, "Н·см")
			.replace(/Н\s+см/gi, "Н·см");

		// Document Title
		if (cleanLine.includes("ПРОТОКОЛ ОПЕРАЦИИ") || cleanLine.includes("ФОРМА 043/У")) {
			output.push(`<div style="font-weight:800; color:#0f172a; margin-bottom:2px; font-size:9px;">${escapeHtml(cleanLine)}</div>`);
			continue;
		}
		// Patient / Clinic meta line
		if (cleanLine.startsWith("Пациент:")) {
			output.push(`<div class="diary-meta-row">${escapeHtml(cleanLine)}</div>`);
			continue;
		}
		// Numbered section titles (e.g. "1. ВЫБОР...", "2. АНАТОМИЧЕСКАЯ...", "3. Зуб...", "4. ЗАКЛЮЧЕНИЕ...")
		if (/^\d+\.\s/.test(cleanLine)) {
			output.push(`<div class="diary-section-header">${escapeHtml(cleanLine)}</div>`);
			continue;
		}
		// Bullet items (e.g. "   - Система: ...", "- Класс: ...", "• ...")
		if (cleanLine.startsWith("- ") || cleanLine.startsWith("• ") || cleanLine.startsWith("– ")) {
			const cleanItem = cleanLine.replace(/^[-•–]\s*/, "");
			output.push(`<div class="diary-item">${escapeHtml(cleanItem)}</div>`);
			continue;
		}
		// Default paragraph line
		output.push(`<div style="margin-bottom: 1.5px;">${escapeHtml(cleanLine)}</div>`);
	}

	return output.join("");
}

/**
 * Generates responsive, high-grade HTML/CSS print protocol for A4 output.
 */
export function renderCbctReportHtml(data: CbctReportData, options: CbctReportRenderOptions = {}): string {
	const { patient, targetToothFdi, snapshots, implant, bone, stability, nerve, clinicalRecommendations, diary043Text, implantsTable } = data;

	const isTonerSaving = options.tonerSaving ?? (data.tonerSavingEnabled ?? true);
	const axialImg = snapshots.axial?.dataUrl;
	const panoImg = snapshots.panoramic?.dataUrl;
	const crossSectionImg = snapshots.crossSection?.dataUrl;
	const sagittalImg = snapshots.sagittal?.dataUrl || snapshots.coronal?.dataUrl;

	const effectiveImplantsTable: readonly CbctReportImplantRow[] =
		implantsTable && implantsTable.length > 0
			? implantsTable
			: [
					{
						toothFdi: targetToothFdi,
						brandName: implant.brandName,
						lineName: implant.lineName,
						diameterMm: implant.diameterMm,
						lengthMm: implant.lengthMm,
						platformDiameterMm: implant.platformDiameterMm,
						apexDiameterMm: implant.apexDiameterMm,
						articleNumber: implant.articleNumber,
						angulationDeg: implant.angulationDeg,
						entryDepthMm: implant.entryDepthMm,
						mischClass: bone.mischClass,
						boneDensityHU: bone.overallMeanHU,
						expectedTorqueNcm: stability.expectedTorqueNcm,
						minTorqueNcm: stability.minTorqueNcm,
						maxTorqueNcm: stability.maxTorqueNcm,
						distanceToIanMm: nerve?.netClearanceToCanalWallMm,
						ianSafetyStatus: nerve?.safetyStatus ?? "na",
						ianMessageRu: nerve?.clinicalMessageRu,
						immediateLoading: stability.isImmediateLoadingEligible,
					},
				];

	const mischBadgeColor =
		bone.mischClass === "D1"
			? "#3b82f6"
			: bone.mischClass === "D2"
				? "#10b981"
				: bone.mischClass === "D3"
					? "#f59e0b"
					: "#ef4444";

	const nerveStatusColor =
		nerve?.safetyStatus === "safe"
			? "#10b981"
			: nerve?.safetyStatus === "warning"
				? "#f59e0b"
				: "#ef4444";

	const formatSurgeonSigner = (name?: string): string => {
		const trimmed = name?.trim();
		if (
			!trimmed ||
			trimmed === "Врач-хирург-имплантолог" ||
			trimmed === "Врач-стоматолог-хирург-имплантолог" ||
			trimmed === "Хирург-имплантолог"
		) {
			return "Врач-стоматолог-хирург-имплантолог: Барабаш С.В.";
		}
		if (trimmed.startsWith("Врач-стоматолог-хирург-имплантолог:")) {
			return trimmed;
		}
		if (trimmed.startsWith("Врач-стоматолог-хирург-имплантолог")) {
			return trimmed.replace(/^Врач-стоматолог-хирург-имплантолог\s*/, "Врач-стоматолог-хирург-имплантолог: ");
		}
		return `Врач-стоматолог-хирург-имплантолог: ${trimmed}`;
	};
	const surgeonSigner = formatSurgeonSigner(patient.doctorName);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<title>Клинический протокол КЛКТ — ${escapeHtml(patient.patientName)} (FDI #${targetToothFdi})</title>
<style>
  @page {
    size: A4 portrait;
    margin: 5mm 8mm;
  }
  @media print {
    @page {
      size: A4 portrait;
      margin: 5mm 8mm;
    }
    html, body {
      background: #ffffff !important;
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .cbct-report-page {
      max-height: 260mm !important;
      overflow: hidden !important;
      page-break-inside: avoid !important;
      page-break-after: avoid !important;
    }
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    background: #ffffff;
    font-size: 10px;
    line-height: 1.25;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .cbct-report-page {
    width: 100%;
    max-width: 194mm;
    max-height: 260mm;
    overflow: hidden;
    page-break-inside: avoid;
    margin: 0 auto;
  }
  .page {
    width: 100%;
    max-width: 194mm;
    margin: 0 auto;
  }
  /* Header */
  .header-table {
    width: 100%;
    border-bottom: 2px solid #0284c7;
    padding-bottom: 3px;
    margin-bottom: 4px;
  }
  .clinic-title {
    font-size: 12.5px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.2px;
  }
  .clinic-sub {
    font-size: 8px;
    color: #64748b;
  }
  .doc-title {
    font-size: 10.5px;
    font-weight: 800;
    color: #0369a1;
    text-align: right;
    text-transform: uppercase;
  }
  .doc-meta {
    font-size: 8px;
    color: #64748b;
    text-align: right;
  }

  /* Patient & Tooth Grid */
  .info-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 3px 6px;
    margin-bottom: 4px;
  }
  .info-group {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .info-item {
    font-size: 9px;
  }
  .info-item b {
    color: #0f172a;
  }
  .right-badges {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .tooth-pill {
    background: #0284c7;
    color: #ffffff;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: 800;
    font-size: 10px;
    letter-spacing: 0.5px;
  }

  /* 4-Slice MPR Matrix (2x2) */
  .mpr-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    margin-bottom: 4px;
  }
  .mpr-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    overflow: hidden;
    position: relative;
    height: 105px;
    max-height: 105px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .mpr-card img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .mpr-label {
    position: absolute;
    top: 3px;
    left: 3px;
    background: rgba(248, 250, 252, 0.95);
    color: #0369a1;
    font-size: 7.5px;
    font-weight: 700;
    padding: 1.5px 4px;
    border-radius: 3px;
    border: 0.5px solid #cbd5e1;
  }
  .mpr-empty {
    color: #64748b;
    font-size: 8px;
    text-align: center;
    padding: 10px;
  }

  /* Structured Implants Table */
  .table-implants {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5px;
  }
  .table-implants th {
    background: #f1f5f9;
    color: #334155;
    font-weight: 700;
    text-align: left;
    padding: 2px 4px;
    border-bottom: 1px solid #cbd5e1;
    font-size: 8px;
    text-transform: uppercase;
  }
  .table-implants td {
    padding: 2px 4px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
    font-size: 8.5px;
  }
  .table-implants tr:nth-child(even) {
    background: #f8fafc;
  }
  .misch-pill {
    display: inline-block;
    padding: 1px 3px;
    border-radius: 3px;
    font-weight: 800;
    font-size: 7.5px;
    color: #ffffff;
    margin-right: 3px;
  }

  /* Two Column Data Tables */
  .tables-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    margin-bottom: 4px;
  }
  .section-box {
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 4px;
  }
  .section-header {
    background: #f1f5f9;
    padding: 2px 5px;
    font-size: 9px;
    font-weight: 700;
    color: #1e293b;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .table-clean {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5px;
  }
  .table-clean tr:nth-child(even) {
    background: #f8fafc;
  }
  .table-clean td {
    padding: 2px 4px;
    border-bottom: 1px solid #f1f5f9;
    font-size: 8.5px;
  }
  .table-clean td:first-child {
    color: #64748b;
    width: 55%;
  }
  .table-clean td:last-child {
    font-weight: 600;
    color: #0f172a;
    text-align: right;
  }

  /* Nerve & Safety Banner */
  .safety-banner {
    border-radius: 4px;
    padding: 2px 5px;
    margin-bottom: 4px;
    font-size: 8.5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-left: 4px solid ${nerveStatusColor};
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    border-right: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
  }

  /* Recommendations & Form 043 */
  .notes-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 3px 5px;
    margin-bottom: 4px;
    font-size: 8.5px;
  }
  .notes-box h4 {
    font-size: 8.5px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 2px;
  }
  .notes-box ul {
    list-style: none;
    padding-left: 0;
  }
  .notes-box li {
    margin-bottom: 1px;
    color: #334155;
  }

  /* Form 043/u Proportional Medical Typography */
  .diary-card {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 3px 6px;
    margin-bottom: 4px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 8.5px;
    line-height: 1.25;
    color: #334155;
  }
  .diary-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 2px;
    margin-bottom: 2px;
  }
  .diary-title {
    font-size: 8.5px;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .diary-badge {
    background: #e0f2fe;
    color: #0369a1;
    font-size: 7px;
    font-weight: 700;
    padding: 1px 3px;
    border-radius: 3px;
    border: 0.5px solid #bae6fd;
    text-transform: uppercase;
  }
  .diary-content {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 8.5px;
    line-height: 1.25;
    color: #334155;
  }
  .diary-section-header {
    font-weight: 700;
    color: #0369a1;
    margin-top: 2px;
    margin-bottom: 1px;
    font-size: 8.5px;
  }
  .diary-item {
    padding-left: 8px;
    position: relative;
    margin-bottom: 0.5px;
    font-size: 8.5px;
  }
  .diary-item::before {
    content: "•";
    position: absolute;
    left: 1px;
    color: #0284c7;
    font-weight: bold;
  }
  .diary-meta-row {
    font-size: 7.5px;
    color: #64748b;
    margin-bottom: 1.5px;
  }

  /* Signatures */
  .sig-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 4px;
    padding-top: 4px;
    border-top: 1px dashed #cbd5e1;
    font-size: 8.5px;
  }
  .sig-line {
    border-bottom: 1px solid #94a3b8;
    margin-top: 8px;
    margin-bottom: 2px;
  }
  .sig-sub {
    font-size: 7.5px;
    color: #64748b;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>
<div class="page cbct-report-page">
  <!-- Header -->
  <table class="header-table">
    <tr>
      <td>
        <div class="clinic-title">${escapeHtml(options.customClinicTitle || patient.clinicName || "Стоматологический центр DENTE")}</div>
        <div class="clinic-sub">Отделение цифровой имплантологии и челюстно-лицевой рентгенодиагностики</div>
      </td>
      <td>
        <div class="doc-title">Протокол 3D КЛКТ-планирования</div>
        <div class="doc-meta">Номенклатура МЗ РФ A16.07.054 • Дата: ${escapeHtml(patient.reportDate || patient.studyDate || "")}</div>
      </td>
    </tr>
  </table>

  <!-- Patient & Target Tooth Bar -->
  <div class="info-bar">
    <div class="info-group">
      <div class="info-item">Пациент: <b>${escapeHtml(patient.patientName)}</b></div>
      <div class="info-item">Карта: <b>${escapeHtml(patient.cardRecordNumber || "043/у")}</b></div>
      <div class="info-item">Врач: <b>${escapeHtml((patient.doctorName || "Барабаш С.В.").trim().replace(/^Врач[-:\s]*/i, ""))}</b></div>
    </div>
    <div class="right-badges">
      <div class="tooth-pill">ЗУБ FDI #${targetToothFdi}</div>
    </div>
  </div>

  <!-- 4-Slice MPR Visual Matrix -->
  <div class="mpr-grid">
    <div class="mpr-card">
      <div class="mpr-label">1. Аксиальный срез (Z)</div>
      ${axialImg ? `<img src="${axialImg}" alt="Axial MPR" />` : `<div class="mpr-empty">Аксиальный срез</div>`}
    </div>
    <div class="mpr-card">
      <div class="mpr-label">2. Панорамная реконструкция (ОПТГ)</div>
      ${panoImg ? `<img src="${panoImg}" alt="Panorama OPG" />` : `<div class="mpr-empty">Панорамная реконструкция</div>`}
    </div>
    <div class="mpr-card">
      <div class="mpr-label">3. Кросс-секция ложа FDI #${targetToothFdi}</div>
      ${crossSectionImg ? `<img src="${crossSectionImg}" alt="Cross Section" />` : `<div class="mpr-empty">Кросс-секция ложа</div>`}
    </div>
    <div class="mpr-card">
      <div class="mpr-label">4. Косой сагиттальный срез</div>
      ${sagittalImg ? `<img src="${sagittalImg}" alt="Sagittal MPR" />` : `<div class="mpr-empty">Сагиттальный срез</div>`}
    </div>
  </div>

  <!-- Structured Implants Registry Table -->
  <div class="section-box">
    <div class="section-header">
      <span>Структурированная таблица установленных имплантатов</span>
      <span style="font-size: 8.5px; color: #64748b;">Всего запланировано: ${effectiveImplantsTable.length} шт.</span>
    </div>
    <table class="table-implants">
      <thead>
        <tr>
          <th style="width: 11%; text-align: center;">Зуб FDI</th>
          <th style="width: 22%;">Система / Бренд</th>
          <th style="width: 17%;">Размер (Ø × L)</th>
          <th style="width: 16%;">Плотность HU (Misch)</th>
          <th style="width: 16%;">Первичный торк</th>
          <th style="width: 10%;">Дистанция IAN</th>
          <th style="width: 8%; text-align: center;">Безопасность</th>
        </tr>
      </thead>
      <tbody>
        ${effectiveImplantsTable
					.map((row) => {
						const rowMischColor =
							row.mischClass === "D1"
								? "#3b82f6"
								: row.mischClass === "D2"
									? "#10b981"
									: row.mischClass === "D3"
										? "#f59e0b"
										: "#ef4444";
						const ianColor =
							row.ianSafetyStatus === "safe"
								? "#10b981"
								: row.ianSafetyStatus === "warning"
									? "#f59e0b"
									: row.ianSafetyStatus === "danger"
										? "#ef4444"
										: "#64748b";
						const ianLabel =
							row.ianSafetyStatus === "safe"
								? "Безопасно"
								: row.ianSafetyStatus === "warning"
									? "Внимание"
									: row.ianSafetyStatus === "danger"
										? "Опасно"
										: "N/A";
						return `
        <tr>
          <td style="font-weight: 800; color: #0284c7; text-align: center;">FDI #${row.toothFdi}</td>
          <td><b>${escapeHtml(row.brandName)}</b> <span style="color:#64748b;">(${escapeHtml(row.lineName || "")})</span></td>
          <td><b>Ø${row.diameterMm.toFixed(1)} × ${row.lengthMm.toFixed(1)} мм</b></td>
          <td>
            <span class="misch-pill" style="background:${rowMischColor};">${row.mischClass}</span>
            <span>${row.boneDensityHU} HU</span>
          </td>
          <td>
            <b>${row.expectedTorqueNcm} Н·см</b>
            ${row.minTorqueNcm !== undefined && row.maxTorqueNcm !== undefined ? `<span style="color:#64748b; font-size:8.5px;">(${row.minTorqueNcm}–${row.maxTorqueNcm})</span>` : ""}
          </td>
          <td>
            ${row.distanceToIanMm !== undefined ? `<b>${row.distanceToIanMm.toFixed(1)} мм</b>` : `<span style="color:#94a3b8;">N/A (В/Ч)</span>`}
          </td>
          <td style="text-align: center;">
            <span style="font-weight: 700; color: ${ianColor};">${ianLabel}</span>
          </td>
        </tr>`;
					})
					.join("")}
      </tbody>
    </table>
  </div>

  <!-- Clinical Data Tables (2 Columns) -->
  <div class="tables-grid">
    <!-- Left Column: Misch Bone Density & Alveolar Ridge -->
    <div class="section-box">
      <div class="section-header">
        <span>Плотность кости (Carl E. Misch)</span>
        <span style="background:${mischBadgeColor}; color:#fff; padding:1px 5px; border-radius:3px; font-weight:800; font-size:9px;">
          ${bone.mischClass}
        </span>
      </div>
      <table class="table-clean">
        <tr><td>Классификация</td><td>${escapeHtml(bone.classNameRu)}</td></tr>
        <tr><td>Кортикальный слой (Coronal 20%)</td><td>${bone.coronalCrestalHU} HU</td></tr>
        <tr><td>Губчатое ядро (Trabecular 60%)</td><td>${bone.trabecularCoreHU} HU</td></tr>
        <tr><td>Апикальная опора (Apical 20%)</td><td>${bone.apicalBaseHU} HU</td></tr>
        <tr><td>Средневзвешенная плотность</td><td><b>${bone.overallMeanHU} HU</b></td></tr>
        <tr><td>Ширина альвеолярного гребня</td><td>${bone.ridgeWidthMm.toFixed(1)} мм</td></tr>
        <tr><td>Остаточная щечная пластинка</td><td>${bone.residualBuccalBoneMm.toFixed(1)} мм ${bone.residualBuccalBoneMm < 1.5 ? "(< 1.5 мм — Дефицит)" : "(Норма)"}</td></tr>
        <tr><td>Остаточная язычная пластинка</td><td>${bone.residualLingualBoneMm.toFixed(1)} мм</td></tr>
        <tr><td>Потребность в НКР/GBR</td><td>${bone.requiresGbrAugmentation ? "<b>Требуется аугментация</b>" : "Не требуется"}</td></tr>
      </table>
    </div>

    <!-- Right Column: Implant Specs & Biomechanical Stability -->
    <div class="section-box">
      <div class="section-header">
        <span>Параметры имплантата & Биомеханика</span>
        <span style="color:#0284c7; font-weight:700; font-size:9px;">Ø${implant.diameterMm} x ${implant.lengthMm} мм</span>
      </div>
      <table class="table-clean">
        <tr><td>Система / Бренд</td><td>${escapeHtml(implant.brandName)} (${escapeHtml(implant.lineName)})</td></tr>
        <tr><td>Артикул / Модель</td><td>${escapeHtml(implant.articleNumber || "Стандарт")}</td></tr>
        <tr><td>Габариты фикстуры</td><td>Ø${implant.diameterMm.toFixed(1)} мм • L ${implant.lengthMm.toFixed(1)} мм</td></tr>
        <tr><td>Угол наклона оси / Погружение</td><td>${implant.angulationDeg.toFixed(1)}° • ${implant.entryDepthMm.toFixed(1)} мм</td></tr>
        <tr><td>Расчетный торк фиксации</td><td><b>${stability.expectedTorqueNcm} Н·см</b> (${stability.minTorqueNcm}–${stability.maxTorqueNcm} Н·см)</td></tr>
        <tr><td>Прогноз стабильности ISQ</td><td><b>${stability.expectedIsq} ISQ</b> (Osstell)</td></tr>
        <tr><td>Протокол нагрузки</td><td>${stability.isImmediateLoadingEligible ? "<b>Немедленная нагрузка (Торк >= 35)</b>" : "Двухэтапный протокол"}</td></tr>
        <tr><td>Режим остеотомии / Сверление</td><td>${escapeHtml(stability.recommendedDrillingRpm)}</td></tr>
        <tr><td>Период остеоинтеграции</td><td>${stability.healingPeriodWeeks} недель</td></tr>
      </table>
    </div>
  </div>

  <!-- Mandatory Mandibular Nerve / Anatomical Clearance Banner -->
  ${
		nerve
			? `
  <div class="safety-banner">
    <div>
      <b>Анатомический контроль (N. alveolaris inferior):</b> 
      Дистанция до канала: <b>${nerve.netClearanceToCanalWallMm.toFixed(1)} мм</b> (Буфер 2.0 мм: <b>${nerve.netClearanceToSafetyCorridorMm >= 0 ? `+${nerve.netClearanceToSafetyCorridorMm.toFixed(1)} мм` : `${nerve.netClearanceToSafetyCorridorMm.toFixed(1)} мм`}</b>).
      <span>${escapeHtml(nerve.clinicalMessageRu)}</span>
    </div>
    <div style="font-weight:800; color:${nerveStatusColor}; text-transform:uppercase;">
      ${nerve.safetyStatus === "safe" ? "БЕЗОПАСНО" : nerve.safetyStatus === "warning" ? "ВНИМАНИЕ" : "ОПАСНО"}
    </div>
  </div>
  `
			: ""
	}

  <!-- Clinical Recommendations & Surgery Protocol -->
  ${
		clinicalRecommendations && clinicalRecommendations.length > 0
			? `
  <div class="notes-box">
    <h4>Клинические рекомендации хирургу:</h4>
    <ul>
      ${clinicalRecommendations.map((r) => `<li>• ${escapeHtml(r)}</li>`).join("")}
    </ul>
  </div>
  `
			: ""
	}

  <!-- Form 043/u Diary Record -->
  ${
		diary043Text
			? `
  <div class="diary-card">
    <div class="diary-header">
      <div class="diary-title">
        <span>Запись для амбулаторной карты 043/у:</span>
        <span class="diary-badge">Приказ МЗ РФ № 804н / 043-у</span>
      </div>
      <div style="font-size: 8.5px; color: #64748b;">Медицинский протокол</div>
    </div>
    <div class="diary-content">
      ${renderStructuredDiary043(diary043Text)}
    </div>
  </div>
  `
			: ""
	}

  <!-- Signatures -->
  <div class="sig-grid">
    <div>
      <div>Оперирующий хирург-имплантолог:</div>
      <div class="sig-line"></div>
      <div class="sig-sub">
        <span>(Подпись)</span>
        <span>${escapeHtml(surgeonSigner)}</span>
      </div>
    </div>
    <div>
      <div>Врач-рентгенолог / КЛКТ-диагност:</div>
      <div class="sig-line"></div>
      <div class="sig-sub">
        <span>(Подпись / М.П.)</span>
        <span>Дата: ${escapeHtml(patient.reportDate || "")}</span>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}

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
		filename || `CBCT_Implant_Protocol_FDI_${data.targetToothFdi}_${data.patient.patientName.replace(/\s+/g, "_")}.html`;
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

