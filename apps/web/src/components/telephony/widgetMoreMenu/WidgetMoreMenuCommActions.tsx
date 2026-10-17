import {
	Copy,
	MessageSquare,
	Pause,
	PhoneForwarded,
} from "lucide-react";
import React from "react";

export interface WidgetMoreMenuCommActionsProps {
	onClose: () => void;
	onSendWhatsApp: () => void;
	onToggleTransferPanel: () => void;
	isHeld: boolean;
	onToggleHold: () => void;
	onCopyPhone: () => void;
}

export function WidgetMoreMenuCommActions({
	onClose,
	onSendWhatsApp,
	onToggleTransferPanel,
	isHeld,
	onToggleHold,
	onCopyPhone,
}: WidgetMoreMenuCommActionsProps) {
	return (
		<>
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
		</>
	);
}
