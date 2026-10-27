import type { ImagingViewerSession, ImagingViewerSessionState } from "@dental/shared";
import type { imagingViewerSessions } from "../schema.js";

export function createDefaultViewerSessionState(): ImagingViewerSessionState {
	return {
		mode: "two_d",
		activeTool: "pan",
		activeQuickActionId: null,
		windowPreset: "bone",
		windowCenter: null,
		windowWidth: null,
		brightness: 1,
		contrast: 1,
		inverted: false,
		rotationDeg: 0,
		flipHorizontal: false,
		zoom: 1,
		panX: 0,
		panY: 0,
		sliceIndex: null,
		projection: null,
		axisDeg: 0,
		slabMm: 1,
		crosshair: false,
		linkedPlanes: false,
		implantPlan: null,
	};
}

export function mapViewerSessionRecord(
	session: typeof imagingViewerSessions.$inferSelect,
): ImagingViewerSession {
	return {
		id: session.id,
		organizationId: session.organizationId,
		studyId: session.studyId,
		patientId: session.patientId,
		visitId: session.visitId,
		state: session.state,
		annotations: session.annotations,
		clientSavedAt: session.clientSavedAt?.toISOString() ?? null,
		serverSavedAt: session.serverSavedAt.toISOString(),
		createdAt: session.createdAt.toISOString(),
		updatedAt: session.updatedAt.toISOString(),
		warnings: session.warnings,
	};
}
