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
					style={{
						height: 36,
						minHeight: 36,
						padding: "0 12px",
						borderRadius: 8,
						border: "1px solid var(--line)",
						background: "var(--surface)",
						color: "var(--ink)",
						fontSize: 12,
						fontWeight: 600,
						cursor: "pointer",
					}}
					title="Выгрузить реестр оказанных услуг ДМС в XML для страховых компаний"
				>
					Реестр ДМС (XML)
				</button>
				<button
					type="button"
					onClick={() => onExportRegistry("csv")}
					style={{
						height: 36,
						minHeight: 36,
						padding: "0 12px",
						borderRadius: 8,
						border: "1px solid var(--line)",
						background: "var(--surface)",
						color: "var(--ink)",
						fontSize: 12,
						fontWeight: 600,
						cursor: "pointer",
					}}
					title="Выгрузить реестр оказанных услуг ДМС в CSV для бухгалтерии"
				>
					Реестр ДМС (CSV)
				</button>
				<button
					type="button"
					className="primary-button cursor-pointer"
					onClick={onOpenAddModal}
					style={{
						height: 36,
						minHeight: 36,
						padding: "0 14px",
						borderRadius: 8,
						fontSize: 12,
						fontWeight: 600,
						display: "inline-flex",
						alignItems: "center",
						gap: 6,
					}}
				>
					<Plus size={15} /> Добавить договор
				</button>
			</div>
		</div>
	);
};
