/**
 * DENTE Dental CRM — Leads Kanban Convert Modal
 *
 * Mandate 8s (SSOT Componentization), Mandate 8e & 8n (Solo Doctor Autonomy & Zero Dead-Ends):
 * - Instant fallback to Solo Doctor & Chair #1 when unconfigured
 * - Never blocks booking submission
 * - Non-blocking clean dialog
 */

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
	Calendar,
	FileText,
	Globe,
	ShieldCheck,
	Tag,
	User,
	UserCheck,
	X,
} from "lucide-react";
import type { Lead } from "../../store/leadsStore";
import { CHANNEL_BADGE_COLORS } from "../telephony/telephonyAttribution";
import { extractLeadAttribution } from "./leadsFunnelEngine";
import type { BookableChair, BookableDoctor } from "./LeadsKanbanView";
import {
	FALLBACK_DEFAULT_CHAIR,
	FALLBACK_SOLO_DOCTOR,
	isLeadBookingDisabled,
} from "./LeadsKanbanView";

export interface LeadConvertSubmitOptions {
	consentMedical: boolean;
	consentMarketing: boolean;
	reason?: string | undefined;
	comment?: string | undefined;
}

export interface LeadConvertModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (
		e: React.FormEvent,
		options?: LeadConvertSubmitOptions,
	) => void;
	staff: BookableDoctor[];
	chairs: BookableChair[];
	effectiveStaff: BookableDoctor[];
	effectiveChairs: BookableChair[];
	selectedDoctorId: string;
	setSelectedDoctorId: (id: string) => void;
	selectedChairId: string;
	setSelectedChairId: (id: string) => void;
	appointmentDate: string;
	setAppointmentDate: (date: string) => void;
	appointmentTime: string;
	setAppointmentTime: (time: string) => void;
	isBooking: boolean;
	lead?: Lead | null;
	consentMedical?: boolean;
	setConsentMedical?: (val: boolean) => void;
	consentMarketing?: boolean;
	setConsentMarketing?: (val: boolean) => void;
	cardBg?: string;
	colBg?: string;
	borderColor?: string;
}

