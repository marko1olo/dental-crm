/**
 * TreatmentPlanCompletedActPrint.tsx — Тонкий фасад печатной формы Акта сдачи-приемки
 * выполненных стоматологических работ и Накладной на списание ТМЦ.
 * Оформлен в журнальной полиграфической типографике согласно стандартам Минздрава РФ (Приказ 804н),
 * Постановлению Правительства РФ № 736 и ГОСТ Р 7.0.97-2016.
 * Декомпозирован в соответствии с Мандатом 8b (лимит строго <= 120 строк).
 */

import React from "react";
import { createPortal } from "react-dom";
import "../../styles/premium-document-print.css";
import { TreatmentPlanActMaterialsTable } from "./TreatmentPlanActMaterialsTable";
import {
	ActPrintActionBar,
	ActPrintFinancialSummary,
	ActPrintHeader,
	ActPrintServicesTable,
	ActPrintSignaturesAndLegal,
	ActPrintWatermark,
	type TreatmentPlanActPrintData,
	type TreatmentPlanCompletedActPrintProps,
	useTreatmentPlanCompletedActData,
} from "./completedActPrint";

export { TreatmentPlanActHeader } from "./TreatmentPlanActHeader";
export { TreatmentPlanActMaterialsTable } from "./TreatmentPlanActMaterialsTable";
export { TreatmentPlanActSignatures } from "./TreatmentPlanActSignatures";
export {
	formatMoneyExact,
	numberToWordsRu,
	pluralizeRu,
} from "./treatmentPlanActFormatters";
export type { TreatmentPlanActPrintData, TreatmentPlanCompletedActPrintProps };
export * from "./completedActPrint";

export const TreatmentPlanCompletedActPrint: React.FC<
	TreatmentPlanCompletedActPrintProps
> = (props) => {
	const { isOpen, actData } = props;
	const data = useTreatmentPlanCompletedActData(props);

	if (!isOpen) return null;

	const modalNode = (
		<div
			className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-md flex items-start justify-center p-2 sm:p-6 py-6 sm:py-8 print:p-0 print:static print:bg-white print:inset-auto print:overflow-visible print:block"
			data-testid="treatment-completed-act-print-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Печатная форма акта сдачи-приемки оказанных стоматологических услуг"
		>
			<div className="relative w-full max-w-5xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-slate-100 rounded-3xl shadow-2xl overflow-hidden border border-[var(--line,#cbd5e1)] dark:border-slate-800 print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:bg-white print:text-black">
				<ActPrintActionBar {...data.actionBarProps} />

				<div className="p-3 sm:p-6 lg:p-8 bg-slate-200/60 dark:bg-slate-950 flex justify-center overflow-x-auto print:p-0 print:bg-transparent print:overflow-visible">
					<div
						className={`premium-doc-sheet print-paper-sheet bg-white text-slate-900 doc-palette-${data.branding.brandAccentColor} doc-density-${data.branding.layoutDensity} doc-font-${data.branding.fontFamily} p-4 sm:p-8 md:p-12 print:p-0 relative`}
						data-paper-sheet
						style={
							{
								"--doc-primary": data.palette.primary,
								"--doc-primary-dark": data.palette.primaryDark,
								"--doc-soft-bg": data.palette.softBg,
								"--doc-accent-border": data.palette.accentBorder,
								"--doc-border": "#cbd5e1",
								"--doc-ink": "#0f172a",
								"--doc-muted": "#475569",
								"--doc-paper": "#ffffff",
							} as React.CSSProperties
						}
					>
						<ActPrintWatermark status={actData.status} />
						<ActPrintHeader {...data.headerProps} />
						<ActPrintServicesTable {...data.servicesTableProps} />
						<TreatmentPlanActMaterialsTable
							actData={actData}
							palette={data.palette}
							netMaterialRub={data.netMaterialRub}
							netMaterialKopecks={data.netMaterialKopecks}
							materialsInWords={data.materialsInWords}
							hasDeficit={data.hasDeficit}
						/>
						<ActPrintFinancialSummary {...data.financialSummaryProps} />
						<ActPrintSignaturesAndLegal {...data.signaturesProps} />
					</div>
				</div>
			</div>
		</div>
	);

	if (typeof document !== "undefined" && document.body) {
		return createPortal(modalNode, document.body);
	}
	return modalNode;
};

