import {
	Calendar,
	CalendarDays,
	Copy,
	MessageSquare,
	Pause,
	PhoneForwarded,
	UserPlus,
	Zap,
} from "lucide-react";
import React from "react";
import type { IncomingCallPayload } from "../../store/telephonyStore";
import type { CallAttribution } from "./telephonyAttribution";

export interface TelephonyWidgetMoreMenuProps {
	isOpen: boolean;
	onClose: () => void;
	activeCall: IncomingCallPayload | null;
	// biome-ignore lint/suspicious/noExplicitAny: patient like compatibility
	resolvedPatient: any | null;
	callAttribution: CallAttribution | null;
	isCapturingLead: boolean;
	onCaptureLead: () => void;
	onQuickBook: (slot: "urgent" | "consultation" | "tomorrow") => void;
	isCreatingPatient: boolean;
	onQuickCreatePatient: () => void;
	onSendWhatsApp: () => void;
	onToggleTransferPanel: () => void;
	isHeld: boolean;
	onToggleHold: () => void;
	onCopyPhone: () => void;
}

export function TelephonyWidgetMoreMenu({
	isOpen,
	onClose,
	activeCall,
	resolvedPatient,
	callAttribution,
	isCapturingLead,
	onCaptureLead,
	onQuickBook,
	isCreatingPatient,
	onQuickCreatePatient,
	onSendWhatsApp,
	onToggleTransferPanel,
	isHeld,
	onToggleHold,
	onCopyPhone,
}: TelephonyWidgetMoreMenuProps) {
	if (!isOpen) return null;

	return (
		<div
			className="absolute right-0 bottom-full mb-1.5 w-64 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line-strong,var(--line,#e2e8f0))] shadow-2xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 space-y-0.5"
			data-testid="widget-more-menu-dropdown"
		>
			{!resolvedPatient && callAttribution && (
				<button
					type="button"
					onClick={() => {
						onCaptureLead();
						onClose();
					}}
					disabled={isCapturingLead || activeCall?.isLeadCaptured}
					className="w-full text-left px-2.5 py-2 rounded-lg bg-[var(--teal-surface)] hover:opacity-90 text-[var(--teal)] font-bold flex items-center gap-2 transition-colors cursor-pointer border border-[var(--teal-soft)] mb-1"
					data-testid="widget-action-capture-lead"
					title={`1-Клик захват в лиды с авторазметкой канала (${callAttribution.channelLabel})`}
				>
					<UserPlus size={14} className="text-[var(--teal)] shrink-0" />
					<span className="truncate">
						{activeCall?.isLeadCaptured
							? "Лид захвачен"
							: isCapturingLead
								? "Захват лида..."
								: `В лиды: ${callAttribution.channelLabel}`}
					</span>
				</button>
			)}

			<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
				Слоты быстрой записи:
			</div>

			<button
				type="button"
				onClick={() => {
					onQuickBook("urgent");
					onClose();
				}}
				className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-200 font-medium flex items-center gap-2 transition-colors cursor-pointer"
				data-testid="widget-action-cito"
			>
				<Zap size={13} className="text-amber-500 shrink-0" />
				<span>Острая боль (10:00)</span>
			</button>

			<button
				type="button"
				onClick={() => {
					onQuickBook("consultation");
					onClose();
				}}
				className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--teal-surface)] text-[var(--teal)] font-medium flex items-center gap-2 transition-colors cursor-pointer"
			>
				<Calendar size={13} className="text-[var(--teal)] shrink-0" />
				<span>Консультация (15:00)</span>
			</button>

			<button
				type="button"
				onClick={() => {
					onQuickBook("tomorrow");
					onClose();
				}}
				className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] font-medium flex items-center gap-2 transition-colors cursor-pointer"
			>
				<CalendarDays size={13} className="text-slate-500 shrink-0" />
				<span>Завтра (11:00)</span>
			</button>

			{!resolvedPatient && activeCall && (
				<button
					type="button"
					onClick={() => {
						onQuickCreatePatient();
						onClose();
					}}
					className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2 transition-colors cursor-pointer"
				>
					<UserPlus size={13} className="text-emerald-600 shrink-0" />
					<span>
						{isCreatingPatient
							? "Создание пациента..."
							: "1-Click создание пациента"}
					</span>
				</button>
			)}

			<div className="my-1 border-t border-[var(--line,#e2e8f0)]" />

			<button
				type="button"
				onClick={() => {
					onSendWhatsApp();
					onClose();
				}}
				className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2 transition-colors cursor-pointer"
			>
				<MessageSquare size={13} className="text-emerald-600 shrink-0" />
				<span>1-Click WhatsApp</span>
			</button>

			<button
				type="button"
				onClick={() => {
					onToggleTransferPanel();
					onClose();
				}}
				className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] font-medium flex items-center gap-2 transition-colors cursor-pointer"
			>
				<PhoneForwarded size={13} className="text-[var(--teal)] shrink-0" />
				<span>Перевод на врача</span>
			</button>

			<button
				type="button"
				onClick={() => {
					onToggleHold();
					onClose();
				}}
				className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] font-medium flex items-center gap-2 transition-colors cursor-pointer"
			>
				<Pause size={13} className="text-amber-500 shrink-0" />
				<span>{isHeld ? "Снять с удержания" : "Поставить на удержание"}</span>
			</button>

			<button
				type="button"
				onClick={() => {
					onCopyPhone();
					onClose();
				}}
				className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] font-medium flex items-center gap-2 transition-colors cursor-pointer"
			>
				<Copy size={13} className="text-[var(--muted,#64748b)] shrink-0" />
				<span>Копировать номер</span>
			</button>
		</div>
	);
}
