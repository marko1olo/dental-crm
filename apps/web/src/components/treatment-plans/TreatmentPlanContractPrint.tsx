/**
 * TreatmentPlanContractPrint.tsx — Печатная форма Договора на оказание платных медицинских услуг
 * и комплексного плана лечения (Постановление Правительства РФ № 736, ст. 20 323-ФЗ, Приказ 804н).
 * Декомпозирован строго по Мандату 8b (лимит <= 120 строк).
 */

import React, { useMemo, useState } from "react";
import { formatWarrantyYearsText, type DigitalSignatureAgreementData, type TreatmentPlanStage, type TreatmentPlanTier } from "./types";
import { type Kopecks, parseKopecks } from "@dental/shared";
import { generatePlanVerificationQrPayload } from "./qr/treatmentPlanQrEngine";
import { TreatmentPlanContractPrintHeader } from "./TreatmentPlanContractPrintHeader";
import { TreatmentPlanContractClinicPatientInfo } from "./TreatmentPlanContractClinicPatientInfo";
import { TreatmentPlanContractServicesTable } from "./TreatmentPlanContractServicesTable";
import { TreatmentPlanContractFinancialSummary } from "./TreatmentPlanContractFinancialSummary";
import { TreatmentPlanContractSignatures } from "./TreatmentPlanContractSignatures";
import "../../styles/premium-document-print.css";

export interface TreatmentPlanContractPrintProps {
	readonly isOpen: boolean;
	readonly tier: TreatmentPlanTier;
	readonly stages: readonly TreatmentPlanStage[];
	readonly patientName: string;
	readonly patientId: string;
	readonly patientPhone?: string | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly doctorFullName: string;
	readonly clinicName: string;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicOgrn?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly clinicLicense?: string | undefined;
	readonly contractNumber?: string | undefined;
	readonly signedAgreement?: DigitalSignatureAgreementData | null | undefined;
	readonly discountPercent?: number | undefined;
	readonly bonusPointsDeductedRub?: number | undefined;
	readonly installmentMonths?: number | undefined;
	readonly planAgeDays?: number | undefined;
	readonly onClose: () => void;
}

