/**
 * RecallCandidateRow.tsx
 * Table row for individual recall candidate with clinical badges & 1-click actions.
 * Governed by Mandate 8b (Strict <= 120 lines).
 */

import React from "react";
import { Check, Phone, MessageCircle } from "lucide-react";
import type { RecallCandidate } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { formatDate, deriveClinicalBadge } from "./recallListUtils";
import { BAND_TITLES, INVITABLE, NOT_INVITABLE_REASON } from "./recallListTypes";

export interface RecallCandidateRowProps {
	readonly candidate: RecallCandidate;
	readonly busy: boolean;
	readonly wasCalled: boolean;
	readonly onInvite: (candidate: RecallCandidate) => void;
	readonly onMarkCalled: (id: string) => void;
	readonly onSelectPatient?: (patientId: string) => void;
	readonly clinicName?: string;
}

export function RecallCandidateRow({
	candidate, busy, wasCalled, onInvite, onMarkCalled, onSelectPatient, clinicName = "Стоматология",
}: RecallCandidateRowProps) {
	const badge = deriveClinicalBadge(candidate.reason, candidate.monthsSinceLastVisit);
	const cleanPhone = (candidate.phone || "").replace(/\D/g, "");

	const handleWhatsApp = () => {
		if (!cleanPhone) { showToast("У пациента не указан номер телефона", "warning"); return; }
		const text = encodeURIComponent(`Здравствуйте, ${candidate.fullName}! Напоминаем о плановом осмотре в клинике «${clinicName}»: подошел срок процедуры «${candidate.reason}».`);
		window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank", "noopener,noreferrer");
		onMarkCalled(candidate.patientId);
	};

	const handlePhoneClick = () => {
		if (!candidate.phone) {
			showToast("У пациента не указан телефон. Открыть карточку для ввода?", "warning");
			if (candidate.patientId && onSelectPatient) onSelectPatient(candidate.patientId);
			return;
		}
		onMarkCalled(candidate.patientId);
	};

	return (
		<tr className={wasCalled ? "ops-row--done" : ""} style={{ contentVisibility: "auto", containIntrinsicSize: "1px 52px" }}>
			<td className="ops-strong" data-label="Пациент">
				{candidate.fullName}
				<span className="ops-note">{candidate.phone ?? "телефон не указан"}</span>
			</td>
			<td data-label="Последний приём">
				<span className="ops-time">{formatDate(candidate.lastCompletedAt)}</span>
				<span className="ops-note">{candidate.monthsSinceLastVisit === null ? "завершённых приёмов не было" : `${candidate.monthsSinceLastVisit} мес. назад`}</span>
			</td>
			<td data-label="Почему в списке">
				<span className={`ops-state ${badge.cls}`}>{badge.text || BAND_TITLES[candidate.band]}</span>
				<span className="ops-note">{candidate.reason}</span>
			</td>
			<td data-label="Что делать">
				<div className="dente-button-group inline-flex items-center gap-1.5 flex-wrap">
					{candidate.phone && (
						<a href={`tel:${candidate.phone}`} onClick={handlePhoneClick} className="secondary-button inline-flex items-center gap-1 h-8 min-h-[32px] px-2.5 rounded-lg text-[12.5px] font-medium" title="Позвонить">
							{wasCalled ? <Check size={13} className="text-emerald-600" /> : <Phone size={13} />}
							<span>{wasCalled ? "Позвонил" : "Позвонить"}</span>
						</a>
					)}
					{candidate.phone && (
						<button type="button" onClick={handleWhatsApp} className="secondary-button inline-flex items-center gap-1 h-8 min-h-[32px] px-2.5 rounded-lg text-[12.5px] font-medium" title="Написать в WhatsApp">
							<MessageCircle size={13} className="text-emerald-600" /><span>WhatsApp</span>
						</button>
					)}
					{INVITABLE.includes(candidate.band) ? (
						<button type="button" disabled={busy} onClick={() => onInvite(candidate)} className="secondary-button inline-flex items-center gap-1 h-8 min-h-[32px] px-2.5 rounded-lg text-[12.5px] font-medium" title="Отправить SMS">
							<span>{busy ? "Отправляю…" : "Пригласить SMS"}</span>
						</button>
					) : (
						<span className="ops-note">{NOT_INVITABLE_REASON[candidate.band] ?? "Приглашение не предлагается."}</span>
					)}
				</div>
			</td>
		</tr>
	);
}
