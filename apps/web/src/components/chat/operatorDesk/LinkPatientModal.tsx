import React from "react";
import { Check, RefreshCw, UserCheck, X } from "lucide-react";
import type { InboxConversation } from "./types";

export interface LinkPatientModalProps {
	isOpen: boolean;
	activeConv: InboxConversation | null;
	newPatientFullName: string;
	newPatientPhone: string;
	isLinkingSubmitting: boolean;
	onClose: () => void;
	onFullNameChange: (name: string) => void;
	onPhoneChange: (phone: string) => void;
	onSubmit: (e: React.FormEvent) => void;
}

export function LinkPatientModal({
	isOpen,
	activeConv,
	newPatientFullName,
	newPatientPhone,
	isLinkingSubmitting,
	onClose,
	onFullNameChange,
	onPhoneChange,
	onSubmit,
}: LinkPatientModalProps) {
	if (!isOpen || !activeConv) return null;

	return (
		<div
			className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
			data-testid="link-patient-modal"
		>
			<div className="w-full max-w-md rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-2xl p-5 text-[var(--ink,#0f172a)] animate-in fade-in zoom-in-95 duration-150">
				{/* Header */}
				<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#e2e8f0)]">
					<div className="flex items-center gap-2.5">
						<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
							<UserCheck size={18} />
						</div>
						<div>
							<h3 className="font-bold text-base leading-tight">
								Привязать карту пациента
							</h3>
							<p className="text-xs text-[var(--muted,#64748b)]">
								{activeConv.channel.toUpperCase()}: ID {activeConv.senderId}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-lg text-[var(--muted,#64748b)] hover:bg-[var(--line,#e2e8f0)] transition-colors cursor-pointer"
						title="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				{/* Form */}
				<form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3.5">
					<div className="flex flex-col gap-1">
						<label className="text-xs font-semibold text-[var(--muted,#64748b)]" htmlFor="link-patient-name">
							ФИО пациента:
						</label>
						<input
							id="link-patient-name"
							type="text"
							placeholder="Иванов Иван Иванович"
							value={newPatientFullName}
							onChange={(e) => onFullNameChange(e.target.value)}
							className="w-full p-2.5 text-xs rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
							required
						/>
					</div>

					<div className="flex flex-col gap-1">
						<label className="text-xs font-semibold text-[var(--muted,#64748b)]" htmlFor="link-patient-phone">
							Номер телефона:
						</label>
						<input
							id="link-patient-phone"
							type="tel"
							placeholder="+7 (999) 000-00-00"
							value={newPatientPhone}
							onChange={(e) => onPhoneChange(e.target.value)}
							className="w-full p-2.5 text-xs rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
						/>
					</div>

					<p className="text-[11px] text-[var(--muted,#64748b)] leading-relaxed">
						После сохранения пациент появится в базе клиники (PostgreSQL 18), все последующие сообщения и звонки будут автоматически привязываться к его амбулаторной карте 043/у.
					</p>

					{/* Footer */}
					<div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--line,#e2e8f0)] mt-1">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-[var(--muted,#64748b)] hover:bg-[var(--line,#e2e8f0)] transition-colors cursor-pointer"
						>
							Отмена
						</button>
						<button
							type="submit"
							disabled={isLinkingSubmitting}
							className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
							data-testid="submit-link-patient-btn"
						>
							{isLinkingSubmitting ? (
								<RefreshCw size={15} className="animate-spin" />
							) : (
								<Check size={15} />
							)}
							<span>Быстро создать карту</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
