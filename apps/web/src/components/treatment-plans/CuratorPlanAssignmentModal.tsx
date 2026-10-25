/**
 * apps/web/src/components/treatment-plans/CuratorPlanAssignmentModal.tsx
 *
 * Модальное окно закрепления / смены куратора лечения за пациентом и планом (Фича #27).
 * Автономия врача и суверенитет масштаба (Мандаты 8e, 8k, 8n).
 * Строго <= 120 строк per Mandate 8b.
 */

import React, { useMemo } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import {
	DOCTOR_SELF_CURATOR_ID,
	isDoctorSelfCurator,
	CURATOR_ALLOWED_STAFF_ROLES,
	CURATOR_ROLE_LABELS,
	type CuratorPlanAssignmentModalProps,
} from "./curator/curatorConstants";
import { CuratorModalHeader } from "./curator/CuratorModalHeader";
import { CuratorFormBody } from "./curator/CuratorFormBody";
import { CuratorModalFooter } from "./curator/CuratorModalFooter";
import { useCuratorPlanAssignment } from "./curator/useCuratorPlanAssignment";

export {
	DOCTOR_SELF_CURATOR_ID,
	isDoctorSelfCurator,
	CURATOR_ALLOWED_STAFF_ROLES,
	CURATOR_ROLE_LABELS,
	type CuratorPlanAssignmentModalProps,
};

export const CuratorPlanAssignmentModal: React.FC<CuratorPlanAssignmentModalProps> = ({
	isOpen,
	patientId,
	patientName,
	treatmentPlanId,
	treatmentPlanTitle,
	currentCuratorId,
	currentStage = "consultation",
	onClose,
	onAssigned,
	onApprovePlan,
	onPrintEstimate,
	onSendToCashier,
}) => {
	const { dashboard } = useAppLogicContext();

	const staffList = useMemo(() => {
		const staff = (dashboard?.clinicSettings?.staff ?? []) as any[];
		return staff.filter((s) => s.active && CURATOR_ALLOWED_STAFF_ROLES.has(s.role));
	}, [dashboard?.clinicSettings?.staff]);

	const {
		selectedCuratorId, setSelectedCuratorId, selectedStage, setSelectedStage,
		useCustomCommission, setUseCustomCommission, customCommissionPercent, setCustomCommissionPercent,
		notes, setNotes, nextContactDate, setNextContactDate, isSaving, isDoctorSelf,
		handleSave, handleApprovePlan, handlePrintEstimate, handleSendToCashier,
	} = useCuratorPlanAssignment({
		patientId, treatmentPlanId, currentCuratorId, currentStage, staffList,
		onClose, onAssigned, onApprovePlan, onPrintEstimate, onSendToCashier,
	});

	if (!isOpen) return null;

	return (
		<div className="curator-modal-backdrop" onClick={onClose}>
			<div className="curator-modal-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
				<CuratorModalHeader patientName={patientName} treatmentPlanTitle={treatmentPlanTitle} onClose={onClose} />
				<CuratorFormBody
					staffList={staffList} selectedCuratorId={selectedCuratorId} onSelectCuratorId={setSelectedCuratorId}
					selectedStage={selectedStage} onSelectStage={setSelectedStage}
					useCustomCommission={useCustomCommission} onToggleCustomCommission={setUseCustomCommission}
					customCommissionPercent={customCommissionPercent} onChangeCommissionPercent={setCustomCommissionPercent}
					nextContactDate={nextContactDate} onChangeNextContactDate={setNextContactDate}
					notes={notes} onChangeNotes={setNotes}
				/>
				<CuratorModalFooter
					isSaving={isSaving} isDoctorSelf={isDoctorSelf} onClose={onClose} onSave={handleSave}
					onApprovePlan={handleApprovePlan} onPrintEstimate={handlePrintEstimate} onSendToCashier={handleSendToCashier}
				/>
			</div>
		</div>
	);
};
