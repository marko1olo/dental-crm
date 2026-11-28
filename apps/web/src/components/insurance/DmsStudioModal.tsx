/**
 * DmsStudioModal.tsx — Canonical Master Studio for Russian DMS Insurance, Guarantee Letters & Split Billing.
 *
 * Mandates:
 * - 8e (Doctor & Staff Autonomy: buttons NEVER disabled, instant defaults)
 * - 8n (Solo-Doctor & Small Clinic 1-3 chairs sovereignty: zero bureaucracy)
 * - 8am (Exactly ONE Primary CTA button var(--primary) per visible context)
 * - 8ze / Apple HIG (Touch targets >= 44x44px, native Bottom Sheet on mobile, 0px horizontal scroll)
 * - 8x / 8ap (Human Russian clinical language, zero raw law numbers)
 * - 8b (Healthy sweet spot: modular subcomponents under components/insurance/studio/)
 * - 8be (Zero any / as any, strict types)
 */

import React from "react";
import {
	AlertTriangle,
	Building2,
	Check,
	Clock,
	FileSpreadsheet,
	Shield,
	Split,
	X,
	Zap,
} from "lucide-react";
import {
	type DmsBillableItem,
	type PatientPaymentMethod,
	formatKopecksToRub,
	rublesToKopecks,
} from "@dental/shared";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import {
	DmsSplitBillingTab,
	DmsGuaranteeLettersTab,
	DmsRegistryExportTab,
	useDmsStudioState,
} from "./studio/index.js";
import "./insurance.css";

export interface DmsStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose?: (() => void) | undefined;
	readonly patient?: {
		id: string;
		fullName: string;
		birthDate?: string | undefined;
		policyNumber?: string | undefined;
		cardNumber?: string | undefined;
	} | undefined;
	readonly initialTab?: ("split" | "policies" | "registry") | undefined;
	readonly billItems?: readonly DmsBillableItem[] | undefined;
	readonly onApplySplitToCashbox?: ((splitData: {
		totalDueRub: number;
		dmsRub: number;
		patientRub: number;
		patientMethod: PatientPaymentMethod;
		patientCashRub?: number | undefined;
		patientCardRub?: number | undefined;
		letterId?: string | undefined;
		letterNumber?: string | undefined;
		insurerName?: string | undefined;
	}) => void) | undefined;
}

const formatDisplayRub = (rub: number): string => formatKopecksToRub(rublesToKopecks(rub));

