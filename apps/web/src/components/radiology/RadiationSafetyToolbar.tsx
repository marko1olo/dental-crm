import type { DentalRadiologyStudyType } from "@dental/shared";
import { Download, Plus, Printer } from "lucide-react";
import type React from "react";

export interface RadiationSafetyToolbarProps {
	onAddStudy: (type: DentalRadiologyStudyType, area: string) => void;
	onExportCsv: () => void;
	onPrintSanpin: () => void;
}

export const RadiationSafetyToolbar: React.FC<RadiationSafetyToolbarProps> = ({
	onAddStudy,
	onExportCsv,
	onPrintSanpin,
}) => {
	return (
		<div className="px-5 py-2.5 border-b border-[var(--line)] bg-[var(--paper-soft)] flex flex-wrap items-center justify-between gap-2 shrink-0">
			<div className="flex items-center gap-1.5 flex-wrap">
				<span className="text-xs text-[var(--muted)] font-medium mr-1">
					Добавить:
				</span>
				<button
					type="button"
					onClick={() =>
						onAddStudy("intraoral_radiovisiography", "Прицельный снимок")
					}
					className="h-9 min-h-[36px] px-3 rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)] hover:text-[var(--teal,#0d9488)] transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
					data-testid="btn-add-rvg-dose"
				>
					<Plus className="w-3.5 h-3.5" />
					<span>Визиография (~2 мкЗв)</span>
				</button>
				<button
					type="button"
					onClick={() =>
						onAddStudy("optg_digital_panoramic", "Панорамный обзор")
					}
					className="h-9 min-h-[36px] px-3 rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)] hover:text-[var(--teal,#0d9488)] transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
					data-testid="btn-add-optg-dose"
				>
					<Plus className="w-3.5 h-3.5" />
					<span>ОПТГ (~12 мкЗв)</span>
				</button>
				<button
					type="button"
					onClick={() => onAddStudy("cbct_segment_5x5", "Сегмент челюсти")}
					className="h-9 min-h-[36px] px-3 rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)] hover:text-[var(--teal,#0d9488)] transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
					data-testid="btn-add-cbct-dose"
				>
					<Plus className="w-3.5 h-3.5" />
					<span>КЛКТ (~35 мкЗв)</span>
				</button>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onExportCsv}
					className="h-9 min-h-[36px] px-3 rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
					data-testid="btn-export-csv"
					title="Экспорт журнала лучевой нагрузки в CSV"
				>
					<Download className="w-3.5 h-3.5" />
					<span>CSV</span>
				</button>
				<button
					type="button"
					onClick={onPrintSanpin}
					className="h-9 min-h-[36px] px-3.5 rounded-lg text-xs font-bold bg-[var(--teal,#0d9488)] text-white hover:opacity-90 transition-opacity shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
					data-testid="btn-print-sanpin-form"
					title="Печать официального листа лучевой нагрузки для надзорных органов"
				>
					<Printer className="w-3.5 h-3.5" />
					<span>Печать листа доз</span>
				</button>
			</div>
		</div>
	);
};
