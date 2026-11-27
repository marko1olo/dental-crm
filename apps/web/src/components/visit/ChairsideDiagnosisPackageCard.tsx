/**
 * ChairsideDiagnosisPackageCard.tsx
 * Instant clinical bundles checklist and 1-click billing & cashier export.
 */

import React from "react";
import { Check, Receipt } from "lucide-react";
import { money } from "../../AppHelpers";
import { countLabel } from "../../lib/russianPlural";
import {
	useDiagnosisPackage,
	type DiagnosisPackageCatalogItem,
	type DiagnosisPackageInvoicePayload,
} from "./useDiagnosisPackage.js";
import { ChairsidePackageHeader } from "./ChairsidePackageHeader.js";
import { ChairsidePackageServiceList } from "./ChairsidePackageServiceList.js";
import type { Cashier54FzBundleExport } from "@dental/shared";

export interface ChairsideDiagnosisPackageCardProps {
	selectedTooth: string | null;
	patientId?: string | null | undefined;
	visitId?: string | null | undefined;
	catalog?: readonly DiagnosisPackageCatalogItem[] | undefined;
	onApplyPackageToPlan?: ((formattedLines: string[], invoicePayload: DiagnosisPackageInvoicePayload) => void) | undefined;
	onExportDirectToCashier?: ((exportData: Cashier54FzBundleExport) => void) | undefined;
}

export const ChairsideDiagnosisPackageCard: React.FC<ChairsideDiagnosisPackageCardProps> = ({
	selectedTooth, patientId, visitId, catalog = [], onApplyPackageToPlan, onExportDirectToCashier,
}) => {
	const p = useDiagnosisPackage(selectedTooth, patientId, visitId, catalog, onApplyPackageToPlan, onExportDirectToCashier);

	return (
		<div
			data-testid="chairside-diagnosis-package-card"
			className="mb-3 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] shadow-xs"
		>
			<ChairsidePackageHeader
				activeBundle={p.activeBundle}
				selectedTooth={selectedTooth}
				onSelectBundle={(b) => {
					p.setActiveBundle(b);
					p.setCheckedCodes(new Set(b.services.map((s) => s.code804n)));
				}}
			/>

			<ChairsidePackageServiceList
				items={p.customized.items}
				onToggleCode={p.handleToggleCode}
			/>

			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-teal-200/50 dark:border-teal-800/40">
				<div className="text-xs text-slate-700 dark:text-slate-300">
					<span>
						Выбрано: <strong>{countLabel(p.customized.checkedCount, "услуга", "услуги", "услуг")}</strong>.
						Сумма:{" "}
						<strong className="text-sm font-mono text-emerald-600 dark:text-emerald-400 ml-1">
							{money(p.customized.totalRub)}
						</strong>{" "}
						<span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
							({p.customized.totalKopecks.toLocaleString("ru-RU")} коп.)
						</span>
					</span>
				</div>

				<div className="flex items-center gap-2 w-full sm:w-auto">
					<button
						type="button"
						onClick={p.handleApplyToPlan}
						data-testid="apply-diagnosis-bundle-btn"
						className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[36px] px-3.5 py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors shrink-0"
						title="Дописать выбранный пакет в карту приёма и передать в счёт"
					>
						<Check className="w-4 h-4 shrink-0" />
						Внести в карту и счёт ({money(p.customized.totalRub)})
					</button>

					<button
						type="button"
						onClick={p.handleExportToCashier}
						data-testid="export-diagnosis-bundle-cashier-btn"
						className="secondary-button flex-1 sm:flex-initial min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0"
						title="Передать пакет услуг в кассу с точным расчётом в копейках"
					>
						<Receipt className="w-4 h-4 shrink-0 text-[var(--ink-muted)]" />
						В кассу
					</button>
				</div>
			</div>
		</div>
	);
};