export const DmsStudioModal: React.FC<DmsStudioModalProps> = ({
	isOpen,
	onClose = () => {},
	patient: propPatient,
	initialTab = "split",
	billItems,
	onApplySplitToCashbox,
}) => {
	const isDemo = isDemoShowcaseMode();
	const patient = propPatient || (isDemo ? { id: "", fullName: "Соколова Анна Викторовна", birthDate: "15.04.1990", policyNumber: "СГЗ-2026-998811" } : { id: "", fullName: "Пациент", birthDate: "", policyNumber: "" });

	const {
		activeTab,
		setActiveTab,
		selectedInsurerId,
		setSelectedInsurerId,
		franchisePercent,
		setFranchisePercent,
		paymentMethod,
		setPaymentMethod,
		mixedCashRubInput,
		setMixedCashRubInput,
		isSplitApproved,
		availableInsurers,
		selectedLetter,
		newLetterNumber,
		setNewLetterNumber,
		newLetterLimitRub,
		setNewLetterLimitRub,
		effectiveBillItems,
		totalBillRub,
		totalDmsCoveredRub,
		totalPatientCoPayRub,
		lineItems,
		letterRemainingLimitRub,
		patientDueRub,
		mixedCardRub,
		registryRecords,
		handleAddLetter,
		handleExportCsv,
		handlePrintAct,
		handleApplySplit,
	} = useDmsStudioState({
		isOpen,
		onClose,
		patient,
		initialTab,
		billItems,
		onApplySplitToCashbox,
	});

	const todayIso = new Date().toISOString().slice(0, 10);
	const letterValidUntil = selectedLetter?.validUntil || selectedLetter?.validTo;
	const isLetterExpired = Boolean(letterValidUntil && letterValidUntil < todayIso);
	const isLetterExhausted =
		selectedLetter?.status === "exhausted" ||
		(Boolean(selectedLetter) &&
			letterRemainingLimitRub !== null &&
			letterRemainingLimitRub <= 0);
	const isLetterCancelled = selectedLetter?.status === "cancelled";

	let badgeClass = "dms-badge dms-badge-active";
	let badgeIcon = <Zap size={12} />;
	let badgeText = "Активен";

	if (isLetterCancelled) {
		badgeClass = "dms-badge dms-badge-cancelled";
		badgeIcon = <AlertTriangle size={12} />;
		badgeText = "Отозван";
	} else if (isLetterExhausted) {
		badgeClass = "dms-badge dms-badge-exhausted";
		badgeIcon = <AlertTriangle size={12} />;
		badgeText = "Исчерпан";
	} else if (isLetterExpired) {
		badgeClass = "dms-badge dms-badge-expired";
		badgeIcon = <Clock size={12} />;
		badgeText = "Истёк";
	}

	if (!isOpen) return null;

	return (
		<div className="dms-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
			<div className="dms-modal-window" onClick={(e) => e.stopPropagation()}>
				{/* Apple HIG Drag Handle for mobile */}
				<div className="dms-bottom-sheet-handle" />

				{/* Header */}
				<div className="dms-header">
					<div className="dms-header-info">
						<div className="dms-header-icon">
							<Shield size={22} />
						</div>
						<div className="dms-header-text">
							<h2 className="dms-header-title">
								ДМС: {patient.fullName}
							</h2>
							<div className="dms-header-meta">
								{patient.birthDate ? `Дата рождения: ${patient.birthDate} • ` : ""}
								Полис: {patient.policyNumber || "Не указан"} • Статус:{" "}
								<span className={badgeClass}>
									{badgeIcon} {badgeText}
								</span>
							</div>
						</div>
					</div>
					<button type="button" onClick={onClose} className="dms-close-btn" aria-label="Закрыть">
						<X size={18} />
					</button>
				</div>

				{/* Navigation Tabs */}
				<div className="dms-tabs-bar">
					<button
						type="button"
						onClick={() => setActiveTab("split")}
						className={`dms-tab-btn ${activeTab === "split" ? "dms-tab-btn-active" : ""}`}
					>
						<Split size={16} />
						<span className="dms-tab-label-full">Сплит оплаты</span>
						<span className="dms-tab-label-short">Сплит</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("policies")}
						className={`dms-tab-btn ${activeTab === "policies" ? "dms-tab-btn-active" : ""}`}
					>
						<Building2 size={16} />
						<span className="dms-tab-label-full">Гарантийное письмо</span>
						<span className="dms-tab-label-short">Гарантии</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("registry")}
						className={`dms-tab-btn ${activeTab === "registry" ? "dms-tab-btn-active" : ""}`}
					>
						<FileSpreadsheet size={16} />
						<span className="dms-tab-label-full">Реестр счетов</span>
						<span className="dms-tab-label-short">Реестр</span>
					</button>
				</div>

				{/* Modal Body */}
				<div className="dms-body">
					{activeTab === "split" && (
						<DmsSplitBillingTab
							availableInsurers={availableInsurers}
							selectedInsurerId={selectedInsurerId}
							onSelectInsurerId={setSelectedInsurerId}
							letterRemainingLimitRub={letterRemainingLimitRub}
							franchisePercent={franchisePercent}
							onSelectFranchisePercent={setFranchisePercent}
							effectiveBillItems={effectiveBillItems}
							lineItems={lineItems}
							totalDmsCoveredRub={totalDmsCoveredRub}
							totalPatientCoPayRub={totalPatientCoPayRub}
							paymentMethod={paymentMethod}
							onSelectPaymentMethod={setPaymentMethod}
							mixedCashRubInput={mixedCashRubInput}
							onChangeMixedCashRubInput={setMixedCashRubInput}
							mixedCardRub={mixedCardRub}
							patientDueRub={patientDueRub}
							selectedInsurerTitle={selectedLetter?.insurerName || selectedLetter?.companyName || "страховой компании"}
							formatDisplayRub={formatDisplayRub}
						/>
					)}

					{activeTab === "policies" && (
						<DmsGuaranteeLettersTab
							availableInsurers={availableInsurers}
							selectedInsurerId={selectedInsurerId}
							onSelectInsurerId={setSelectedInsurerId}
							newLetterNumber={newLetterNumber}
							onChangeNewLetterNumber={setNewLetterNumber}
							newLetterLimitRub={newLetterLimitRub}
							onChangeNewLetterLimitRub={setNewLetterLimitRub}
							onAddLetter={handleAddLetter}
						/>
					)}

					{activeTab === "registry" && (
						<DmsRegistryExportTab
							registryRecords={registryRecords}
							onExportCsv={handleExportCsv}
							onPrintAct={handlePrintAct}
							formatDisplayRub={formatDisplayRub}
						/>
					)}
				</div>

				{/* Footer with EXACTLY ONE PRIMARY CTA BUTTON */}
				<div className="dms-footer">
					<div className="dms-footer-summary">
						Итого к сплиту: <strong>{formatDisplayRub(totalBillRub)}</strong> (Страховая: {formatDisplayRub(totalDmsCoveredRub)} • Пациент: {formatDisplayRub(totalPatientCoPayRub)})
					</div>
					<div className="dms-footer-actions">
						{/* EXACTLY ONE PRIMARY CTA: Mandate 8am & 8e */}
						<button
							type="button"
							onClick={handleApplySplit}
							className="dms-primary-cta dente-btn-primary"
						>
							<Check size={18} /> {isSplitApproved ? "Сплит утвержден в кассе" : "Утвердить ДМС-сплит"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

DmsStudioModal.displayName = "DmsStudioModal";
export default DmsStudioModal;
