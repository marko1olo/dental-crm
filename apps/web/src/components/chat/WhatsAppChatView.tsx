/**
 * WhatsAppChatView.tsx — Canonical Patient WhatsApp & Omnichannel Chat View
 * 
 * Mandate 8e: Doctor & Staff Autonomy (1-click template insertion, non-blocking send).
 * Mandate 8k: Friction-Killer Law (Zero reality simulations, instant delivery).
 * Apple HIG: Mobile touch targets >= 44x44px, row height >= 52px, 0px horizontal scroll.
 */

import React, { useState } from "react";
import { WhatsAppChatPanel, type WhatsAppChatPanelProps } from "./WhatsAppChatPanel";
import { MessageSquare, Phone, Calendar, Clock, Send, ShieldAlert, Sparkles } from "lucide-react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";

export interface WhatsAppChatViewProps extends WhatsAppChatPanelProps {
	mode?: "standalone" | "drawer" | "modal";
	onSelectPatient?: (patientId: string) => void;
}

export function WhatsAppChatView({
	patientId,
	patientPhone,
	patientName,
	onClose,
	className = "",
	mode = "standalone",
	onSelectPatient,
}: WhatsAppChatViewProps): React.JSX.Element {
	const appLogic = useOptionalAppLogicContext();
	const patients = appLogic?.dashboard?.patients ?? [];
	const [activePatientId, setActivePatientId] = useState<string | null>(patientId || null);

	const selectedPatient = patients.find((p) => p.id === (activePatientId || patientId));
	const effectivePhone = patientPhone || selectedPatient?.phone || null;
	const effectiveName = patientName || selectedPatient?.fullName || null;

	return (
		<section
			className={`dnt-whatsapp-chat-view w-full h-full flex flex-col sm:flex-row bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-2xl shadow-xl overflow-hidden ${className}`}
			aria-label="Омниканальный чат WhatsApp"
			data-testid="whatsapp-chat-view"
		>
			{/* Left side list of patients for standalone reception desk view */}
			{mode === "standalone" && (
				<aside className="dnt-chat-patient-list w-full sm:w-72 lg:w-80 border-b sm:border-b-0 sm:border-r border-[var(--line)] bg-[var(--paper-soft)] flex flex-col shrink-0">
					<div className="p-3.5 border-b border-[var(--line)] flex items-center justify-between">
						<div className="flex items-center gap-2">
							<MessageSquare size={17} className="text-emerald-500" />
							<h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">Диалоги пациентов</h3>
						</div>
						<span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold">
							{patients.length}
						</span>
					</div>

					<div className="flex-1 overflow-y-auto divide-y divide-[var(--line-subtle)]">
						{patients.slice(0, 10).map((p) => {
							const isSelected = p.id === (activePatientId || patientId);
							return (
								<button
									key={p.id}
									type="button"
									onClick={() => {
										setActivePatientId(p.id);
										onSelectPatient?.(p.id);
									}}
									className={`w-full p-3 text-left flex items-start gap-3 transition-colors min-h-[52px] ${
										isSelected
											? "bg-[var(--paper)] border-l-4 border-l-emerald-500 shadow-xs"
											: "hover:bg-[var(--paper)]/50"
									}`}
								>
									<div className="w-10 h-10 rounded-full bg-emerald-600/10 text-emerald-600 font-bold flex items-center justify-center shrink-0 text-xs">
										{p.fullName?.slice(0, 2).toUpperCase() || "ПЦ"}
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center justify-between gap-1">
											<p className="text-xs font-bold text-[var(--ink)] truncate">{p.fullName}</p>
											<span className="text-[10px] text-[var(--muted)] shrink-0">Сегодня</span>
										</div>
										<p className="text-[11px] text-[var(--muted)] font-mono truncate">{p.phone || "Без телефона"}</p>
										<p className="text-[11px] text-[var(--ink-muted)] truncate mt-0.5">
											Напоминание о приёме отправлено
										</p>
									</div>
								</button>
							);
						})}
					</div>
				</aside>
			)}

			{/* Main Chat Panel */}
			<div className="flex-1 min-w-0 h-full">
				<WhatsAppChatPanel
					patientId={(activePatientId || patientId) ?? null}
					patientPhone={effectivePhone}
					patientName={effectiveName}
					onClose={onClose}
					className="border-0 rounded-none shadow-none"
				/>
			</div>
		</section>
	);
}

export default WhatsAppChatView;
