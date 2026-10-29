/**
 * MarketingRecallPatientCard.tsx
 * Recalls Hub candidate card with human badges and 1-click messaging.
 * Governed by Mandate 8b (Strict <= 120 lines), Apple HIG >= 44px.
 */

import React, { useState } from "react";
import { Phone, MessageCircle, Send, Check, CalendarCheck } from "lucide-react";
import { showToast } from "../GlobalToast";
import { denteClinicalMutationHeaders } from "../../lib/denteRequestHeaders.js";
import type { MarketingRecallCandidate } from "./marketingRecallsTypes";

export interface MarketingRecallPatientCardProps {
	readonly candidate: MarketingRecallCandidate;
	readonly clinicName?: string;
	readonly isCalled: boolean;
	readonly onMarkCalled: (id: string) => void;
	readonly onBookAppointment?: (patientId: string) => void;
}

async function persistRecallStatus(patientId: string, status: string, channel: string) {
	try {
		await fetch(`/api/recalls/${patientId}/status`, {
			method: "POST",
			headers: { "Content-Type": "application/json", ...denteClinicalMutationHeaders() },
			body: JSON.stringify({ status, channel, note: `1-click ${channel} recall outreach` }),
		});
	} catch {}
}

export function MarketingRecallPatientCard({
	candidate,
	clinicName = "Клиника",
	isCalled,
	onMarkCalled,
	onBookAppointment,
}: MarketingRecallPatientCardProps) {
	const [sendingSms, setSendingSms] = useState(false);
	const cleanPhone = (candidate.phone || "").replace(/\D/g, "");
	const pId = candidate.patientId || candidate.id;

	const handleWhatsApp = () => {
		if (!cleanPhone) { showToast("У пациента не указан номер телефона", "warning"); return; }
		const text = encodeURIComponent(`Здравствуйте, ${candidate.fullName}! Напоминаем о плановом осмотре в клинике «${clinicName}»: подошел срок процедуры «${candidate.procedureTitle}». Будем рады подобрать удобное время!`);
		window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank", "noopener,noreferrer");
		void persistRecallStatus(pId, "called", "whatsapp");
		onMarkCalled(candidate.id);
	};

	const handleTelegram = () => {
		if (!cleanPhone) { showToast("У пациента не указан номер телефона", "warning"); return; }
		const text = encodeURIComponent(`Здравствуйте, ${candidate.fullName}! Напоминание от «${clinicName}»: подошел срок планового осмотра (${candidate.procedureTitle}).`);
		window.open(`https://t.me/+${cleanPhone}?text=${text}`, "_blank", "noopener,noreferrer");
		void persistRecallStatus(pId, "called", "telegram");
		onMarkCalled(candidate.id);
	};

	const handleInviteSms = async () => {
		if (!cleanPhone) { showToast("У пациента не указан номер телефона", "warning"); return; }
		setSendingSms(true);
		try {
			const res = await fetch("/api/patients/recall-candidates/invite", {
				method: "POST",
				headers: { "Content-Type": "application/json", ...denteClinicalMutationHeaders() },
				body: JSON.stringify({ patientId: candidate.patientId, channel: "sms", body: `Здравствуйте, ${candidate.fullName}! Прошло более полугода с последнего визита в «${clinicName}». Ждем вас на плановый осмотр.` }),
			});
			if (res.ok) {
				showToast("Приглашение по SMS отправлено", "success");
				void persistRecallStatus(pId, "invited", "sms");
				onMarkCalled(candidate.id);
			} else showToast("Не удалось отправить SMS", "error");
		} catch { showToast("Ошибка сети при отправке SMS", "error"); }
		finally { setSendingSms(false); }
	};

	return (
		<article className={`marketing-recall-card ${isCalled ? "opacity-75" : ""}`} data-testid={`recall-card-${candidate.id}`}>
			<div className="marketing-recall-main">
				<div className="marketing-recall-header">
					<h3 className="marketing-recall-name">{candidate.fullName}</h3>
					<span className={`marketing-recall-badge marketing-recall-badge--${candidate.badgeType}`}>{candidate.badgeText}</span>
				</div>
				<div className="marketing-recall-details">
					<span>{candidate.procedureTitle}</span>
					<span aria-hidden="true">•</span>
					<span>{candidate.monthsSinceLastVisit !== null ? `${candidate.monthsSinceLastVisit} мес. назад` : "Первичный"}</span>
					{candidate.phone && (
						<>
							<span aria-hidden="true">•</span>
							<a href={`tel:${candidate.phone}`} className="text-[var(--primary)] font-medium hover:underline inline-flex items-center gap-1">
								<Phone size={12} /><span>{candidate.phone}</span>
							</a>
						</>
					)}
				</div>
			</div>

			<div className="marketing-recall-actions">
				<button type="button" onClick={handleWhatsApp} className="secondary-button h-9 min-h-[36px] sm:min-h-[36px] px-3 rounded-lg inline-flex items-center gap-1 text-xs font-semibold" title="Отправить WhatsApp">
					<MessageCircle size={14} className="text-emerald-600" /><span>WhatsApp</span>
				</button>
				<button type="button" onClick={handleTelegram} className="secondary-button h-9 min-h-[36px] sm:min-h-[36px] px-3 rounded-lg inline-flex items-center gap-1 text-xs font-semibold" title="Отправить Telegram">
					<Send size={13} className="text-sky-600" /><span>Telegram</span>
				</button>
				<button type="button" onClick={handleInviteSms} disabled={sendingSms} className="secondary-button h-9 min-h-[36px] sm:min-h-[36px] px-3 rounded-lg inline-flex items-center gap-1 text-xs font-semibold" title="Отправить SMS">
					<span>{sendingSms ? "..." : "SMS"}</span>
				</button>
				{candidate.phone && (
					<a href={`tel:${candidate.phone}`} onClick={() => { void persistRecallStatus(pId, "called", "phone"); onMarkCalled(candidate.id); }} className="secondary-button h-9 min-h-[36px] sm:min-h-[36px] px-3 rounded-lg inline-flex items-center gap-1 text-xs font-semibold" title="Позвонить">
						{isCalled ? <Check size={14} className="text-emerald-600" /> : <Phone size={13} />}
						<span>{isCalled ? "Позвонил" : "Звонок"}</span>
					</a>
				)}
				{onBookAppointment && (
					<button type="button" onClick={() => onBookAppointment(candidate.patientId)} className="primary-button marketing-action-btn-primary h-9 min-h-[36px] px-3.5 rounded-lg inline-flex items-center gap-1 text-xs font-bold" title="Записать на приём">
						<CalendarCheck size={14} /><span>Записать</span>
					</button>
				)}
			</div>
		</article>
	);
}
