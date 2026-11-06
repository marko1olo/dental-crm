/**
 * apps/web/src/components/leads/LeadsStudioModal.tsx
 *
 * Канонический студио-модал воронки первичных обращений (Leads & CRM Funnel SSOT).
 * Мандаты 8b/8zi (Sweet Spot 400–480 строк), 8e (Автономия врача), 8n (1–5 кресел), 8ze/8am (Apple HIG).
 * Содержит:
 *  1. Шапка с переключателем видов («Канбан-доска» / «Сводка каналов рекламы») и кнопкой «+ Новый лид».
 *  2. Доска с 5 колонками стадий, карточками лидов с бейджами канала и суммы потенциального чека.
 *  3. Экспресс-форма создания лида за 5 секунд (Телефон + Имя + Канал + Потребность).
 *  4. Экспресс-конвертация лида в пациента в 1 клик с созданием приёма («Конвертировать в пациента»).
 *  5. Ровно ОДНА Primary CTA кнопка цвета var(--teal). Ноль disabled кнопок (Мандат 8e).
 */

import React, { useState, useMemo } from "react";
import { X, Plus, Phone, User, Kanban, BarChart3, CheckCircle2, Sparkles } from "lucide-react";
import {
	type FunnelStageId, type TrafficChannelId, type ClinicalNeedTag, type LeadItem,
	FUNNEL_STAGES, TRAFFIC_CHANNELS, CLINICAL_NEED_TAGS, INITIAL_LEADS_DATA,
	calculateFunnelSummary, calculateChannelStats, getTrafficChannelDef, getFunnelStageDef,
	formatRubles, normalizeRuPhone,
} from "./leadsCatalogData";

export interface LeadsStudioModalProps {
	isOpen: boolean;
	onClose: () => void;
	onOpenPatientCard?: (patientId: string) => void;
}