export const LeadConvertModal: React.FC<LeadConvertModalProps> = ({
	isOpen,
	onClose,
	onSubmit,
	staff,
	chairs,
	effectiveStaff,
	effectiveChairs,
	selectedDoctorId,
	setSelectedDoctorId,
	selectedChairId,
	setSelectedChairId,
	appointmentDate,
	setAppointmentDate,
	appointmentTime,
	setAppointmentTime,
	isBooking,
	lead = null,
	consentMedical: controlledConsentMedical,
	setConsentMedical: controlledSetConsentMedical,
	consentMarketing: controlledConsentMarketing,
	setConsentMarketing: controlledSetConsentMarketing,
	cardBg = "var(--paper)",
	colBg = "var(--paper-soft)",
	borderColor = "var(--line)",
}) => {
	const [localConsentMedical, setLocalConsentMedical] = useState(true);
	const [localConsentMarketing, setLocalConsentMarketing] = useState(false);

	const defaultReason = lead
		? (Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0
			? `Первичная консультация: ${lead.clinicalTags.join(", ")}`
			: (lead.notes ? `Первичная консультация: ${lead.notes.slice(0, 100)}` : "Первичная консультация"))
		: "Первичная консультация";

	const [reason, setReason] = useState(defaultReason);
	const [comment, setComment] = useState(lead?.notes || "");

	useEffect(() => {
		if (lead) {
			const initialReason =
				Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0
					? `Первичная консультация: ${lead.clinicalTags.join(", ")}`
					: (lead.notes ? `Первичная консультация: ${lead.notes.slice(0, 100)}` : "Первичная консультация");
			setReason(initialReason);
			setComment(lead.notes || "");
		}
	}, [lead?.id, lead?.notes, lead?.clinicalTags]);

	const consentMedical =
		controlledConsentMedical !== undefined
			? controlledConsentMedical
			: localConsentMedical;
	const setConsentMedical =
		controlledSetConsentMedical || setLocalConsentMedical;

	const consentMarketing =
		controlledConsentMarketing !== undefined
			? controlledConsentMarketing
			: localConsentMarketing;
	const setConsentMarketing =
		controlledSetConsentMarketing || setLocalConsentMarketing;

	if (!isOpen) return null;

	const attribution = lead ? extractLeadAttribution(lead) : null;
	const channelBadge =
		attribution && CHANNEL_BADGE_COLORS[attribution.channelKey]
			? CHANNEL_BADGE_COLORS[attribution.channelKey]
			: {
					bg: "var(--teal-soft)",
					color: "var(--teal-dark, var(--teal))",
					border: "var(--teal)",
				};

	const handleFormSubmit = (e: React.FormEvent) => {
		onSubmit(e, {
			consentMedical,
			consentMarketing,
			reason: reason.trim() || undefined,
			comment: comment.trim() || undefined,
		});
	};

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 100,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "rgba(0,0,0,0.5)",
				backdropFilter: "blur(4px)",
			}}
		>
			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				style={{
					background: cardBg,
					borderRadius: 16,
					padding: 24,
					width: 440,
					maxWidth: "95%",
					maxHeight: "90vh",
					overflowY: "auto",
					border: `1px solid ${borderColor}`,
					boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 16,
					}}
				>
					<h3
						style={{
							margin: 0,
							fontSize: 18,
							fontWeight: 600,
							color: "var(--ink)",
							display: "flex",
							alignItems: "center",
							gap: 8,
						}}
					>
						<Calendar size={20} color="var(--teal)" /> Записать лида на приём
					</h3>
					<button
						type="button"
						onClick={onClose}
						style={{
							background: "none",
							border: "none",
							color: "var(--muted)",
							cursor: "pointer",
						}}
						aria-label="Закрыть модальное окно"
					>
						<X size={20} />
					</button>
				</div>

				<form
					onSubmit={handleFormSubmit}
					style={{ display: "flex", flexDirection: "column", gap: 14 }}
				>
					{/* Zero Attribution Loss: Информация о лиде и источнике привлечения */}
					{lead && (
						<div
							style={{
								padding: "10px 12px",
								borderRadius: 10,
								background: "var(--paper-soft)",
								border: `1px solid ${borderColor}`,
								display: "flex",
								flexDirection: "column",
								gap: 6,
							}}
							data-testid="lead-convert-attribution-card"
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									gap: 8,
								}}
							>
								<span
									style={{
										fontSize: 13,
										fontWeight: 600,
										color: "var(--ink)",
										display: "flex",
										alignItems: "center",
										gap: 6,
									}}
								>
									<User size={13} style={{ color: "var(--teal)" }} />
									{lead.name}
								</span>
								{lead.phone && (
									<span style={{ fontSize: 12, color: "var(--muted)" }}>
										{lead.phone}
									</span>
								)}
							</div>

							{lead.existingPatient && (
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: 6,
										padding: "4px 8px",
										background: "var(--ok-bg, rgba(16, 185, 129, 0.1))",
										color: "var(--ok-fg, #059669)",
										border: "1px solid var(--ok-border, var(--line))",
										borderRadius: 6,
										fontSize: 11.5,
										fontWeight: 600,
									}}
									data-testid="lead-convert-existing-patient-alert"
								>
									<UserCheck size={14} className="shrink-0" />
									<span>
										Постоянный пациент: {lead.existingPatient.fullName} (новая карта не создается, приём привяжется к существующей)
									</span>
								</div>
							)}

							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: 6,
									flexWrap: "wrap",
								}}
							>
								<div
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: 4,
										fontSize: 11,
										fontWeight: 600,
										color: channelBadge.color,
										background: channelBadge.bg,
										border: `1px solid ${channelBadge.border}`,
										padding: "2px 7px",
										borderRadius: 5,
									}}
									data-testid="lead-convert-channel-badge"
									title={`Рекламный канал: ${
										attribution?.channelLabel || lead.source || "Прямое обращение"
									}`}
								>
									<Globe size={11} className="shrink-0" />
									<span>
										Канал:{" "}
										{attribution?.channelLabel ||
											lead.source ||
											"Прямое обращение"}
									</span>
								</div>

								{attribution?.hasUtmTags && (
									<span
										style={{
											fontSize: 10,
											fontWeight: 600,
											background: "var(--teal-soft)",
											color: "var(--teal)",
											border: "1px solid var(--teal)",
											padding: "1px 6px",
											borderRadius: 4,
											display: "inline-flex",
											alignItems: "center",
											gap: 3,
										}}
										title={`UTM Campaign: ${
											attribution.utm.utm_campaign || "активна"
										}`}
										data-testid="lead-convert-utm-badge"
									>
										<Tag size={10} />
										<span>UTM сохранены</span>
									</span>
								)}
							</div>

							{attribution?.primaryInquiry && (
								<div
									style={{
										fontSize: 11.5,
										color: "var(--muted)",
										display: "flex",
										alignItems: "flex-start",
										gap: 5,
										marginTop: 2,
									}}
									data-testid="lead-convert-primary-inquiry"
								>
									<FileText
										size={12}
										className="shrink-0"
										style={{ color: "var(--teal)", marginTop: 2 }}
									/>
									<span>
										<strong>Первичный запрос:</strong>{" "}
										{attribution.primaryInquiry}
									</span>
								</div>
							)}

							<div
								style={{
									fontSize: 10.5,
									color: "var(--ok-fg)",
									display: "flex",
									alignItems: "center",
									gap: 4,
									marginTop: 2,
								}}
							>
								<ShieldCheck size={12} className="shrink-0" />
								<span>
									Zero Attribution Loss: источник и запрос сохраняются в карте
								</span>
							</div>
						</div>
					)}

					{/* Разделение согласий 152-ФЗ и ФЗ-38 */}
					<div
						style={{
							padding: "10px 12px",
							borderRadius: 10,
							background: "var(--paper-soft)",
							border: `1px solid ${borderColor}`,
							display: "flex",
							flexDirection: "column",
							gap: 8,
						}}
						data-testid="lead-convert-consent-section"
					>
						<div
							style={{
								fontSize: 11.5,
								fontWeight: 600,
								color: "var(--ink)",
								display: "flex",
								alignItems: "center",
								gap: 5,
							}}
						>
							<ShieldCheck size={13} style={{ color: "var(--teal)" }} />
							<span>Разделение согласий (на лечение и на рассылки)</span>
						</div>

						{/* Согласие 1: Обработка персданных для медпомощи (обязательное) */}
						<label
							style={{
								display: "flex",
								alignItems: "flex-start",
								gap: 8,
								fontSize: 11.5,
								color: "var(--ink)",
								cursor: "pointer",
							}}
							data-testid="consent-medical-label"
						>
							<input
								type="checkbox"
								checked={consentMedical}
								onChange={(e) => setConsentMedical(e.target.checked)}
								style={{ marginTop: 2 }}
								data-testid="consent-medical-checkbox"
							/>
							<div>
								<span style={{ fontWeight: 600 }}>
									Согласие на обработку персональных данных
								</span>
								<p className="m-0 text-[10.5px] leading-tight text-[var(--muted)]">
									Обязательно для оказания медицинской помощи, амбулаторной
									карты и договора.
								</p>
							</div>
						</label>

						{/* Согласие 2: Рекламные рассылки и SMS (независимое) */}
						<label
							style={{
								display: "flex",
								alignItems: "flex-start",
								gap: 8,
								fontSize: 11.5,
								color: "var(--ink)",
								cursor: "pointer",
							}}
							data-testid="consent-marketing-label"
						>
							<input
								type="checkbox"
								checked={consentMarketing}
								onChange={(e) => setConsentMarketing(e.target.checked)}
								style={{ marginTop: 2 }}
								data-testid="consent-marketing-checkbox"
							/>
							<div>
								<span style={{ fontWeight: 600 }}>
									Согласие на рекламные рассылки и акции (ФЗ-38)
								</span>
								<p className="m-0 text-[10.5px] leading-tight text-[var(--muted)]">
									{consentMarketing
										? "Пациент дал согласие на рекламные SMS и маркетинговые спецпредложения."
										: "Отказ от рекламы: пациент исключается из промо-рассылок (защита от штрафов ФАС). Сервисные напоминания сохраняются."}
								</p>
							</div>
						</label>
					</div>
					<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
						<label
							htmlFor="convert-lead-doctor"
							style={{ fontSize: 13, color: "var(--muted)" }}
						>
							Врач
						</label>
						<select
							id="convert-lead-doctor"
							value={
								selectedDoctorId ||
								effectiveStaff[0]?.id ||
								FALLBACK_SOLO_DOCTOR.id
							}
							onChange={(e) => setSelectedDoctorId(e.target.value)}
							style={{
								padding: 10,
								borderRadius: 8,
								border: `1px solid ${borderColor}`,
								background: colBg,
								color: "var(--ink)",
							}}
							required
						>
							{effectiveStaff.map((s) => (
								<option key={s.id} value={s.id}>
									{s.fullName || s.name}
								</option>
							))}
						</select>
						{staff.length === 0 ||
						(staff.length === 1 &&
							staff[0]?.id === FALLBACK_SOLO_DOCTOR.id) ? (
							<p className="m-0 text-xs leading-relaxed text-[var(--muted)]">
								В клинике пока не настроен список врачей. Автоматически назначен дежурный врач для соло-практики (Режим соло-практики).
							</p>
						) : null}
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
						<label
							htmlFor="convert-lead-chair"
							style={{ fontSize: 13, color: "var(--muted)" }}
						>
							Кресло
						</label>
						<select
							id="convert-lead-chair"
							value={
								selectedChairId ||
								effectiveChairs[0]?.id ||
								FALLBACK_DEFAULT_CHAIR.id
							}
							onChange={(e) => setSelectedChairId(e.target.value)}
							style={{
								padding: 10,
								borderRadius: 8,
								border: `1px solid ${borderColor}`,
								background: colBg,
								color: "var(--ink)",
							}}
							required
						>
							{effectiveChairs.map((c) => (
								<option key={c.id} value={c.id}>
									{c.name}
								</option>
							))}
						</select>
						{chairs.length === 0 ||
						(chairs.length === 1 &&
							chairs[0]?.id === FALLBACK_DEFAULT_CHAIR.id) ? (
							<p className="m-0 text-xs leading-relaxed text-[var(--muted)]">
								В клинике пока не настроены кресла. Автоматически выбрано основное кресло №1 (Режим соло-практики).
							</p>
						) : null}
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
						<label
							htmlFor="convert-lead-reason"
							style={{ fontSize: 13, color: "var(--muted)" }}
						>
							Причина приёма / первичная жалоба
						</label>
						<input
							id="convert-lead-reason"
							type="text"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="Первичная консультация"
							style={{
								padding: 10,
								borderRadius: 8,
								border: `1px solid ${borderColor}`,
								background: colBg,
								color: "var(--ink)",
								fontSize: 13,
							}}
							data-testid="convert-lead-reason-input"
						/>
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
						<label
							htmlFor="convert-lead-comment"
							style={{ fontSize: 13, color: "var(--muted)" }}
						>
							Клинический комментарий / примечание
						</label>
						<textarea
							id="convert-lead-comment"
							value={comment}
							onChange={(e) => setComment(e.target.value)}
							placeholder="Анамнез, жалобы, пожелания пациента..."
							rows={2}
							style={{
								padding: 10,
								borderRadius: 8,
								border: `1px solid ${borderColor}`,
								background: colBg,
								color: "var(--ink)",
								fontSize: 13,
								resize: "vertical",
							}}
							data-testid="convert-lead-comment-input"
						/>
					</div>

					<div style={{ display: "flex", gap: 12 }}>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 6,
								flex: 1,
							}}
						>
							<label
								htmlFor="convert-lead-date"
								style={{ fontSize: 13, color: "var(--muted)" }}
							>
								Дата
							</label>
							<input
								id="convert-lead-date"
								type="date"
								value={appointmentDate}
								onChange={(e) => setAppointmentDate(e.target.value)}
								style={{
									padding: 10,
									borderRadius: 8,
									border: `1px solid ${borderColor}`,
									background: colBg,
									color: "var(--ink)",
								}}
								required
							/>
						</div>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 6,
								flex: 1,
							}}
						>
							<label
								htmlFor="convert-lead-time"
								style={{ fontSize: 13, color: "var(--muted)" }}
							>
								Время
							</label>
							<input
								id="convert-lead-time"
								type="time"
								value={appointmentTime}
								onChange={(e) => setAppointmentTime(e.target.value)}
								style={{
									padding: 10,
									borderRadius: 8,
									border: `1px solid ${borderColor}`,
									background: colBg,
									color: "var(--ink)",
								}}
								required
							/>
						</div>
					</div>

					<button
						type="submit"
						className="primary-button"
						data-testid="lead-convert-submit-btn"
						disabled={isLeadBookingDisabled(isBooking)}
						title={
							isBooking
								? "Записываем..."
								: lead?.existingPatient
									? "Записать на приём"
									: "Создать пациента и запись в расписании"
						}
						style={{
							marginTop: 8,
							width: "100%",
							justifyContent: "center",
						}}
					>
						{isBooking
							? "Записываем..."
							: lead?.existingPatient
								? "Подтвердить запись на приём"
								: "Подтвердить запись и создать карту"}
					</button>
				</form>
			</motion.div>
		</div>
	);
};
