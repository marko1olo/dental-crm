/**
 * DENTE Dental CRM — Column Focus Cards Grid View (Layer 2)
 *
 * Mandate 8n (Clinical Ergonomics, Scale Sovereignty & Solo Doctor Autonomy)
 * 3-column wide responsive grid of lead cards with quick actions, SLA counters,
 * existing patient 1-click bridge, and audio player widget.
 */

import React from "react";
import {
	ArrowRight,
	Calendar,
	CheckSquare,
	Clock,
	Globe,
	MessageSquare,
	Phone,
	Square,
	Tag,
	UserCheck,
	UserPlus,
} from "lucide-react";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { formatWhatsAppUrl } from "../../messaging/omnichannelEngine";
import {
	CHANNEL_BADGE_COLORS,
	CHANNEL_DISPLAY_NAMES,
} from "../../telephony/telephonyAttribution";
import { normalizeMarketingChannel } from "../leadsFunnelTypes";
import { LeadAudioPlayerWidget } from "../LeadAudioPlayerWidget";
import { getLeadSlaStatus } from "../leadsKanbanTypes";
import type { ColumnFocusCardsListProps } from "./types";

export const ColumnFocusCardsList: React.FC<ColumnFocusCardsListProps> = ({
	displayLeads,
	visibleLeads,
	selectedLeadIds,
	onToggleSelectLead,
	onEditLead,
	onStatusChange,
	onScheduleLead,
	onCreatePatient,
	onClose,
	nextStageInfo,
	visibleLimit,
	onLoadMore,
}) => {
	return (
		<div className="flex flex-col gap-3">
			<div className="expanded-focus-cards-grid">
				{visibleLeads.map((lead) => {
					const sla = getLeadSlaStatus(lead);
					const isSelected = selectedLeadIds.has(lead.id);
					const dropReasonMatch =
						lead.dropReason ||
						(lead.notes
							? lead.notes.match(/\[Причина срыва\]:\s*([^\n\r]+)/)?.[1]
							: null);
					const channelKey = lead.source
						? normalizeMarketingChannel(lead.source)
						: null;
					const channelBadge =
						channelKey && CHANNEL_BADGE_COLORS[channelKey]
							? CHANNEL_BADGE_COLORS[channelKey]
							: {
									bg: "var(--teal-soft)",
									color: "var(--teal-dark, var(--teal))",
									border: "var(--teal)",
								};
					const channelLabel =
						channelKey && CHANNEL_DISPLAY_NAMES[channelKey]
							? CHANNEL_DISPLAY_NAMES[channelKey]
							: lead.source;

					return (
						<div
							key={lead.id}
							className={`expanded-focus-card ${isSelected ? "is-selected" : ""} ${sla.isBreached ? "has-sla-breach" : ""}`}
							onClick={() => onEditLead(lead)}
						>
							{/* Card Header */}
							<div className="expanded-focus-card-header">
								<div className="flex items-center gap-2 min-w-0">
									<button
										type="button"
										className="expanded-focus-checkbox-btn"
										onClick={(e) => onToggleSelectLead(lead.id, e)}
										aria-label={isSelected ? "Снять выбор" : "Выбрать лид"}
									>
										{isSelected ? (
											<CheckSquare
												size={16}
												className="text-[var(--teal)]"
											/>
										) : (
											<Square
												size={16}
												className="text-[var(--muted)] opacity-60"
											/>
										)}
									</button>
									<span
										className="expanded-focus-card-name"
										title={lead.name}
									>
										{lead.name}
									</span>
								</div>

								{/* SLA Badge */}
								<div
									className={`expanded-focus-sla-badge ${sla.isBreached ? "lead-sla-breached-pulse" : ""}`}
									style={{
										background: sla.badgeBg,
										color: sla.badgeColor,
										borderColor: sla.badgeBorder,
									}}
									title={`Время с момента поступления / смены этапа: ${sla.formattedDuration}`}
								>
									<Clock size={11} className="shrink-0" />
									<span>{sla.label}</span>
								</div>
							</div>

							{/* Бейджи статуса пациента и причины срыва */}
							{(lead.existingPatient ||
								(lead.status === "trash" && dropReasonMatch)) && (
								<div
									style={{
										display: "flex",
										flexWrap: "wrap",
										gap: 5,
										marginTop: 4,
										marginBottom: 4,
									}}
								>
									{lead.existingPatient && (
										<div
											style={{
												display: "inline-flex",
												alignItems: "center",
												gap: 4,
												fontSize: 10.5,
												fontWeight: 600,
												color: "var(--teal-dark, var(--teal))",
												background: "var(--teal-soft)",
												border: "1px solid var(--teal)",
												padding: "1px 6px",
												borderRadius: 4,
												cursor: "pointer",
											}}
											onClick={(e) => {
												e.stopPropagation();
												usePatientStore
													.getState()
													.setSelectedPatientId(lead.existingPatient!.id);
												useAppStore
													.getState()
													.setCurrentView("patients");
												if (typeof window !== "undefined") {
													window.location.hash = "patients";
												}
												onClose();
											}}
											title={`Постоянный пациент базы клиники: ${lead.existingPatient.fullName}. Нажмите для перехода в карту.`}
											data-testid={`expanded-existing-patient-badge-${lead.id}`}
										>
											<UserCheck size={11} className="shrink-0" />
											<span>
												Постоянный пациент: {lead.existingPatient.fullName}
											</span>
										</div>
									)}
									{lead.status === "trash" && dropReasonMatch && (
										<div
											style={{
												display: "inline-flex",
												alignItems: "center",
												gap: 4,
												fontSize: 10.5,
												fontWeight: 600,
												color: "var(--rust, #ef4444)",
												background:
													"var(--rust-soft, rgba(239, 68, 68, 0.1))",
												border: "1px solid var(--rust, #ef4444)",
												padding: "1px 6px",
												borderRadius: 4,
											}}
											title={`Причина срыва: ${dropReasonMatch}`}
										>
											<span>Срыв: {dropReasonMatch}</span>
										</div>
									)}
								</div>
							)}

							{/* Phone & Audio Recording Row */}
							<div className="expanded-focus-card-phone-row">
								{lead.phone ? (
									<div className="flex items-center gap-1.5 text-[12px] text-[var(--muted)]">
										<Phone size={12} className="shrink-0" />
										<a
											href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}
											onClick={(e) => e.stopPropagation()}
											className="expanded-focus-phone-link"
										>
											{lead.phone}
										</a>
										<a
											href={formatWhatsAppUrl(
												lead.phone,
												`Здравствуйте, ${lead.name}! Вас беспокоит стоматологическая клиника DENTE.`,
											)}
											target="_blank"
											rel="noopener noreferrer"
											onClick={(e) => e.stopPropagation()}
											className="expanded-focus-whatsapp-link"
											title="Написать пациенту в WhatsApp"
											aria-label="Написать пациенту в WhatsApp"
											data-testid={`focus-lead-whatsapp-${lead.id}`}
										>
											<MessageSquare size={11} />
										</a>
									</div>
								) : (
									<div />
								)}

								{/* Inline Audio Player Widget */}
								<LeadAudioPlayerWidget
									audioUrl={lead.audioRecordUrl}
									transcriptionSnippet={lead.transcriptionSnippet}
									durationSeconds={lead.audioDurationSeconds}
								/>
							</div>

							{/* Notes / Clinical Complaints (Full view without cutting) */}
							{lead.notes && (
								<div
									className="expanded-focus-card-notes"
									title={lead.notes}
								>
									<span className="text-[var(--muted)] font-medium">
										Запрос:{" "}
									</span>
									<span className="text-[var(--ink)]">{lead.notes}</span>
								</div>
							)}

							{/* Clinical Tags & Marketing Source */}
							<div className="expanded-focus-card-meta-row">
								<div className="flex items-center gap-1.5 flex-wrap min-w-0">
									{lead.source && (
										<span
											className="expanded-focus-channel-badge"
											style={{
												background: channelBadge.bg,
												color: channelBadge.color,
												borderColor: channelBadge.border,
											}}
										>
											<Globe size={10} className="shrink-0" />
											<span>{channelLabel}</span>
										</span>
									)}
									{Array.isArray(lead.clinicalTags) &&
										lead.clinicalTags.map((tag) => (
											<span
												key={tag}
												className="expanded-focus-clinical-tag"
											>
												<Tag size={10} className="shrink-0" />
												<span>{tag}</span>
											</span>
										))}
								</div>

								{lead.expectedRevenue ? (
									<span className="expanded-focus-revenue-badge">
										{Number(lead.expectedRevenue).toLocaleString("ru-RU")}{" "}
										₽
									</span>
								) : null}
							</div>

							{/* Card Action Buttons (Dense & Clean) */}
							<div
								className="expanded-focus-card-actions-row"
								onClick={(e) => e.stopPropagation()}
							>
								{nextStageInfo && (
									<button
										type="button"
										onClick={() =>
											onStatusChange(lead.id, nextStageInfo.status)
										}
										className="expanded-focus-action-btn expanded-focus-action-btn--advance"
										title={`Перевести в ${nextStageInfo.label}`}
									>
										<span>{nextStageInfo.label}</span>
										<ArrowRight size={12} />
									</button>
								)}

								{lead.status !== "trash" && (
									<button
										type="button"
										onClick={() => onScheduleLead(lead.id)}
										className="expanded-focus-action-btn expanded-focus-action-btn--schedule"
										title="Записать в расписание"
									>
										<Calendar size={12} />
										<span>Записать</span>
									</button>
								)}

								{lead.existingPatient ? (
									<button
										type="button"
										onClick={() => {
											usePatientStore
												.getState()
												.setSelectedPatientId(lead.existingPatient!.id);
											useAppStore.getState().setCurrentView("patients");
											if (typeof window !== "undefined") {
												window.location.hash = "patients";
											}
											onClose();
										}}
										className="expanded-focus-action-btn expanded-focus-action-btn--patient"
										title={`Открыть карту постоянного пациента: ${lead.existingPatient.fullName}`}
										data-testid={`expanded-open-patient-btn-${lead.id}`}
									>
										<UserCheck size={12} />
										<span>Карта</span>
									</button>
								) : (
									<button
										type="button"
										onClick={() => void onCreatePatient(lead)}
										className="expanded-focus-action-btn expanded-focus-action-btn--patient"
										title="Создать карту пациента"
										data-testid={`expanded-create-patient-btn-${lead.id}`}
									>
										<UserPlus size={12} />
										<span>В пациенты</span>
									</button>
								)}
							</div>
						</div>
					);
				})}
			</div>
			{visibleLimit < displayLeads.length && (
				<div className="flex justify-center p-3">
					<button
						type="button"
						onClick={onLoadMore}
						className="secondary-button h-8 min-h-[32px] px-4 rounded-lg text-[13px] font-medium cursor-pointer"
					>
						Показать ещё 60 (показано {visibleLeads.length} из{" "}
						{displayLeads.length})
					</button>
				</div>
			)}
		</div>
	);
};
