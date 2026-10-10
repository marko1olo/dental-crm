/**
 * DmsGuaranteeLetterModal.tsx — Тонкий фасад модального окна учета и редактирования
 * гарантийных писем ДМС, лимитов страхового покрытия, франшиз и исключений.
 */

import { FileCheck, X, Zap } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import "./insurance.css";
import {
	DmsApprovedServicesMatrix,
	DmsCoverageSummaryBanner,
	DmsGuaranteeModalFooter,
	DmsInsurerAndPolicyForm,
	DmsLimitsAndFranchiseSection,
	useDmsGuaranteeLetterState,
	type DmsGuaranteeLetterModalProps,
} from "./dmsGuaranteeLetter";

export * from "./dmsGuaranteeLetter";

export function DmsGuaranteeLetterModal(props: DmsGuaranteeLetterModalProps) {
	const { isOpen, onClose, patient, billItems } = props;
	const s = useDmsGuaranteeLetterState(props);

	if (!isOpen) return null;

	const modalContent = (
		<div className="dms-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
			<div className="dms-modal-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "1020px" }}>
				<div className="dms-modal-header">
					<h2 className="dms-modal-title">
						<FileCheck size={22} style={{ color: "var(--teal, #0d9488)" }} />
						<span>Гарантийное письмо ДМС и лимиты страховой программы</span>
						{s.isEmergencyCare && (
							<span className="dms-badge dms-badge-active" style={{ marginLeft: "6px" }}>
								<Zap size={13} /> Экстренный приём
							</span>
						)}
					</h2>
					<button
						type="button"
						className="dms-btn dms-btn-secondary dms-btn-icon"
						onClick={onClose}
						aria-label="Закрыть модальное окно"
					>
						<X size={18} />
					</button>
				</div>

				<div className="dms-modal-body">
					<DmsCoverageSummaryBanner
						patient={patient} insurerDisplayName={s.insurerDisplayName} letterNumber={s.letterNumber}
						maxCoverageRub={s.maxCoverageRub} usedAmountRub={s.usedAmountRub} remainingLimitRub={s.remainingLimitRub}
						usagePercent={s.usagePercent} franchiseType={s.franchiseType} franchisePct={s.franchisePct}
						franchiseFixedRub={s.franchiseFixedRub} status={s.status}
					/>
					<DmsInsurerAndPolicyForm
						insurerKey={s.insurerKey} customInsurerName={s.customInsurerName} policyNumber={s.policyNumber}
						letterNumber={s.letterNumber} issueDate={s.issueDate} validFrom={s.validFrom} validUntil={s.validUntil}
						isEmergencyCare={s.isEmergencyCare} isDeferredScan={s.isDeferredScan}
						attachedScanFileName={s.attachedScanFileName} activeInsurer={s.activeInsurer}
						onInsurerKeyChange={s.setInsurerKey} onCustomInsurerNameChange={s.setCustomInsurerName}
						onPolicyNumberChange={s.setPolicyNumber} onLetterNumberChange={s.setLetterNumber}
						onIssueDateChange={s.setIssueDate} onValidFromChange={s.setValidFrom} onValidUntilChange={s.setValidUntil}
						onEmergencyCareChange={s.setIsEmergencyCare} onDeferredScanChange={s.setIsDeferredScan}
						onAttachedScanFileNameChange={s.setAttachedScanFileName}
						onActivateEmergency={s.handleActivateEmergencyPainMode} onApplyExpressPreset={s.handleApplyExpressPreset}
					/>
					<DmsLimitsAndFranchiseSection
						maxCoverageRub={s.maxCoverageRub} usedAmountRub={s.usedAmountRub} remainingLimitRub={s.remainingLimitRub}
						franchiseType={s.franchiseType} franchisePct={s.franchisePct} franchiseFixedRub={s.franchiseFixedRub} status={s.status}
						onMaxCoverageChange={s.setMaxCoverageRub} onUsedAmountChange={s.setUsedAmountRub}
						onFranchiseTypeChange={s.setFranchiseType} onFranchisePctChange={s.setFranchisePct}
						onFranchiseFixedRubChange={s.setFranchiseFixedRub} onStatusChange={s.setStatus}
					/>
					<DmsApprovedServicesMatrix
						selectedExclusions={s.selectedExclusions} approvedServiceCodes={s.approvedServiceCodes}
						approvedDiagnosisCodes={s.approvedDiagnosisCodes} approvedTeethFdi={s.approvedTeethFdi}
						letterForSplit={s.letterForSplit} billItems={billItems} notes={s.notes}
						onToggleExclusion={s.toggleExclusion} onToggleApprovedService={s.toggleApprovedService}
						onToggleDiagnosis={s.toggleDiagnosis} onToggleApprovedTooth={s.toggleApprovedTooth}
						onNotesChange={s.setNotes}
					/>
				</div>

				<DmsGuaranteeModalFooter
					isEmergencyCare={s.isEmergencyCare} onClose={onClose} onSave={s.handleSave}
					onAttachToCurrentVisit={s.handleAttachToCurrentVisit} onSendPreAuthRequest={s.handleSendPreAuthRequest}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
