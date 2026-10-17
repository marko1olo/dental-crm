import React from "react";
import { FileCheck2, FileText, Printer } from "lucide-react";

export interface PrintViewToolbarProps {
	readonly printDocFormat: "patient_friendly" | "official_appendix";
	readonly setPrintDocFormat: (format: "patient_friendly" | "official_appendix") => void;
	readonly showMicroConsumables: boolean;
	readonly setShowMicroConsumables: (val: boolean) => void;
	readonly onOpenFastPrint: () => void;
}

export const PrintViewToolbar: React.FC<PrintViewToolbarProps> = ({
	printDocFormat,
	setPrintDocFormat,
	showMicroConsumables,
	setShowMicroConsumables,
	onOpenFastPrint,
}) => {
	return (
		<div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--line)] no-print flex-wrap gap-2">
			<div className="flex items-center gap-2 text-[var(--ink)]">
				<FileText size={18} />
				<span className="font-bold text-sm">
					{printDocFormat === "patient_friendly"
						? "Понятная смета для пациента (крупные блоки, без шелухи)"
						: "Официальное Приложение №1 к Договору (Постановление Правительства РФ № 736)"}
				</span>
			</div>
			<div className="flex items-center gap-2 flex-wrap">
				<div className="inline-flex p-0.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs">
					<button
						type="button"
						onClick={() => setPrintDocFormat("patient_friendly")}
						className={`min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
							printDocFormat === "patient_friendly"
								? "bg-[var(--paper-strong)] text-teal-800 dark:text-teal-200 shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="print-format-patient-btn"
					>
						<FileText size={13} className="shrink-0" />
						<span>Смета для пациента</span>
					</button>
					<button
						type="button"
						onClick={() => setPrintDocFormat("official_appendix")}
						className={`min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
							printDocFormat === "official_appendix"
								? "bg-[var(--paper-strong)] text-teal-800 dark:text-teal-200 shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="print-format-official-btn"
					>
						<FileCheck2 size={13} className="shrink-0" />
						<span>Приложение №1 (Официальная смета)</span>
					</button>
				</div>

				{printDocFormat === "official_appendix" && (
					<button
						type="button"
						onClick={() => setShowMicroConsumables(!showMicroConsumables)}
						className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[var(--line)] text-xs font-semibold text-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors inline-flex items-center justify-center"
						title="Скрывать мелкие расходные материалы для чистоты сметы"
					>
						{showMicroConsumables ? "Скрыть микро-расходники" : "Детализировать микро-расходники"}
					</button>
				)}

				<button
					type="button"
					onClick={onOpenFastPrint}
					className="btn-treatment-action cursor-pointer bg-teal-600 hover:bg-teal-700 text-white"
					data-testid="btn-fast-vector-print-estimate"
					title="Быстрая векторная печать сметы (0 мс, без зависаний Celeron)"
				>
					<Printer size={16} />
					<span>Векторная печать (0 мс)</span>
				</button>
				<button
					type="button"
					onClick={() => window.print()}
					className="btn-treatment-action btn-patient-choice cursor-pointer"
					data-testid="trigger-print-btn"
				>
					<Printer size={16} />
					<span>Печать сметы (Ctrl+P)</span>
				</button>
			</div>
		</div>
	);
};