export const LeadsStudioModal: React.FC<LeadsStudioModalProps> = ({
	isOpen, onClose, onOpenPatientCard,
}) => {
	const [activeTab, setActiveTab] = useState<"kanban" | "analytics">("kanban");
	const [leads, setLeads] = useState<LeadItem[]>(() => [...INITIAL_LEADS_DATA]);
	const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
	const [isCreateOpen, setIsCreateOpen] = useState(false);

	// Поля экспресс-создания лида за 5 секунд
	const [formName, setFormName] = useState("");
	const [formPhone, setFormPhone] = useState("+7 (");
	const [formChannel, setFormChannel] = useState<TrafficChannelId>("yandex_maps");
	const [formNeed, setFormNeed] = useState<ClinicalNeedTag>("Острая боль");

	const summary = useMemo(() => calculateFunnelSummary(leads), [leads]);
	const channelStats = useMemo(() => calculateChannelStats(leads), [leads]);

	if (!isOpen) return null;

	const handleCreateLead = (e: React.FormEvent) => {
		e.preventDefault();
		const needDef = CLINICAL_NEED_TAGS.find((n) => n.tag === formNeed);
		const newLead: LeadItem = {
			id: `lead-user-${Date.now()}`,
			name: formName.trim() || "Первичное обращение",
			phone: normalizeRuPhone(formPhone) || "+7 (999) 000-00-00",
			channelId: formChannel,
			stageId: "new",
			needTag: formNeed,
			potentialRevenueRub: needDef ? needDef.defaultRevenueRub : 10000,
			notes: `Потребность: ${formNeed}. Рекомендован: ${needDef?.recommendedDoctor ?? "Терапевт"}`,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		setLeads((prev) => [newLead, ...prev]);
		setIsCreateOpen(false);
		setFormName("");
		setFormPhone("+7 (");
		setSelectedLead(newLead);
	};

	const handleMoveStage = (leadId: string, nextStage: FunnelStageId) => {
		setLeads((prev) =>
			prev.map((l) => (l.id === leadId ? { ...l, stageId: nextStage, updatedAt: new Date().toISOString() } : l)),
		);
		if (selectedLead && selectedLead.id === leadId) {
			setSelectedLead((prev) => (prev ? { ...prev, stageId: nextStage } : null));
		}
	};

	const handleConvertToPatient = (lead: LeadItem) => {
		const patientId = `pat-${lead.id}`;
		setLeads((prev) =>
			prev.map((l) =>
				l.id === lead.id
					? { ...l, stageId: "showed_up", isConverted: true, convertedPatientId: patientId, updatedAt: new Date().toISOString() }
					: l,
			),
		);
		setSelectedLead((prev) =>
			prev && prev.id === lead.id ? { ...prev, stageId: "showed_up", isConverted: true, convertedPatientId: patientId } : null,
		);
		if (onOpenPatientCard) onOpenPatientCard(patientId);
	};

	return (
		<div
			className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
			data-testid="leads-studio-modal-backdrop"
			onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
		>
			<div
				className="leads-studio-root w-full sm:max-w-6xl max-h-[96vh] sm:max-h-[92vh] flex flex-col rounded-t-[24px] sm:rounded-2xl border border-[var(--leads-line)] shadow-2xl overflow-hidden"
				data-testid="leads-studio-modal-content"
			>
				{/* Мобильный хэндл перетаскивания (Apple HIG) */}
				<div className="sm:hidden w-full flex justify-center pt-2">
					<div className="leads-mobile-sheet-handle" />
				</div>

				{/* 1. ШАПКА МОДАЛА С ПЕРЕКЛЮЧАТЕЛЕМ ВИДОВ */}
				<header className="px-4 sm:px-6 py-3.5 border-b border-[var(--leads-line)] bg-[var(--leads-paper-card)] flex flex-wrap items-center justify-between gap-3 shrink-0">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-[var(--leads-teal)] flex items-center justify-center font-bold">
							<Sparkles size={18} />
						</div>
						<div>
							<h2 className="text-base sm:text-lg font-bold leading-tight flex items-center gap-2">
								Воронка первичных обращений
								<span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/20">
									1–5 кресел
								</span>
							</h2>
							<p className="text-xs text-[var(--leads-muted)]">
								{summary.totalLeads} обращений • {formatRubles(summary.totalPipelineRevenueRub)} в воронке • Конверсия {summary.overallConversionPct}%
							</p>
						</div>
					</div>

					<div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-between sm:justify-end">
						<div className="inline-flex p-1 rounded-xl bg-[var(--leads-paper-subtle)] border border-[var(--leads-line)]">
							<button
								type="button"
								onClick={() => setActiveTab("kanban")}
								className={`leads-touch-target px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all gap-1.5 ${
									activeTab === "kanban"
										? "bg-[var(--leads-paper)] text-[var(--leads-teal)] shadow-xs"
										: "bg-transparent text-[var(--leads-muted)] hover:text-[var(--leads-text)]"
								}`}
								data-testid="tab-kanban-button"
							>
								<Kanban size={14} /> Канбан
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("analytics")}
								className={`leads-touch-target px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all gap-1.5 ${
									activeTab === "analytics"
										? "bg-[var(--leads-paper)] text-[var(--leads-teal)] shadow-xs"
										: "bg-transparent text-[var(--leads-muted)] hover:text-[var(--leads-text)]"
								}`}
								data-testid="tab-analytics-button"
							>
								<BarChart3 size={14} /> Каналы
							</button>
						</div>

						{/* Кнопка создания нового лида (Мандат 8e: НИКОГДА НЕ DISABLED) */}
						<button
							type="button"
							onClick={() => setIsCreateOpen(true)}
							className="leads-touch-target px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[var(--leads-teal)] hover:bg-[var(--leads-teal-hover)] shadow-xs flex items-center gap-1.5 transition-all shrink-0"
							data-testid="create-lead-trigger-btn"
						>
							<Plus size={16} /> <span className="hidden sm:inline">Новый лид</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="leads-touch-target w-9 h-9 min-w-[36px] rounded-xl bg-transparent hover:bg-[var(--leads-paper-subtle)] text-[var(--leads-muted)] hover:text-[var(--leads-text)] transition-colors shrink-0"
							aria-label="Закрыть"
							data-testid="leads-modal-close-btn"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* 2. ТЕЛО МОДАЛА: КАНБАН ИЛИ АНАЛИТИКА КАНАЛОВ */}
				<main className="flex-1 p-3 sm:p-5 overflow-y-auto bg-[var(--leads-paper-subtle)]">
					{activeTab === "kanban" ? (
						<div className="leads-kanban-grid" data-testid="leads-kanban-grid">
							{FUNNEL_STAGES.map((stage) => {
								const stageLeads = leads.filter((l) => l.stageId === stage.id);
								const stageSum = stageLeads.reduce((s, l) => s + l.potentialRevenueRub, 0);

								return (
									<div key={stage.id} className="leads-stage-column" data-testid={`stage-column-${stage.id}`}>
										<div className="p-3 border-b border-[var(--leads-line)] bg-[var(--leads-paper)] rounded-t-2xl flex items-center justify-between">
											<div className="flex items-center gap-2">
												<span className="text-xs font-bold">{stage.label}</span>
												<span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${stage.badgeClass}`}>
													{stageLeads.length}
												</span>
											</div>
											<span className="text-[11px] font-semibold text-[var(--leads-muted)]">
												{formatRubles(stageSum)}
											</span>
										</div>

										<div className="flex-1 p-2.5 flex flex-col gap-2.5 overflow-y-auto">
											{stageLeads.length === 0 ? (
												<div className="p-4 text-center text-xs text-[var(--leads-muted)] border border-dashed border-[var(--leads-line)] rounded-xl">
													Нет обращений
												</div>
											) : (
												stageLeads.map((lead) => {
													const channel = getTrafficChannelDef(lead.channelId);
													return (
														<div
															key={lead.id}
															onClick={() => setSelectedLead(lead)}
															className="leads-item-card"
															data-testid={`lead-card-${lead.id}`}
														>
															<div className="flex items-start justify-between gap-1 mb-1.5">
																<h4 className="text-xs font-bold leading-snug break-words">{lead.name}</h4>
																<span className="text-[11px] font-black text-teal-600 dark:text-teal-400 shrink-0">
																	{formatRubles(lead.potentialRevenueRub)}
																</span>
															</div>
															<div className="text-[11px] text-[var(--leads-muted)] flex items-center gap-1.5 mb-2">
																<Phone size={12} /> <span>{lead.phone}</span>
															</div>
															<div className="flex flex-wrap items-center gap-1.5">
																<span className="text-[10px] px-2 py-0.5 rounded-md font-medium text-white" style={{ backgroundColor: channel.color }}>
																	{channel.name}
																</span>
																<span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--leads-paper-subtle)] text-[var(--leads-muted)] border border-[var(--leads-line)] font-medium">
																	{lead.needTag}
																</span>
																{lead.isConverted && (
																	<span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-0.5">
																		<CheckCircle2 size={10} /> Пациент
																	</span>
																)}
															</div>
														</div>
													);
												})
											)}
										</div>
									</div>
								);
							})}
						</div>
					) : (
						/* СВОДКА 6 КАНАЛОВ РЕКЛАМЫ РФ */
						<div className="flex flex-col gap-4" data-testid="leads-analytics-view">
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
								<div className="p-3.5 rounded-xl border border-[var(--leads-line)] bg-[var(--leads-paper)]">
									<p className="text-xs text-[var(--leads-muted)] font-medium">Всего обращений</p>
									<p className="text-xl font-black mt-1">{summary.totalLeads}</p>
								</div>
								<div className="p-3.5 rounded-xl border border-[var(--leads-line)] bg-[var(--leads-paper)]">
									<p className="text-xs text-[var(--leads-muted)] font-medium">Сумма в пайплайне</p>
									<p className="text-xl font-black text-teal-600 dark:text-teal-400 mt-1">{formatRubles(summary.totalPipelineRevenueRub)}</p>
								</div>
								<div className="p-3.5 rounded-xl border border-[var(--leads-line)] bg-[var(--leads-paper)]">
									<p className="text-xs text-[var(--leads-muted)] font-medium">Дошли до приёма</p>
									<p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatRubles(summary.closedWonRevenueRub)}</p>
								</div>
								<div className="p-3.5 rounded-xl border border-[var(--leads-line)] bg-[var(--leads-paper)]">
									<p className="text-xs text-[var(--leads-muted)] font-medium">Средний чек заявки</p>
									<p className="text-xl font-black mt-1">{formatRubles(summary.avgDealCheckRub)}</p>
								</div>
							</div>
							<div className="rounded-2xl border border-[var(--leads-line)] bg-[var(--leads-paper)] overflow-hidden">
								<div className="px-4 py-3 border-b border-[var(--leads-line)] bg-[var(--leads-paper-card)] flex justify-between items-center">
									<h3 className="text-sm font-bold">Эффективность 6 каналов трафика РФ</h3>
									<span className="text-xs text-[var(--leads-muted)]">Канал • Лиды • Конверсия • Выручка</span>
								</div>
								<div className="divide-y divide-[var(--leads-line)]">
									{channelStats.map((st) => {
										const def = getTrafficChannelDef(st.channelId);
										return (
											<div key={st.channelId} className="p-3.5 sm:px-4 flex items-center justify-between gap-4">
												<div className="flex items-center gap-3 min-w-[160px]">
													<div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: def.color }} />
													<div>
														<p className="text-xs font-bold leading-tight">{st.name}</p>
														<p className="text-[11px] text-[var(--leads-muted)]">CAC ~{formatRubles(def.avgCacRub)}</p>
													</div>
												</div>
												<div className="flex items-center gap-6 text-right">
													<div>
														<p className="text-xs font-bold">{st.leadCount} обращений</p>
														<p className="text-[11px] text-[var(--leads-muted)]">{st.activeLeadsCount} в работе</p>
													</div>
													<div className="min-w-[80px]">
														<span className="text-xs font-bold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
															{st.conversionToArrivedPct}% дошли
														</span>
													</div>
													<div className="min-w-[110px] text-right">
														<p className="text-xs font-black text-teal-600 dark:text-teal-400">{formatRubles(st.totalRevenueRub)}</p>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					)}
				</main>

				{/* 3. ЭКСПРЕСС-КАРТОЧКА СОЗДАНИЯ ЛИДА ЗА 5 СЕКУНД */}
				{isCreateOpen && (
					<div
						className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
						onClick={(e) => { if (e.target === e.currentTarget) setIsCreateOpen(false); }}
						data-testid="create-lead-dialog"
					>
						<form
							onSubmit={handleCreateLead}
							className="w-full max-w-md bg-[var(--leads-paper)] border border-[var(--leads-line)] rounded-2xl shadow-2xl p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-100"
						>
							<div className="flex justify-between items-center border-b border-[var(--leads-line)] pb-3">
								<h3 className="text-sm font-bold flex items-center gap-2">
									<Plus size={16} className="text-[var(--leads-teal)]" /> Быстрое создание лида (5 сек)
								</h3>
								<button type="button" onClick={() => setIsCreateOpen(false)} className="text-[var(--leads-muted)] hover:text-[var(--leads-text)]">
									<X size={16} />
								</button>
							</div>
							<div className="flex flex-col gap-3">
								<div>
									<label className="text-xs font-semibold mb-1 block">Телефон пациента</label>
									<input
										type="tel"
										required
										value={formPhone}
										onChange={(e) => setFormPhone(e.target.value)}
										placeholder="+7 (___) ___-__-__"
										className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--leads-line)] bg-[var(--leads-paper-card)] focus:outline-none focus:border-[var(--leads-teal)]"
										data-testid="input-lead-phone"
									/>
								</div>
								<div>
									<label className="text-xs font-semibold mb-1 block">ФИО / Имя пациента</label>
									<input
										type="text"
										value={formName}
										onChange={(e) => setFormName(e.target.value)}
										placeholder="Например: Иванов Иван"
										className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--leads-line)] bg-[var(--leads-paper-card)] focus:outline-none focus:border-[var(--leads-teal)]"
										data-testid="input-lead-name"
									/>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className="text-xs font-semibold mb-1 block">Канал трафика</label>
										<select
											value={formChannel}
											onChange={(e) => setFormChannel(e.target.value as TrafficChannelId)}
											className="w-full px-2.5 py-2 text-xs rounded-xl border border-[var(--leads-line)] bg-[var(--leads-paper-card)]"
											data-testid="select-lead-channel"
										>
											{TRAFFIC_CHANNELS.map((ch) => (<option key={ch.id} value={ch.id}>{ch.name}</option>))}
										</select>
									</div>
									<div>
										<label className="text-xs font-semibold mb-1 block">Клиническая потребность</label>
										<select
											value={formNeed}
											onChange={(e) => setFormNeed(e.target.value as ClinicalNeedTag)}
											className="w-full px-2.5 py-2 text-xs rounded-xl border border-[var(--leads-line)] bg-[var(--leads-paper-card)]"
											data-testid="select-lead-need"
										>
											{CLINICAL_NEED_TAGS.map((n) => (
												<option key={n.tag} value={n.tag}>{n.tag} (~{formatRubles(n.defaultRevenueRub)})</option>
											))}
										</select>
									</div>
								</div>
							</div>
							<div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--leads-line)]">
								<button
									type="button"
									onClick={() => setIsCreateOpen(false)}
									className="px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[var(--leads-paper-subtle)] text-[var(--leads-muted)]"
								>
									Отмена
								</button>
								<button
									type="submit"
									className="leads-touch-target px-4 py-2 rounded-xl text-xs font-bold text-white bg-[var(--leads-teal)] hover:bg-[var(--leads-teal-hover)] transition-all shadow-xs"
									data-testid="submit-create-lead-btn"
								>
									Сохранить лид
								</button>
							</div>
						</form>
					</div>
				)}

				{/* 4. ДЕТАЛИ И 1-КЛИК КОНВЕРТАЦИЯ ВЫБРАННОГО ЛИДА (ФУТЕР / БОТТОМ-БАР) */}
				{selectedLead && (
					<footer
						className="leads-floating-bottom-bar flex flex-wrap items-center justify-between gap-3 border-t border-[var(--leads-line)] bg-[var(--leads-paper)] px-4 sm:px-6 py-3 shrink-0"
						data-testid="lead-details-bar"
					>
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-xl bg-teal-500/10 text-[var(--leads-teal)] flex items-center justify-center font-bold">
								<User size={18} />
							</div>
							<div>
								<div className="flex items-center gap-2">
									<h4 className="text-xs sm:text-sm font-bold">{selectedLead.name}</h4>
									<span className="text-[11px] text-[var(--leads-muted)]">{selectedLead.phone}</span>
								</div>
								<p className="text-[11px] text-[var(--leads-muted)] flex items-center gap-2">
									<span>{selectedLead.needTag}</span> •
									<span className="font-semibold text-teal-600 dark:text-teal-400">{formatRubles(selectedLead.potentialRevenueRub)}</span> •
									<span>Стадия: {getFunnelStageDef(selectedLead.stageId).label}</span>
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							{selectedLead.stageId === "new" && (
								<button
									type="button"
									onClick={() => handleMoveStage(selectedLead.id, "contacted")}
									className="leads-touch-target px-3 py-1.5 rounded-xl text-xs font-semibold border border-[var(--leads-line)] hover:bg-[var(--leads-paper-subtle)] transition-colors"
									data-testid="move-to-contacted-btn"
								>
									Перевести в «Квалифицирован»
								</button>
							)}
							{selectedLead.stageId === "contacted" && (
								<button
									type="button"
									onClick={() => handleMoveStage(selectedLead.id, "consult_booked")}
									className="leads-touch-target px-3 py-1.5 rounded-xl text-xs font-semibold border border-[var(--leads-line)] hover:bg-[var(--leads-paper-subtle)] transition-colors"
									data-testid="move-to-booked-btn"
								>
									Записать на консультацию
								</button>
							)}
							{/* 5. РОBHО ОДНА PRIMARY CTA: ЭКСПРЕСС-КОНВЕРТАЦИЯ В ПАЦИЕНТА В 1 КЛИК */}
							<button
								type="button"
								onClick={() => handleConvertToPatient(selectedLead)}
								className="leads-touch-target px-4 py-2 rounded-xl text-xs font-bold text-white bg-[var(--leads-teal)] hover:bg-[var(--leads-teal-hover)] transition-all shadow-xs flex items-center gap-1.5"
								data-testid="convert-lead-to-patient-cta"
							>
								<CheckCircle2 size={16} />
								<span>{selectedLead.isConverted ? "Карточка пациента создана" : "Конвертировать в пациента"}</span>
							</button>
							<button
								type="button"
								onClick={() => setSelectedLead(null)}
								className="leads-touch-target p-2 rounded-xl hover:bg-[var(--leads-paper-subtle)] text-[var(--leads-muted)]"
							>
								<X size={16} />
							</button>
						</div>
					</footer>
				)}
			</div>
		</div>
	);
};

export default LeadsStudioModal;
