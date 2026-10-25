import { Check, Clipboard, FileText, Printer, Save, Sparkles } from "lucide-react";
import React from "react";

export {
	CephalometricMeasurementsCategories,
	type CephalometricMeasurementsCategoriesProps,
} from "./CephalometricMeasurementsCategories";

export {
	CephalometricMobileAccordion,
	type CephalometricMobileAccordionProps,
} from "./CephalometricMobileAccordion";

export {
	CephalometricPresetsBar,
	type CephalometricPresetsBarProps,
} from "./CephalometricPresetsBar";

export {
	CephalometricLandmarksList,
	type CephalometricLandmarksListProps,
} from "./CephalometricLandmarksList";

export {
	CephalometricMobileNav,
	type CephalometricMobileNavProps,
} from "./CephalometricMobileNav";

export interface CephalometricReportTabProps {
	readonly currentEffectiveProtocolText: string;
	readonly onInsertToChart: () => void;
	readonly onSaveConsultationWithoutCeph: () => void;
	readonly onCopyText: () => void;
	readonly copied: boolean;
}

export function CephalometricReportTab({
	currentEffectiveProtocolText,
	onInsertToChart,
	onSaveConsultationWithoutCeph,
	onCopyText,
	copied,
}: CephalometricReportTabProps) {
	return (
		<div className="flex-1 flex flex-col p-3 sm:p-4 overflow-y-auto bg-[var(--paper-soft)]">
			<div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
				<div className="flex items-center gap-2 min-w-0">
					<FileText size={20} className="text-teal-400 shrink-0" />
					<span className="text-sm font-bold text-[var(--ink)] min-w-0 break-words">
						Предпросмотр протокола для карты
					</span>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => {
							if (typeof window !== "undefined") window.print();
						}}
						data-testid="btn-print-ceph-protocol"
						className="h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-[13px] font-medium text-slate-200 flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer shadow-xs"
						title="Распечатать протокол ТРГ для медицинской карты"
					>
						<Printer size={14} />
						<span>Печать заключения</span>
					</button>
					<button
						type="button"
						onClick={onCopyText}
						className="h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-[13px] font-medium text-slate-200 flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer shadow-xs"
					>
						{copied ? <Check size={14} className="text-emerald-400" /> : <Clipboard size={14} />}
						<span>{copied ? "Скопировано" : "Копировать"}</span>
					</button>
				</div>
			</div>

			<textarea
				readOnly
				value={currentEffectiveProtocolText}
				aria-label="Текст протокола ТРГ для медицинской карты"
				className="flex-1 min-h-[320px] p-4 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs sm:text-sm text-slate-200 resize-none outline-none focus:border-teal-400 leading-relaxed shadow-inner"
			/>

			<div className="mt-3 pt-3 border-t border-slate-800 flex flex-col gap-2">
				<button
					type="button"
					onClick={onInsertToChart}
					className="w-full h-10 py-2 px-4 rounded-lg bg-[var(--teal,#0d9488)] hover:brightness-105 text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
				>
					<Sparkles size={16} />
					<span>Вставить в ортодонтическую карту</span>
				</button>
				<button
					type="button"
					onClick={onSaveConsultationWithoutCeph}
					data-testid="tab3-save-consultation-without-ceph-btn"
					className="w-full h-9 py-1.5 px-3 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 font-semibold text-[13px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
				>
					<Save size={15} />
					<span>Сохранить консультацию без полного ТРГ-расчета</span>
				</button>
				<p className="text-xs text-slate-400 text-center m-0 min-w-0 break-words">
					Текст и угловые расчеты будут добавлены в дневник приёма и историю болезни пациента
				</p>
			</div>
		</div>
	);
}
