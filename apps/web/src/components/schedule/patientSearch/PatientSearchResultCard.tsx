import React from "react";
import { CalendarPlus, CreditCard, FileText, MessageSquare, Phone, Sparkles, User } from "lucide-react";
import type { QuickPatientSearchResult, SearchablePatient } from "../patientSearchEngine";
import { RenderHighlightedParts } from "./PatientSearchHighlightedParts";
import { openWhatsAppChat } from "../../../store/telephonyStore";

interface Props {
	item: QuickPatientSearchResult;
	isSelected: boolean;
	onSelect: () => void;
	onHover: () => void;
	onOpenCard?: (id: string) => void;
	notify: (msg: string, type: "info" | "warning" | "error" | "success") => void;
}

export const PatientSearchResultCard: React.FC<Props> = ({
	item, isSelected, onSelect, onHover, onOpenCard, notify,
}) => {
	const { patient } = item;
	const balance = typeof (patient as any).balanceRub === "number" ? (patient as any).balanceRub : 0;
	const cardNum = (patient as SearchablePatient).cardNumber || (patient as any).cardNumber;

	return (
		<div
			onClick={onSelect}
			onMouseEnter={onHover}
			className={`patient-search-item p-3 rounded-xl transition-all cursor-pointer flex flex-wrap items-center justify-between gap-3 ${
				isSelected ? "bg-[var(--teal-soft,var(--paper-soft))] border border-[var(--teal,var(--brand-primary))]/30 shadow-xs" : "hover:bg-[var(--paper-soft)]"
			}`}
			style={{ contentVisibility: "auto", containIntrinsicSize: "1px 48px" }}
			data-testid={`patient-search-result-${patient.id}`}
		>
			<div className="space-y-1 min-w-0 flex-1">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-sm font-bold text-[var(--ink)] flex items-center gap-1.5 truncate">
						<User className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
						<RenderHighlightedParts parts={item.fullNameHighlights} />
					</span>
					{item.isFuzzy && (
						<span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 shrink-0 inline-flex items-center gap-1" title="Возможно опечатка в запросе" data-testid="fuzzy-match-badge">
							<Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
							<span>Возможно, вы имели в виду: {item.suggestedName || patient.fullName}</span>
						</span>
					)}
					{balance < 0 ? (
						<span className="px-2 py-0.5 rounded-lg text-xs font-bold font-mono bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40 shrink-0" title="Задолженность">
							Долг: {Math.abs(balance).toLocaleString("ru-RU")} ₽
						</span>
					) : balance > 0 ? (
						<span className="px-2 py-0.5 rounded-lg text-xs font-bold font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 shrink-0" title="Аванс">
							Аванс: {balance.toLocaleString("ru-RU")} ₽
						</span>
					) : null}
				</div>
				<div className="flex items-center gap-3 text-xs text-[var(--muted)] flex-wrap">
					{patient.phone ? (
						<span className="font-mono flex items-center gap-1">
							<Phone className="w-3 h-3 text-slate-400 shrink-0" />
							<RenderHighlightedParts parts={item.phoneHighlights} />
						</span>
					) : <span className="text-slate-400">Нет телефона</span>}
					{patient.birthDate && <span>{new Date(patient.birthDate).toLocaleDateString("ru-RU")}</span>}
					{(cardNum || item.cardHighlights) && (
						<span className="flex items-center gap-1 font-mono">
							<CreditCard className="w-3 h-3 text-slate-400" />
							{item.cardHighlights ? <RenderHighlightedParts parts={item.cardHighlights} /> : `№${cardNum}`}
						</span>
					)}
				</div>
			</div>
			<div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
				<button
					type="button"
					data-testid={`quick-wa-patient-${patient.id}`}
					onClick={() => {
						if (patient.phone) openWhatsAppChat(patient.phone, "Здравствуйте! Напоминаем о записи в стоматологию.");
						else notify("У пациента не указан номер телефона. Заполните телефон в карточке пациента.", "warning");
					}}
					className={`h-9 min-h-[44px] min-w-[44px] px-2.5 rounded-xl border flex items-center justify-center transition-all shrink-0 cursor-pointer active:scale-95 ${
						patient.phone ? "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300" : "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300"
					}`}
					title={patient.phone ? "WhatsApp напоминание" : "Номер телефона не указан (нажмите для подсказки)"}
					aria-label="WhatsApp напоминание"
				>
					<MessageSquare className="w-4 h-4" />
				</button>
				<button
					type="button"
					data-testid={`quick-open-card-${patient.id}`}
					onClick={() => onOpenCard?.(patient.id)}
					className="h-9 min-h-[36px] min-w-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0"
					title="Открыть карту"
					aria-label="Открыть карту"
				>
					<FileText className="w-4 h-4" />
					<span className="hidden sm:inline">Открыть карту</span>
				</button>
				<button
					type="button"
					data-testid={`quick-book-patient-${patient.id}`}
					onClick={onSelect}
					className="h-9 min-h-[36px] min-w-[44px] px-4 rounded-xl bg-[var(--teal,var(--brand-primary))] hover:bg-[var(--teal-dark,var(--brand-primary))] active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
					title="+ Записать на приём"
					aria-label="+ Записать на приём"
				>
					<CalendarPlus className="w-4 h-4" />
					<span>+ Записать на приём</span>
				</button>
			</div>
		</div>
	);
};
