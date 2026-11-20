/**
 * apps/web/src/components/settings/insuranceModules/InsuranceContractsHeader.tsx
 *
 * Header component for DMS Insurance Contracts Panel with Registry Export actions.
 * Compliant with Apple HIG touch targets (>= 36px/44px).
 */

import { Plus, ShieldCheck } from "lucide-react";
import type React from "react";

interface InsuranceContractsHeaderProps {
	onExportRegistry: (format: "xml" | "csv") => void;
	onOpenAddModal: () => void;
}

export const InsuranceContractsHeader: React.FC<InsuranceContractsHeaderProps> = ({
	onExportRegistry,
	onOpenAddModal,
}) => {
	return (
		<div className="flex justify-between items-center mb-4 flex-wrap gap-3" data-testid="insurance-contracts-header">
			<div className="min-w-0 flex-1">
				<h2
					className="m-0 text-lg font-bold flex items-center gap-2"
					style={{ color: "var(--ink)" }}
				>
					<ShieldCheck size={20} style={{ color: "var(--teal, #0d9488)" }} />
					<span>Договоры ДМС</span>
				</h2>
				<p className="mt-1 mb-0 text-xs" style={{ color: "var(--muted)" }}>
					Страховые компании, процент покрытия по категориям, франшиза и гарантийные письма пациентов.
				</p>
			</div>
			<div className="flex items-center gap-2 shrink-0 flex-wrap">
				<button
					type="button"
					onClick={() => onExportRegistry("xml")}
					className="dente-btn-secondary h-9 px-3.5 rounded-lg text-sm font-medium inline-flex items-center justify-center shrink-0 cursor-pointer"
					title="Выгрузить реестр оказанных услуг ДМС в XML для страховых компаний"
				>
					Реестр ДМС (XML)
				</button>
				<button
					type="button"
					onClick={() => onExportRegistry("csv")}
					className="dente-btn-secondary h-9 px-3.5 rounded-lg text-sm font-medium inline-flex items-center justify-center shrink-0 cursor-pointer"
					title="Выгрузить реестр оказанных услуг ДМС в CSV для бухгалтерии"
				>
					Реестр ДМС (CSV)
				</button>
				<button
					type="button"
					className="dente-btn-primary h-9 px-3.5 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
					onClick={onOpenAddModal}
				>
					<Plus className="w-4 h-4 shrink-0" />
					<span>Добавить договор</span>
				</button>
			</div>
		</div>
	);
};
