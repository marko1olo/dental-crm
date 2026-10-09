/**
 * DENTE Dental CRM — Column Focus Spreadsheet Table View (Layer 2)
 *
 * Mandate 8n (Clinical Ergonomics, Scale Sovereignty & Solo Doctor Autonomy)
 * 32px high-density clinical spreadsheet table for fast keyboard/mouse scanning and bulk operations.
 */

import React from "react";
import {
	ArrowRight,
	Calendar,
	CheckSquare,
	Edit2,
	MessageSquare,
	Square,
	UserCheck,
	UserPlus,
} from "lucide-react";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { formatWhatsAppUrl } from "../../messaging/omnichannelEngine";
import { CHANNEL_DISPLAY_NAMES } from "../../telephony/telephonyAttribution";
import { normalizeMarketingChannel } from "../leadsFunnelTypes";
import { LeadAudioPlayerWidget } from "../LeadAudioPlayerWidget";
import { getLeadSlaStatus } from "../leadsKanbanTypes";
import type { ColumnFocusTableViewProps } from "./types";

export const ColumnFocusTableView: React.FC<ColumnFocusTableViewProps> = ({
	displayLeads,
	visibleLeads,
	selectedLeadIds,
	onToggleSelectLead,
	onToggleSelectAll,
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
		<div className="expanded-focus-table-container">
			<table className="expanded-focus-table">
				<thead>
					<tr>
						<th style={{ width: 36, textAlign: "center" }}>
							<button
								type="button"
								onClick={onToggleSelectAll}
								className="expanded-focus-th-checkbox"
								aria-label="Выбрать все строки"
							>
								{selectedLeadIds.size >= displayLeads.length &&
								displayLeads.length > 0 ? (
									<CheckSquare
										size={14}
										className="text-[var(--teal)]"
									/>
								) : (
									<Square
										size={14}
										className="text-[var(--muted)] opacity-60"
									/>
								)}
							</button>
						</th>
						<th style={{ minWidth: 180 }}>Пациент / Имя</th>
						<th style={{ width: 140 }}>Телефон</th>
						<th style={{ width: 130 }}>Канал</th>
						<th style={{ minWidth: 220 }}>Жалобы / Запрос</th>
						<th style={{ width: 130 }}>Запись звонка</th>
						<th style={{ width: 150 }}>SLA / Ожидание</th>
						<th style={{ width: 110, textAlign: "right" }}>Выручка</th>
						<th style={{ width: 180, textAlign: "right" }}>Действия</th>
					</tr>
				</thead>
				<tbody>
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
						const channelLabel =
							channelKey && CHANNEL_DISPLAY_NAMES[channelKey]
								? CHANNEL_DISPLAY_NAMES[channelKey]
								: lead.source || "—";

						return (
							<tr
								key={lead.id}
								className={`expanded-focus-tr ${isSelected ? "is-selected" : ""} ${sla.isBreached ? "is-breached-row" : ""}`}
								onClick={() => onEditLead(lead)}
							>
								{/* Checkbox */}
								<td
									style={{ textAlign: "center" }}
									onClick={(e) => onToggleSelectLead(lead.id, e)}
								>
									<button
										type="button"
										className="expanded-focus-checkbox-btn"
										aria-label="Выбрать строку"
										aria-checked={isSelected}
										onClick={(e) => {
											e.stopPropagation();
											onToggleSelectLead(lead.id, e);
										}}
									>
										{isSelected ? (
											<CheckSquare
												size={14}
												className="text-[var(--teal)]"
											/>
										) : (
											<Square
												size={14}
												className="text-[var(--muted)] opacity-60"
											/>
										)}
									</button>
								</td>

								{/* Name with quick edit */}
								<td>
									<div className="flex items-center gap-1.5 min-w-0">
										<span
											className="expanded-focus-table-name"
											title={lead.name}
										>
											{lead.name}
										</span>
										{lead.existingPatient && (
											<span
												className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--teal-soft)] text-[var(--teal-dark,var(--teal))] border border-[var(--teal)] shrink-0 cursor-pointer"
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
												title={`Постоянный пациент клиники: ${lead.existingPatient.fullName}. Нажмите для перехода в карту.`}
												data-testid={`expanded-table-patient-badge-${lead.id}`}
											>
												<UserCheck size={10} />
												<span className="truncate max-w-[85px]">
													{lead.existingPatient.fullName}
												</span>
											</span>
										)}
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												onEditLead(lead);
											}}
											className="text-[var(--muted)] hover:text-[var(--teal)] p-0.5"
											title="Редактировать"
										>
											<Edit2 size={11} />
										</button>
									</div>
								</td>

								{/* Phone */}
								<td>
									{lead.phone ? (
										<div className="flex items-center gap-1.5">
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
												data-testid={`focus-table-whatsapp-${lead.id}`}
											>
												<MessageSquare size={11} />
											</a>
										</div>
									) : (
										<span className="text-[var(--muted)]">—</span>
									)}
								</td>

								{/* Source */}
								<td>
									<span
										className="expanded-focus-table-source"
										title={`Канал: ${channelLabel}`}
									>
										{channelLabel}
									</span>
								</td>

								{/* Notes / Clinical Tags */}
								<td>
									<div
										className="expanded-focus-table-notes"
										title={lead.notes || ""}
									>
										{lead.status === "trash" && dropReasonMatch && (
											<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--rust-soft,rgba(239,68,68,0.1))] text-[var(--rust,#ef4444)] border border-[var(--rust,#ef4444)] mr-1 shrink-0">
												Срыв: {dropReasonMatch}
											</span>
										)}
										{lead.notes || (
											<span className="text-[var(--muted)]">—</span>
										)}
									</div>
								</td>

								{/* Audio */}
								<td>
									<LeadAudioPlayerWidget
										audioUrl={lead.audioRecordUrl}
										transcriptionSnippet={lead.transcriptionSnippet}
										durationSeconds={lead.audioDurationSeconds}
										compact
									/>
								</td>

								{/* SLA */}
								<td>
									<span
										className={`expanded-focus-table-sla ${sla.isBreached ? "lead-sla-breached-pulse" : ""}`}
										style={{
											background: sla.badgeBg,
											color: sla.badgeColor,
											borderColor: sla.badgeBorder,
										}}
										title={`Время ожидания: ${sla.formattedDuration}`}
									>
										{sla.label}
									</span>
								</td>

								{/* Revenue */}
								<td style={{ textAlign: "right" }}>
									{lead.expectedRevenue ? (
										<span className="font-semibold text-[var(--ink)] text-[12px]">
											{Number(lead.expectedRevenue).toLocaleString("ru-RU")}{" "}
											₽
										</span>
									) : (
										<span className="text-[var(--muted)]">—</span>
									)}
								</td>

								{/* Row Actions */}
								<td
									style={{ textAlign: "right" }}
									onClick={(e) => e.stopPropagation()}
								>
									<div className="flex items-center justify-end gap-1">
										{nextStageInfo && (
											<button
												type="button"
												onClick={() =>
													onStatusChange(lead.id, nextStageInfo.status)
												}
												className="expanded-focus-table-action-btn"
												title={`В ${nextStageInfo.label}`}
											>
												<ArrowRight size={12} />
											</button>
										)}
										{lead.status !== "trash" && (
											<button
												type="button"
												onClick={() => onScheduleLead(lead.id)}
												className="expanded-focus-table-action-btn"
												title="Записать на приём"
											>
												<Calendar size={12} />
											</button>
										)}
										{lead.existingPatient ? (
											<button
												type="button"
												onClick={() => {
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
												className="expanded-focus-table-action-btn"
												title={`Открыть карту постоянного пациента: ${lead.existingPatient.fullName}`}
												data-testid={`expanded-table-open-patient-btn-${lead.id}`}
											>
												<UserCheck size={12} />
											</button>
										) : (
											<button
												type="button"
												onClick={() => void onCreatePatient(lead)}
												className="expanded-focus-table-action-btn"
												title="Создать карту пациента"
												data-testid={`expanded-table-create-patient-btn-${lead.id}`}
											>
												<UserPlus size={12} />
											</button>
										)}
									</div>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
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
