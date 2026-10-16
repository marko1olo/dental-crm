import React, { useCallback } from "react";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import { renderForm043uHtml, type FullForm043uPayload, type ToothClinicalStatusCode, type ToothSurface, type FdiToothRecord } from "@dental/shared";
import { createIntactOdontogramRecords } from "../../../lib/clinicalProtocols043";
import { showToast } from "../../GlobalToast";
import { openPrintWindow } from "./form043Utils";
import { useMedicalCardState } from "./medicalCard/useMedicalCardState";
import { useMedicalCardRevision } from "./medicalCard/useMedicalCardRevision";
import { useMedicalCardDraftAutosave } from "./medicalCard/useMedicalCardDraftAutosave";
import { MedicalCardHeaderToolbar } from "./medicalCard/MedicalCardHeaderToolbar";
import { MedicalCardRevisionBanner } from "./medicalCard/MedicalCardRevisionBanner";
import { MedicalCardActiveTabContent } from "./medicalCard/MedicalCardActiveTabContent";

export interface DentalMedicalCard043uFormProps {
	initialPayload?: (Partial<FullForm043uPayload> & { isSigned?: boolean; isDraft?: boolean; revisionCount?: number; revisionReason?: string }) | undefined;
	onChange?: ((payload: FullForm043uPayload) => void) | undefined;
	disabled?: boolean | undefined;
}

export const DentalMedicalCard043uForm: React.FC<DentalMedicalCard043uFormProps> = React.memo(
	function DentalMedicalCard043uForm({ initialPayload, onChange, disabled }) {
		const state = useMedicalCardState(initialPayload);
		const rev = useMedicalCardRevision(
			(initialPayload as any)?.revisionCount ?? 0,
			(initialPayload as any)?.revisionReason ?? "Исправленному верить",
			state.createSnapshot, state.restoreSnapshot,
		);
		const effectiveDisabled = Boolean(disabled && !rev.isRevising);

		const handleApplyGlobalNorm = useCallback(() => {
			if (!rev.reviseSnapshot) rev.setReviseSnapshot(state.createSnapshot());
			if (effectiveDisabled) rev.setIsRevising(true);
			state.setOdontogram(createIntactOdontogramRecords());
			state.setCpitn({
				sextant18_14: "0_healthy", sextant13_23: "0_healthy", sextant24_28: "0_healthy",
				sextant48_44: "0_healthy", sextant43_33: "0_healthy", sextant34_38: "0_healthy",
				treatmentNeedCategory: "0_none",
			});
			state.setHygieneIndexOhiS("OHI-S = 0.0 (Отличная гигиена полости рта)");
			state.handleApplyAnamnesisNorm();
			showToast("Вся медицинская карта заполнена нормой. Врач правит только патологию!", "success", 4000);
		}, [effectiveDisabled, rev, state]);

		const handleSurfaceToggle = useCallback((toothNumber: number, surf: ToothSurface) => {
			if (effectiveDisabled) return;
			state.setOdontogram((prev) => {
				const ex: FdiToothRecord = prev[toothNumber] ?? { toothNumber, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" };
				const cur = ex.surfaces ?? [];
				return { ...prev, [toothNumber]: { ...ex, surfaces: cur.includes(surf) ? cur.filter((s) => s !== surf) : [...cur, surf] } };
			});
		}, [effectiveDisabled, state]);

		const handleToothStatusSet = useCallback((toothNumber: number, statusCode: ToothClinicalStatusCode) => {
			if (effectiveDisabled) return;
			state.setOdontogram((prev) => {
				const ex: FdiToothRecord = prev[toothNumber] ?? { toothNumber, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" };
				return { ...prev, [toothNumber]: { ...ex, statusCode, surfaces: statusCode === "healthy" || statusCode === "extracted_absent" ? [] : ex.surfaces } };
			});
		}, [effectiveDisabled, state]);

		const form043DraftKey = `dente_form043_draft_${initialPayload?.medicalCardNumber || "local_current"}`;
		const { latestPayloadRef } = useMedicalCardDraftAutosave(form043DraftKey, initialPayload, state, rev, effectiveDisabled, onChange);

		const handlePrintBlank = useCallback(() => {
			openPrintWindow(renderForm043uHtml({
				medicalCardNumber: initialPayload?.medicalCardNumber || "__________",
				cardOpenedDate: "«___» _________ 20___ г.", patientFullName: "________________________________________________________",
				patientBirthDate: "«___» _________ _____ г.", patientPhone: "+7 (___) ___-__-__",
				patientAddressRegistration: "________________________________________________________", chiefComplaint: "________________________________________________________",
				historyOfPresentIllness: "________________________________________________________", allergologicalHistory: "________________________________________________________",
				concomitantDiseases: "________________________________________________________", attendingDoctorFullName: initialPayload?.attendingDoctorFullName || "________________________",
				isClosed: false, watermarkText: "ЧЕРНОВИК (БЛАНК)",
			}));
		}, [initialPayload]);

		const handleFastPrint = useCallback(() => {
			const isSigned = Boolean(initialPayload?.isSigned);
			const watermark = rev.isRevising || rev.revisionCount > 0
				? `ИСПРАВЛЕННОМУ ВЕРИТЬ (РЕДАКЦИЯ ${rev.revisionCount + (rev.isRevising ? 1 : 0)})`
				: isSigned ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП";
			openPrintWindow(renderForm043uHtml({ ...(latestPayloadRef.current ?? {}), isClosed: isSigned, watermarkText: watermark }));
		}, [initialPayload, rev.isRevising, rev.revisionCount, latestPayloadRef]);

		return (
			<div className="document-form-container form-043u-wrapper">
				<DocumentPayloadCard title="Медицинская карта приёма" description="Электронная карта приёма: зубная формула, анамнез, индексы и протоколы">
					<MedicalCardHeaderToolbar
						activeTab={state.activeTab} setActiveTab={state.setActiveTab}
						handleApplyGlobalNorm={handleApplyGlobalNorm} hasReviseSnapshot={rev.reviseSnapshot !== null}
						handleCancelRevise={rev.handleCancelRevise} isRevising={rev.isRevising}
						revisionCount={rev.revisionCount} handleBeginRevise={rev.handleBeginRevise}
						disabled={disabled} isSigned={initialPayload?.isSigned}
						onPrintBlank={handlePrintBlank} onFastPrint={handleFastPrint}
					/>
					{rev.isRevising && (
						<MedicalCardRevisionBanner
							revisionReason={rev.revisionReason} setRevisionReason={rev.setRevisionReason}
							onSaveRevision={rev.handleSaveRevision} onCancelRevision={rev.handleCancelRevise}
						/>
					)}
					<MedicalCardActiveTabContent
						activeTab={state.activeTab} state={state} effectiveDisabled={effectiveDisabled}
						handleToothStatusSet={handleToothStatusSet} handleSurfaceToggle={handleSurfaceToggle}
					/>
				</DocumentPayloadCard>
			</div>
		);
	},
);
