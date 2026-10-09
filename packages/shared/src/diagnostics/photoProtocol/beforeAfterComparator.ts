/**
 * beforeAfterComparator.ts — Layer 2: Session Mutations, Slot Updates & Before/After Comparison Engine (@dental/shared)
 *
 * Compliant with:
 * - ABO standards for phased orthodontic comparison (pre-treatment vs active vs post-treatment)
 * - 2D landmark-based pupil and occlusal plane alignment
 */

import { generateSecureUuid } from "../../utils/idGenerators.js";
import type {
	OrthodonticAngleId,
	OrthodonticPhotoSlotRecord,
	OrthodonticPhotoSession,
	OrthodonticComparisonPair,
	OrthodonticComparisonSeries,
	OrthodonticSessionStage,
	BeforeAfterAlignmentConfig,
	OrthodonticPoint2D,
} from "./types.js";
import { ORTHODONTIC_8_ANGLES } from "./shotAngleClassifier.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. SESSION INITIALIZATION & SLOT MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a brand-new empty 8-slot orthodontic photo-protocol session.
 */
export function createEmptyOrthodonticSession(params: {
	id?: string | undefined;
	patientId: string;
	patientName: string;
	doctorName: string;
	clinicName?: string | undefined;
	stage?: OrthodonticSessionStage | undefined;
	sessionDate?: string | undefined;
	treatmentPlanId?: string | undefined;
	treatmentPlanStageId?: string | undefined;
	treatmentStageTitle?: string | undefined;
	notes?: string | undefined;
}): OrthodonticPhotoSession {
	const nowIso = new Date().toISOString();
	const sessionId = params.id || generateSecureUuid();

	const slots = {} as Record<OrthodonticAngleId, OrthodonticPhotoSlotRecord>;

	for (const angle of ORTHODONTIC_8_ANGLES) {
		slots[angle.id] = {
			angleId: angle.id,
			rotationDegrees: 0,
			flipHorizontal: false,
			flipVertical: false,
			brightness: 0,
			contrast: 0,
			zoom: 1,
			panX: 0,
			panY: 0,
			guidelineOverlayEnabled: true,
		};
	}

	return {
		id: sessionId,
		patientId: params.patientId,
		patientName: params.patientName,
		doctorName: params.doctorName,
		clinicName: params.clinicName || "ООО «Денте Стоматология»",
		stage: params.stage || "pre_treatment",
		sessionDate: params.sessionDate || nowIso,
		treatmentPlanId: params.treatmentPlanId,
		treatmentPlanStageId: params.treatmentPlanStageId,
		treatmentStageTitle: params.treatmentStageTitle,
		slots,
		findings: {
			angleClassMolarRight: "class_1",
			angleClassMolarLeft: "class_1",
			angleClassCanineRight: "class_1",
			angleClassCanineLeft: "class_1",
			overjetMm: 2.5,
			overbiteMm: 2.5,
			overbitePercentage: 30,
			midlineShiftUpperMm: 0,
			midlineShiftUpperDirection: "none",
			midlineShiftLowerMm: 0,
			midlineShiftLowerDirection: "none",
			smileArc: "consonant",
			crowdingUpper: false,
			crowdingLower: false,
			crossbite: false,
			openBite: false,
			deepBite: false,
			clinicalDiagnosisRu: "Аномалия прикуса, сужение зубных рядов",
			recommendationsRu: "Аппаратурное ортодонтическое лечение, коррекция торка и окклюзии",
		},
		notes: params.notes || "",
		createdAt: nowIso,
		updatedAt: nowIso,
	};
}

/**
 * Updates a specific photo slot in an orthodontic session.
 */
