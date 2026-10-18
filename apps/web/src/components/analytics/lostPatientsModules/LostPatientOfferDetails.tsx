import React from "react";
import { formatPhoneNumber } from "../../../utils/inputSanitation";
import type { PersonalizedOfferResult } from "../analyticsWidgetData.js";
import type { LostPatientRow } from "./lostPatientTypes";

interface OfferDetailsProps {
	readonly patient: LostPatientRow;
	readonly activeOffer: PersonalizedOfferResult;
}

export function LostPatientOfferDetails({
	patient,
	activeOffer,
}: OfferDetailsProps) {
	return (
		<>
			<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)] mb-3 space-y-1">
				<div className="flex justify-between">
					<span>Клиническая цель:</span>
					<strong className="text-[var(--ink)]">
						{activeOffer.recommendedService}
					</strong>
				</div>
				<div className="flex justify-between">
					<span>Статус риска:</span>
					<span className="font-semibold text-[var(--warn-fg)]">
						{activeOffer.urgencyText}
					</span>
				</div>
				<div className="flex justify-between">
					<span>Телефон пациента:</span>
					<span className="font-medium text-[var(--ink)]">
						{formatPhoneNumber(patient.phone)}
					</span>
				</div>
			</div>

			<div className="mb-4">
				<label
					htmlFor="offer-message-textarea"
					className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
				>
					Текст сообщения (соответствует 38-ФЗ и согласию пациента):
				</label>
				<textarea
					id="offer-message-textarea"
					rows={4}
					readOnly
					value={activeOffer.messageText}
					className="w-full p-3 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] leading-relaxed resize-none focus:outline-none"
				/>
			</div>
		</>
	);
}
