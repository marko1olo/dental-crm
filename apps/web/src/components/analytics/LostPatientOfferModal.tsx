/**
 * Модальное окно 1-кликового персонализированного предложения пациенту из зоны риска.
 * Соответствует 38-ФЗ (О рекламе) и нормам врачебной этики.
 */

import { Check, Copy, MessageSquare, Phone, Sparkles, X } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import { formatPhoneNumber } from "../../utils/inputSanitation";
import type { PersonalizedOfferResult } from "./analyticsWidgetData.js";

export interface LostPatientRow {
	id: string;
	organizationId: string;
	patientName: string;
	phone: string;
	daysSinceLastVisit: number;
	hasFutureAppointment: boolean;
	createdAt: string;
	lastTreatmentCategory?: "sanitation" | "implantation" | "orthodontics" | "general_therapy";
	lastDoctorName?: string;
}

export interface LostPatientOfferModalProps {
	readonly patient: LostPatientRow;
	readonly activeOffer: PersonalizedOfferResult;
	readonly copiedText: boolean;
	readonly onCopy: () => void;
	readonly onClose: () => void;
}

export const LostPatientOfferModal: React.FC<LostPatientOfferModalProps> = ({
	patient,
	activeOffer,
	copiedText,
	onCopy,
	onClose,
}) => {
	if (typeof document === "undefined") return null;

	return createPortal(
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="offer-modal-title"
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
		>
			<div className="w-full max-w-lg rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xl p-5 relative">
				<button
					type="button"
					onClick={onClose}
					className="absolute top-4 right-4 h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors flex items-center justify-center cursor-pointer"
					aria-label="Закрыть"
				>
					<X className="w-4 h-4" />
				</button>

				<div className="flex items-center gap-2.5 mb-3">
					<div className="p-2 rounded-lg bg-[var(--teal)] text-white shadow-sm">
						<Sparkles className="w-5 h-5" />
					</div>
					<div>
						<h4
							id="offer-modal-title"
							style={{ color: "var(--ink)" }}
							className="font-bold text-base leading-tight"
						>
							{activeOffer.title}
						</h4>
						<p className="text-xs text-[var(--muted)]">
							Индивидуальное предложение для {patient.patientName}
						</p>
					</div>
				</div>

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

				<div className="flex items-center justify-between gap-2 flex-wrap pt-3 border-t border-[var(--line)]">
					<div className="flex items-center gap-2">
						<a
							href={`https://wa.me/${patient.phone?.replace(/\D/g, "")}?text=${encodeURIComponent(activeOffer.messageText)}`}
							target="_blank"
							rel="noopener noreferrer"
							className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold transition-colors inline-flex items-center gap-1.5 shadow-xs"
						>
							<MessageSquare className="w-3.5 h-3.5" />
							<span>WhatsApp</span>
						</a>

						<a
							href={`tel:${patient.phone}`}
							className="secondary-button h-8 px-3 rounded-lg text-[13px] font-semibold transition-colors inline-flex items-center gap-1.5 shadow-xs"
						>
							<Phone className="w-3.5 h-3.5 text-[var(--teal)]" />
							<span>Позвонить</span>
						</a>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onCopy}
							className="secondary-button h-8 px-3 rounded-lg text-[13px] font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
						>
							{copiedText ? (
								<Check className="w-3.5 h-3.5 text-emerald-500" />
							) : (
								<Copy className="w-3.5 h-3.5" />
							)}
							<span>{copiedText ? "Скопировано!" : "Скопировать текст"}</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="ghost-button h-8 px-3.5 rounded-lg text-[13px] font-medium transition-colors inline-flex items-center justify-center cursor-pointer"
						>
							Закрыть
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
};