export const TreatmentPlanContractPrint: React.FC<TreatmentPlanContractPrintProps> = (props) => {
	const { isOpen, tier, stages, patientName, patientId, patientPhone = "+7 (___) ___-__-__", patientBirthDate, doctorFullName, clinicName, clinicLegalName = "Стоматологическая клиника", clinicInn = "", clinicOgrn = "", clinicAddress = "", clinicLicense = "", contractNumber, signedAgreement, discountPercent = 0, bonusPointsDeductedRub = 0, installmentMonths = 12, planAgeDays, onClose } = props;
	const [showMicroConsumables, setShowMicroConsumables] = useState(false);
	const [viewMode, setViewMode] = useState<"patient_friendly" | "official_appendix">("patient_friendly");
	const [isCopiedMessenger, setIsCopiedMessenger] = useState(false);

	const activeStages = useMemo(() => {
		const withItems = stages.filter((s) => s.items && s.items.length > 0);
		return withItems.length > 0 ? withItems : stages;
	}, [stages]);
	const allItems = useMemo(() => activeStages.flatMap((s) => s.items), [activeStages]);

	const grossTotalKopecks = allItems.reduce((acc, it) => (acc + parseKopecks(it.unitPriceRub || 0) * (it.quantity || 1)) as Kopecks, 0 as Kopecks);
	const grossTotalRub = Math.round(grossTotalKopecks / 100);
	const discountTotalKopecks = allItems.reduce((acc, it) => (acc + parseKopecks(it.discountRub || 0)) as Kopecks, 0 as Kopecks);
	const discountTotalRub = Math.round(discountTotalKopecks / 100);
	const bonusPointsKopecks = parseKopecks(bonusPointsDeductedRub || 0);
	const tierTotalKopecks = tier.totalKopecks || parseKopecks(tier.totalRub);
	const finalTotalKopecks = Math.max(0, tierTotalKopecks - bonusPointsKopecks) as Kopecks;
	const finalTotalRub = Math.round(finalTotalKopecks / 100);
	const todayRu = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
	const displayContractNumber = contractNumber || `D-${new Date().getFullYear()}-${patientId.slice(0, 6).toUpperCase()}`;

	const qrPayload = useMemo(() => generatePlanVerificationQrPayload({
		planId: displayContractNumber, planNumber: displayContractNumber, patientId, patientName, doctorFullName, totalAmountRub: finalTotalRub, tierTitle: tier.title, clinicName, clinicInn, clinicLicense, agreedAtIso: signedAgreement?.agreedAtIso || new Date().toISOString(),
	}), [displayContractNumber, patientId, patientName, doctorFullName, finalTotalRub, tier.title, clinicName, clinicInn, clinicLicense, signedAgreement]);

	const handleCopyForMessenger = () => {
		const lines = [`[Клиника]: ${clinicName}`, `[План лечения]: ${patientName}`, `[Выбранный вариант]: «${tier.title}»`, tier.materialsHeadline ? `[Материалы]: ${tier.materialsHeadline}` : "", `[Длительность]: ~${tier.durationWeeks} нед. (${tier.durationVisits} визитов)`, `[Гарантия клиники]: ${formatWarrantyYearsText(tier.warrantyYears)}`, "", "Клинические этапы:", ...activeStages.map((s, idx) => `  ${idx + 1}. ${s.title}: ${s.totalRub.toLocaleString("ru-RU")} ₽ (~${s.estimatedWeeks} нед.)`), "", `[Итоговая смета]: ${finalTotalRub.toLocaleString("ru-RU")} ₽`, `[Рассрочка клиники 0%]: ${(tier.installments?.[12]?.monthlyPaymentRub ?? Math.round(finalTotalRub / 12)).toLocaleString("ru-RU")} ₽/мес (на 12 мес)`, (tier.ndflRefundRub ?? 0) > 0 ? `[Налоговый вычет 13%]: до +${tier.ndflRefundRub.toLocaleString("ru-RU")} ₽ к возврату` : "", `[Лечащий врач]: ${doctorFullName}`, "Подготовлено в соответствии со ст. 20 323-ФЗ и протоколами СтАР."].filter(Boolean);
		if (typeof navigator !== "undefined" && navigator.clipboard) navigator.clipboard.writeText(lines.join("\n")).catch(() => {});
		setIsCopiedMessenger(true);
		setTimeout(() => setIsCopiedMessenger(false), 2500);
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 overflow-y-auto print:p-0 print:static print:bg-white print:inset-auto print:overflow-visible print:block print-layer" role="dialog" aria-modal="true" aria-label="Печатная форма Договора и сметы">
			<div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto print:max-h-none print:shadow-none print:border-none print:rounded-none print:w-full print:max-w-none print:bg-white print:text-black print:overflow-visible print:block">
				<TreatmentPlanContractPrintHeader viewMode={viewMode} setViewMode={setViewMode} isCopiedMessenger={isCopiedMessenger} onCopyForMessenger={handleCopyForMessenger} onClose={onClose} />
				<div className="relative p-6 sm:p-10 overflow-y-auto print:p-0 print:overflow-visible print:text-black print:bg-white bg-white text-slate-900 text-xs leading-relaxed space-y-6 premium-doc-sheet print-paper-sheet" data-paper-sheet>
					<div className="doc-watermark" aria-hidden="true" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(-32deg)", fontSize: signedAgreement ? "50pt" : "64pt", fontWeight: 900, color: signedAgreement ? "rgba(16, 185, 129, 0.045)" : "rgba(15, 23, 42, 0.045)", textTransform: "uppercase", letterSpacing: "0.12em", pointerEvents: "none", zIndex: 0, whiteSpace: "nowrap", userSelect: "none" }}>{signedAgreement ? "ПОДПИСАНО" : "ЧЕРНОВИК"}</div>
					<TreatmentPlanContractClinicPatientInfo clinicName={clinicName} clinicLegalName={clinicLegalName} clinicInn={clinicInn} clinicOgrn={clinicOgrn} clinicAddress={clinicAddress} clinicLicense={clinicLicense} displayContractNumber={displayContractNumber} todayRu={todayRu} qrPayload={qrPayload} doctorFullName={doctorFullName} patientName={patientName} patientBirthDate={patientBirthDate} patientId={patientId} patientPhone={patientPhone} tier={tier} />
					<TreatmentPlanContractServicesTable activeStages={activeStages} allItemsCount={allItems.length} viewMode={viewMode} showMicroConsumables={showMicroConsumables} setShowMicroConsumables={setShowMicroConsumables} />
					<TreatmentPlanContractFinancialSummary tier={tier} activeStages={activeStages} grossTotalRub={grossTotalRub} discountPercent={discountPercent} discountTotalRub={discountTotalRub} bonusPointsDeductedRub={bonusPointsDeductedRub} finalTotalKopecks={finalTotalKopecks} finalTotalRub={finalTotalRub} installmentMonths={installmentMonths} planAgeDays={planAgeDays} />
					<TreatmentPlanContractSignatures tier={tier} doctorFullName={doctorFullName} qrPayload={qrPayload} signedAgreement={signedAgreement} patientName={patientName} />
				</div>
			</div>
		</div>
	);
};

export default TreatmentPlanContractPrint;
