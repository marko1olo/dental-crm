import { PhoneCall, X } from "lucide-react";
import React from "react";

export interface IncomingCallEmptyDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	isConnected: boolean;
}

export function IncomingCallEmptyDrawer({
	isOpen,
	onClose,
	isConnected,
}: IncomingCallEmptyDrawerProps) {
	if (!isOpen) return null;

	return (
		<section
			className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-[var(--paper-strong,var(--paper,#ffffff))] border-l border-[var(--line,#e2e8f0)] shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right"
			aria-label="Шторка телефонии"
			data-testid="telephony-drawer-empty-fallback"
		>
			<div className="shrink-0 p-4 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center">
						<PhoneCall size={16} />
					</div>
					<div>
						<h2 className="text-sm font-bold text-[var(--ink,#0f172a)] leading-tight">
							Шторка телефонии
						</h2>
						<span
							className="text-[10px] font-semibold text-[var(--muted,#64748b)] flex items-center gap-1 mt-0.5"
							data-testid="telephony-fallback-waiting-webhook"
						>
							<span
								className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}
							/>
							<span>
								{isConnected
									? "Шлюз АТС: Онлайн (WebSocket)"
									: "Шлюз АТС: Ожидание вебхука (UIS / Mango / Zadarma / Asterisk)"}
							</span>
						</span>
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-[var(--paper-soft,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center transition-all cursor-pointer"
					title="Закрыть боковую шторку (Esc)"
					aria-label="Закрыть шторку"
				>
					<X size={20} />
				</button>
			</div>
			<div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
				<div className="w-16 h-16 rounded-2xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center">
					<PhoneCall size={28} />
				</div>
				<div className="space-y-1.5 max-w-xs">
					<h3 className="text-base font-bold text-[var(--ink,#0f172a)]">
						Ожидание вебхука АТС UIS/Mango/Zadarma/Asterisk
					</h3>
					<p className="text-xs text-[var(--muted,#64748b)] leading-relaxed">
						Шлюз телефонии (UIS / Mango / Zadarma / Asterisk) подключен и
						ожидает входящих звонков. При поступлении вызова карточка пациента
						и быстрая запись откроются автоматически.
					</p>
				</div>
				<div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--paper-subtle,var(--paper-soft,#f1f5f9))] border border-[var(--line,#e2e8f0)] text-[11px] font-medium text-[var(--ink,#0f172a)]">
					<span
						className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-amber-500"}`}
					/>
					<span>Провайдер: UIS / Mango / Asterisk / Zadarma</span>
				</div>
			</div>
			<div className="shrink-0 p-3.5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] flex items-center justify-end">
				<button
					type="button"
					onClick={onClose}
					className="px-4 py-2.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#e2e8f0)] border border-[var(--line,#e2e8f0)] text-xs font-bold text-[var(--ink,#0f172a)] transition-all min-h-[44px] cursor-pointer"
				>
					Закрыть шторку
				</button>
			</div>
		</section>
	);
}
