/**
 * PatientWhatsappSendPanel.tsx — Отправка WhatsApp пациенту и шаблоны сообщений.
 * Decomposed facade strictly <= 80 lines following Mandate 8b.
 */

import React from "react";
import type { PatientWhatsappSendPanelProps } from "./whatsapp/types";
import { usePatientWhatsappSend } from "./whatsapp/usePatientWhatsappSend";
import { WhatsappStatusHeader } from "./whatsapp/WhatsappStatusHeader";
import { WhatsappTemplatePicker } from "./whatsapp/WhatsappTemplatePicker";
import { WhatsappSendActions } from "./whatsapp/WhatsappSendActions";

export type { PatientWhatsappSendPanelProps } from "./whatsapp/types";

export const PatientWhatsappSendPanel: React.FC<PatientWhatsappSendPanelProps> = (props) => {
	const state = usePatientWhatsappSend(props);

	if (!state.pid) return null;

	return (
		<section
			className="rounded-2xl border border-emerald-500/25 bg-[var(--paper)] p-4 shadow-sm"
			data-testid="patient-whatsapp-send-panel"
			aria-label="Отправить сообщение в WhatsApp"
		>
			<WhatsappStatusHeader
				phoneHint={state.phoneHint}
				nameHint={state.nameHint}
				error={state.error}
				lastOk={state.lastOk}
			/>

			<WhatsappTemplatePicker
				hasUpcomingAppointment={Boolean(state.upcomingAppointment)}
				onApplyTemplate={state.applyTemplate}
			/>

			<label className="block mb-2">
				<span className="sr-only">Текст сообщения WhatsApp</span>
				<textarea
					data-testid="patient-whatsapp-send-message"
					value={state.message}
					onChange={(e) => state.setMessage(e.target.value)}
					disabled={state.busy}
					rows={4}
					maxLength={4000}
					placeholder="Введите текст сообщения или выберите быстрый шаблон выше…"
					className="w-full min-h-[96px] px-3 py-2 text-sm rounded-xl border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50"
				/>
			</label>

			<WhatsappSendActions
				busy={state.busy}
				cleanPhone={state.cleanPhone}
				phoneHint={state.phoneHint}
				message={state.message}
				onSend={() => void state.send()}
				onOpenWebWhatsApp={state.handleOpenWebWhatsApp}
			/>
		</section>
	);
};

export default PatientWhatsappSendPanel;