export function updateSlotPhoto(
	session: OrthodonticPhotoSession,
	angleId: OrthodonticAngleId,
	updates: Partial<OrthodonticPhotoSlotRecord>,
): OrthodonticPhotoSession {
	const existingSlot = session.slots[angleId] || {
		angleId,
		rotationDegrees: 0,
		flipHorizontal: false,
		flipVertical: false,
		brightness: 0,
		contrast: 0,
		zoom: 1,
		panX: 0,
		panY: 0,
		guidelineOverlayEnabled: true,
	};

	const updatedSlot: OrthodonticPhotoSlotRecord = {
		...existingSlot,
		...updates,
		angleId,
		capturedAt: updates.capturedAt || existingSlot.capturedAt || (updates.imageUrl ? new Date().toISOString() : undefined),
	};

	return {
		...session,
		slots: {
			...session.slots,
			[angleId]: updatedSlot,
		},
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Removes photo from a slot, resetting image and calibration data.
 */
export function removeSlotPhoto(
	session: OrthodonticPhotoSession,
	angleId: OrthodonticAngleId,
): OrthodonticPhotoSession {
	const existingSlot = session.slots[angleId];
	if (!existingSlot) return session;

	const resetSlot: OrthodonticPhotoSlotRecord = {
		angleId,
		imageUrl: undefined,
		capturedAt: undefined,
		rotationDegrees: 0,
		flipHorizontal: false,
		flipVertical: false,
		brightness: 0,
		contrast: 0,
		zoom: 1,
		panX: 0,
		panY: 0,
		calibrationMmPerPx: undefined,
		notes: undefined,
		guidelineOverlayEnabled: true,
		midlineOffsetMm: undefined,
		occlusalTiltDegrees: undefined,
		landmarks: undefined,
	};

	return {
		...session,
		slots: {
			...session.slots,
			[angleId]: resetSlot,
		},
		updatedAt: new Date().toISOString(),
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MULTI-SESSION BEFORE/AFTER COMPARISON SERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compares two orthodontic photo-protocol sessions (e.g. Pre-treatment vs Post-treatment)
 * and pairs photos angle-by-angle for before/after comparison.
 */
export function buildOrthodonticComparisonSeries(
	beforeSession: OrthodonticPhotoSession,
	afterSession: OrthodonticPhotoSession,
): OrthodonticComparisonSeries {
	const pairs: OrthodonticComparisonPair[] = [];
	let pairedCount = 0;

	for (const angle of ORTHODONTIC_8_ANGLES) {
		const beforeSlot = beforeSession.slots[angle.id];
		const afterSlot = afterSession.slots[angle.id];
		const hasBefore = Boolean(beforeSlot && beforeSlot.imageUrl);
		const hasAfter = Boolean(afterSlot && afterSlot.imageUrl);
		const hasBoth = hasBefore && hasAfter;

		if (hasBoth) {
			pairedCount += 1;
		}

		pairs.push({
			angleId: angle.id,
			angleDefinition: angle,
			...(hasBefore && beforeSlot ? { beforePhoto: beforeSlot } : {}),
			...(hasAfter && afterSlot ? { afterPhoto: afterSlot } : {}),
			...(beforeSession.sessionDate ? { beforeSessionDate: beforeSession.sessionDate } : {}),
			...(afterSession.sessionDate ? { afterSessionDate: afterSession.sessionDate } : {}),
			...(beforeSession.stage ? { beforeStage: beforeSession.stage } : {}),
			...(afterSession.stage ? { afterStage: afterSession.stage } : {}),
			hasBothPhotos: hasBoth,
		});
	}

	const beforeTime = new Date(beforeSession.sessionDate).getTime();
	const afterTime = new Date(afterSession.sessionDate).getTime();
	const daysBetweenSessions = Math.max(
		0,
		Math.round(Math.abs(afterTime - beforeTime) / (1000 * 60 * 60 * 24)),
	);

	return {
		beforeSession,
		afterSession,
		pairs,
		pairedCount,
		daysBetweenSessions,
	};
}

/**
 * Calculates alignment rotation and scale between pupil landmarks for extraoral Before/After comparison.
 */
export function alignPupilAndIncisalLine(params: {
	beforePupils: { leftEye: OrthodonticPoint2D; rightEye: OrthodonticPoint2D };
	afterPupils: { leftEye: OrthodonticPoint2D; rightEye: OrthodonticPoint2D };
}): BeforeAfterAlignmentConfig {
	const bDx = params.beforePupils.rightEye.x - params.beforePupils.leftEye.x;
	const bDy = params.beforePupils.rightEye.y - params.beforePupils.leftEye.y;
	const bDist = Math.hypot(bDx, bDy);
	const bAngle = Math.atan2(bDy, bDx);

	const aDx = params.afterPupils.rightEye.x - params.afterPupils.leftEye.x;
	const aDy = params.afterPupils.rightEye.y - params.afterPupils.leftEye.y;
	const aDist = Math.hypot(aDx, aDy);
	const aAngle = Math.atan2(aDy, aDx);

	const tiltRad = aAngle - bAngle;
	const pupilLineTiltDegrees = Math.round(((tiltRad * 180) / Math.PI) * 10) / 10;
	const scaleCorrectionFactor = bDist > 0 && aDist > 0 ? Math.round((bDist / aDist) * 1000) / 1000 : 1;

	return {
		pupilLineTiltDegrees,
		scaleCorrectionFactor,
		horizontalShiftMm: 0,
		verticalShiftMm: 0,
	};
}
