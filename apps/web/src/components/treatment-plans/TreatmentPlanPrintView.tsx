/**
 * TreatmentPlanPrintView.tsx — Печатная форма сметы и плана лечения А4 (DENTE CRM).
 * Декомпозирован строго по Мандату 8b (лимит строк <= 120).
 */

import React from "react";
import type { TreatmentPlanStage, TreatmentPlanTier } from "./types";
import { formatPlanPriceRub } from "./planPricing";
import "../../styles/premium-document-print.css";
import { PrintViewToolbar } from "./printView/PrintViewToolbar";
import { PrintViewHeader } from "./printView/PrintViewHeader";
import { PrintViewStagesTable } from "./printView/PrintViewStagesTable";
import { PrintViewFooterAndSignatures } from "./printView/PrintViewFooterAndSignatures";

export interface TreatmentPlanPrintViewProps {
	readonly tier?: TreatmentPlanTier | undefined;
	readonly stages: readonly TreatmentPlanStage[];
	readonly patientName: string;
	readonly patientBirthDate?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientId?: string | undefined;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly clinicLicense?: string | undefined;
	readonly planNumber?: string | undefined;
	readonly isDraft?: boolean | undefined;
	readonly isSigned?: boolean | undefined;
	readonly onPrint?: (() => void) | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly className?: string | undefined;
}

export const TreatmentPlanPrintView: React.FC<TreatmentPlanPrintViewProps> = (props) => {
	const {
		tier, stages, patientName, patientBirthDate, patientPhone, patientId,
		doctorFullName, doctorSpecialty = "Врач-стоматолог", clinicName = "Стоматологическая клиника DENTE",
		clinicLegalName = "ООО «ДЕНТЕ КЛИНИК»", clinicInn = "7701234567", clinicAddress = "г. Москва, ул. Клиническая, д. 10",
		clinicPhone = "+7 (495) 000-00-00", clinicLicense = "ЛО-77-01-012345", planNumber,
		isDraft = true, isSigned = false, onPrint, onClose, className = "",
	} = props;

	const [isCopied, setIsCopied] = React.useState(false);
	const effectivePlanNumber = planNumber || (patientId ? `ПЛАН-${patientId.slice(0, 6).toUpperCase()}` : "ПЛАН-001");
	const todayRu = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
	const activeStages = stages.filter((s) => s.items && s.items.length > 0);
	const displayedStages = activeStages.length > 0 ? activeStages : stages;
	const grandTotalRub = displayedStages.reduce((sum, s) => sum + (s.totalRub || 0), 0);
	const grandTotalFormatted = formatPlanPriceRub(tier?.totalRub ?? grandTotalRub);
	const watermarkText = isSigned ? "УТВЕРЖДЁН И ПОДПИСАН" : isDraft ? "ЧЕРНОВИК" : "ПЛАН ЛЕЧЕНИЯ";

	const handlePrint = () => {
		if (onPrint) onPrint();
		else if (typeof window !== "undefined") window.print();
	};

	const handleCopyEstimate = () => {
		const lines = [
			`[Клиника]: ${clinicName}`, `[Пациент]: ${patientName}`, `[План лечения]: ${effectivePlanNumber} от ${todayRu}`,
			tier?.title ? `[Сценарий]: ${tier.title}` : "", "", "Клинические этапы:",
			...displayedStages.map((s, idx) => `  Этап ${idx + 1}. ${s.title}: ${(s.totalRub || 0).toLocaleString("ru-RU")} ₽`),
			"", `[Итоговая смета]: ${grandTotalFormatted}`, `[Лечащий врач]: ${doctorFullName} (${doctorSpecialty})`,
			"Составлено в DENTE CRM. Цены зафиксированы по гарантии сметы.",
		].filter(Boolean);

		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(lines.join("\n")).catch(() => {});
			setIsCopied(true);
			setTimeout(() => setIsCopied(false), 2500);
		}
	};

	return (
		<div className={`treatment-plan-print-view w-full max-w-4xl mx-auto bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none print:w-full print:max-w-none print:p-0 ${className}`.trim()} data-testid="treatment-plan-print-view">
			<PrintViewToolbar effectivePlanNumber={effectivePlanNumber} isDraft={isDraft} isSigned={isSigned} isCopied={isCopied} onCopyEstimate={handleCopyEstimate} onPrint={handlePrint} onClose={onClose} />
			<div className="relative p-8 sm:p-12 text-slate-900 bg-white leading-relaxed space-y-6 print:p-0" style={{ minHeight: "297mm" }}>
				<div aria-hidden="true" style={{ position: "absolute", top: "45%", left: "50%", transform: "translate(-50%, -50%) rotate(-30deg)", fontSize: isSigned ? "46pt" : "56pt", fontWeight: 900, color: isSigned ? "rgba(16, 185, 129, 0.04)" : "rgba(15, 23, 42, 0.035)", letterSpacing: "0.15em", pointerEvents: "none", zIndex: 0, whiteSpace: "nowrap", userSelect: "none" }}>
					{watermarkText}
				</div>
				<PrintViewHeader clinicName={clinicName} clinicLegalName={clinicLegalName} clinicInn={clinicInn} clinicAddress={clinicAddress} clinicPhone={clinicPhone} clinicLicense={clinicLicense} effectivePlanNumber={effectivePlanNumber} todayRu={todayRu} patientName={patientName} patientBirthDate={patientBirthDate} patientPhone={patientPhone} doctorFullName={doctorFullName} doctorSpecialty={doctorSpecialty} />
				<PrintViewStagesTable displayedStages={displayedStages} />
				<PrintViewFooterAndSignatures grandTotalFormatted={grandTotalFormatted} doctorFullName={doctorFullName} patientName={patientName} />
			</div>
		</div>
	);
};

export default TreatmentPlanPrintView;
