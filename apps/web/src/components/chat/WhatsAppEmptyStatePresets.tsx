import { Calendar, CalendarCheck, FileText, MessageSquare } from "lucide-react";
import type { QuickTemplateItem } from "./whatsAppChatTemplates";

export interface WhatsAppEmptyStatePresetsProps {
	effectiveName: string;
	quickTemplates: QuickTemplateItem[];
	onApplyTemplate: (tmpl?: QuickTemplateItem) => void;
}

/**
 * Clean Empty State with Quick Medical Presets (Mandate 8k & 8e)
 */
export function WhatsAppEmptyStatePresets({
	effectiveName,
	quickTemplates,
	onApplyTemplate,
}: WhatsAppEmptyStatePresetsProps) {
	return (
		<div className="my-auto flex flex-col items-center justify-center text-center p-4 sm:p-6 max-w-md mx-auto w-full animate-fade-in">
			<div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3 shadow-inner">
				<MessageSquare size={26} />
			</div>
			<h4 className="text-sm sm:text-base font-bold text-[var(--ink,#f8fafc)] mb-1">
				История переписки пуста
			</h4>
			<p className="text-xs text-[var(--muted,#94a3b8)] leading-relaxed mb-4">
				Здесь будут отображаться реальные сообщения диалога с пациентом {effectiveName}. Выберите быстрый клинический шаблон для начала общения:
			</p>
			<div className="flex flex-col gap-2 w-full">
				{/* Preset 1: Напоминание о приёме */}
				<button
					type="button"
					onClick={() => onApplyTemplate(quickTemplates[0])}
					className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[var(--paper-soft,#1e293b)] hover:bg-teal-50 dark:hover:bg-teal-950/40 text-[var(--ink)] hover:text-teal-700 dark:hover:text-teal-300 border border-[var(--line,#334155)] hover:border-teal-500/50 text-xs font-semibold flex items-center gap-2.5 transition-all text-left group active:scale-[0.99]"
				>
					<span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 group-hover:bg-teal-500/20">
						<Calendar size={16} />
					</span>
					<div className="min-w-0 flex-1">
						<div className="font-bold">Напоминание о приёме</div>
						<div className="text-[11px] text-[var(--muted,#94a3b8)] truncate font-normal">
							Напоминание о запланированном визите и времени
						</div>
					</div>
				</button>

				{/* Preset 2: Рекомендации после удаления */}
				<button
					type="button"
					onClick={() => onApplyTemplate(quickTemplates[1])}
					className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[var(--paper-soft,#1e293b)] hover:bg-amber-50 dark:hover:bg-amber-950/40 text-[var(--ink)] hover:text-amber-700 dark:hover:text-amber-300 border border-[var(--line,#334155)] hover:border-amber-500/50 text-xs font-semibold flex items-center gap-2.5 transition-all text-left group active:scale-[0.99]"
				>
					<span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20">
						<FileText size={16} />
					</span>
					<div className="min-w-0 flex-1">
						<div className="font-bold">Рекомендации после удаления</div>
						<div className="text-[11px] text-[var(--muted,#94a3b8)] truncate font-normal">
							Послеоперационный режим, гемостаз и уход
						</div>
					</div>
				</button>

				{/* Preset 3: Подтверждение визита */}
				<button
					type="button"
					onClick={() => onApplyTemplate(quickTemplates[2])}
					className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[var(--paper-soft,#1e293b)] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[var(--ink)] hover:text-emerald-700 dark:hover:text-emerald-300 border border-[var(--line,#334155)] hover:border-emerald-500/50 text-xs font-semibold flex items-center gap-2.5 transition-all text-left group active:scale-[0.99]"
				>
					<span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20">
						<CalendarCheck size={16} />
					</span>
					<div className="min-w-0 flex-1">
						<div className="font-bold">Подтверждение визита</div>
						<div className="text-[11px] text-[var(--muted,#94a3b8)] truncate font-normal">
							Запрос подтверждения записи ответным сообщением
						</div>
					</div>
				</button>
			</div>
		</div>
	);
}
