import React from "react";
import { Beaker, RefreshCcw } from "lucide-react";
import { AuthArtBackground } from "../../auth/AuthArtBackground.js";
import { useGuestLabPortalState } from "./useGuestLabPortalState.js";
import { GuestLabPortalHeader } from "./GuestLabPortalHeader.js";
import { GuestLabPortalTechnicalDetails } from "./GuestLabPortalTechnicalDetails.js";
import { GuestLabPortalClinicalNotes } from "./GuestLabPortalClinicalNotes.js";
import { GuestLabPortalAttachments } from "./GuestLabPortalAttachments.js";
import { GuestLabPortalPhotoUpload } from "./GuestLabPortalPhotoUpload.js";
import { GuestLabPortalStatusActions } from "./GuestLabPortalStatusActions.js";
import { GuestLabPortalCourierWaybill } from "./GuestLabPortalCourierWaybill.js";
import type { GuestLabPortalProps, LabOrderData } from "./guestPortalTypes.js";

if (typeof document !== "undefined") {
	void import("./GuestLabPortal.css");
}

export type { GuestLabPortalProps, LabOrderData };

export function GuestLabPortal({ token }: GuestLabPortalProps): React.JSX.Element {
	const state = useGuestLabPortalState(token);

	if (state.isLoading) {
		return (
			<div className="guest-portal-container" style={{ justifyContent: "center" }}>
				<AuthArtBackground overlayAlpha={0.4} />
				<RefreshCcw className="guest-portal-spinner" size={32} />
			</div>
		);
	}

	if (state.error || !state.order) {
		return (
			<div className="guest-portal-container" style={{ justifyContent: "center" }}>
				<AuthArtBackground overlayAlpha={0.4} />
				<div className="guest-portal-card">
					<div className="guest-portal-icon-wrapper"><Beaker size={32} /></div>
					<h2 className="guest-portal-title">Ошибка доступа</h2>
					<p className="guest-portal-subtitle">{state.error}</p>
				</div>
			</div>
		);
	}

	const order = state.order;

	return (
		<div className="guest-portal-container">
			<AuthArtBackground overlayAlpha={0.4} />
			<div className="guest-portal-card">
				<GuestLabPortalHeader order={order} />
				<div style={{ background: "var(--bg-default)", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
					<div className="guest-portal-grid">
						<GuestLabPortalTechnicalDetails order={order} />
						<GuestLabPortalClinicalNotes notes={order.clinicalNotes} />
					</div>
					<GuestLabPortalAttachments attachedImageUrl={order.attachedImageUrl} />
					<GuestLabPortalPhotoUpload isUploading={state.isUploadingPhoto} onFileSelected={state.uploadPhoto} />
					<GuestLabPortalStatusActions currentStatus={order.status} isUpdating={state.isUpdating} onUpdateStatus={state.updateStatus} />
					<GuestLabPortalCourierWaybill order={order} showWaybill={state.showCourierWaybill} onToggleWaybill={() => state.setShowCourierWaybill((p) => !p)} />
					<p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "8px" }}>
						* Изменение статуса автоматически уведомит врача в расписании клиники.
					</p>
				</div>
			</div>
		</div>
	);
}
