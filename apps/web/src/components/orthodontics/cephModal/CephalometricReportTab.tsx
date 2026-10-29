import { Check, Clipboard, FileText, MessageSquare, Printer, Save, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { showToast } from "../../GlobalToast";

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
	const [copiedMessenger, setCopiedMessenger] = useState(false);

	const handleCopyPatientMessengerText = async () => {
		try {
			const lines = currentEffectiveProtocolText.split("\n");
			const patientLine = lines.find((l) => l.includes("Пациент:")) || "";
			const diagnosisLines = lines.filter((l) => l.includes("Класс") || l.includes("SNA") || l.includes("ANB") || l.includes("Wits"));
			const summary = [
				"📊 РЕЗУЛЬТАТЫ ЦЕФАЛОМЕТРИЧЕСКОГО АНАЛИЗА ТРГ",
				"Стоматологическая клиника DENTE",
				patientLine,
				"",
				"Ключевые анатомические параметры:",
				...diagnosisLines.slice(0, 6),
				"",
				"Подробное заключение и протокол лечения зафиксированы в вашей медицинской карте.",
				"По всем вопросам обращайтесь к вашему лечащему ортодонту.",
			].filter(Boolean).join("\n");

			if (typeof navigator !== "undefined" && navigator.clipboard) {
				await navigator.clipboard.writeText(summary);
				setCopiedMessenger(true);
				showToast("Сводка ТРГ для пациента скопирована для WhatsApp/Telegram", "success");
				setTimeout(() => setCopiedMessenger(false), 2500);
			}
		} catch {
			showToast("Не удалось скопировать сводку", "error");
		}
	};

	return (
		<div className="flex-1 flex flex-col p-3 sm:p-4 overflow-y-auto bg-[var(--paper-soft)]">
			<div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
				<div className="flex items-center gap-2 min-w-0">
					<FileText size={20} className="text-teal-400 shrink-0" />
					<span className="text-sm font-bold text-[var(--ink)] min-w-0 break-words">
						Предпросмотр протокола для карты
					</span>
				</div>
				<div className="flex items-center gap-1.5 flex-wrap">
					<button
						type="button"
						onClick={handleCopyPatientMessengerText}
						data-testid="btn-copy-ceph-messenger"
						className="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-teal-300 flex items-center gap-1.5 transition-colors border border-teal-500/30 cursor-pointer shadow-xs"
						title="Скопировать понятную выжимку ТРГ для отправки пациенту в WhatsApp/Telegram"
					>
						{copiedMessenger ? <Check size={14} className="text-emerald-400" /> : <MessageSquare size={14} />}
						<span>{copiedMessenger ? "Скопировано" : "Для мессенджера"}</span>
					</button>
					<button
						type="button"
						onClick={() => {
							if (typeof window !== "undefined") window.print();
						}}
						data-testid="btn-print-ceph-protocol"
						className="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer shadow-xs"
						title="Распечатать протокол ТРГ для медицинской карты"
					>
						<Printer size={14} />
						<span>Печать</span>
					</button>
					<button
						type="button"
						onClick={onCopyText}
						className="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer shadow-xs"
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
					className="w-full h-11 py-2 px-4 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all cursor-pointer"
				>
					<Sparkles size={16} />
					<span>Вставить в ортодонтическую карту</span>
				</button>
				<button
					type="button"
					onClick={onSaveConsultationWithoutCeph}
					data-testid="tab3-save-consultation-without-ceph-btn"
					className="w-full h-9 py-1.5 px-3 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
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
