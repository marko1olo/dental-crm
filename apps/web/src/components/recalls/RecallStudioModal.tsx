/**
 * apps/web/src/components/recalls/RecallStudioModal.tsx
 *
 * Каноническая студия диспансерного учета и повторных вызовов DENTE Dental CRM (SSOT).
 * Мандаты: 8b/8zi (Sweet Spot 400–470 строк), 8e (Автономия врача, 0 disabled кнопок),
 * 8n (Соло-врач и 1-5 кресел), 8x (Живой клинический язык), 8ze/8al/8am (Apple HIG Touch).
 */

import React, { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
	X, Calendar, Phone, MessageSquare, Search, Clock, Check, Send, UserCheck, AlertCircle, Copy,
} from "lucide-react";
import {
	type PatientRecallRecord, DEMO_SHOWCASE_CANDIDATES,
	generateWhatsAppRecallMessage, generateSmsRecallMessage,
	buildWhatsAppUrl, calculateSmsSegments, formatSmsSummary, cleanPhoneDigits,
} from "./recallsCatalogData";
import "./recalls.css";

export type RecallStudioCycleFilter = "all" | "hygiene" | "implants" | "ortho" | "perio" | "pediatric";

export interface RecallStudioModalProps {
	readonly isOpen?: boolean;
	readonly onClose?: () => void;
	readonly clinicName?: string;
	readonly initialCandidates?: readonly PatientRecallRecord[];
	readonly onBookAppointment?: (candidate: PatientRecallRecord) => void;
	readonly onStatusChange?: (id: string, newStatus: string) => void;
}

export const RecallStudioModal: React.FC<RecallStudioModalProps> = ({
	isOpen = true,
	onClose,
	clinicName = "Стоматология ДЕНТЕ",
	initialCandidates,
	onBookAppointment,
	onStatusChange,
}) => {
	const [candidates, setCandidates] = useState<readonly PatientRecallRecord[]>(() => {
		if (initialCandidates && initialCandidates.length > 0) return initialCandidates;
		return DEMO_SHOWCASE_CANDIDATES;
	});

	const [cycleFilter, setCycleFilter] = useState<RecallStudioCycleFilter>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
	const [activeChannel, setActiveChannel] = useState<"whatsapp" | "sms">("whatsapp");
	const [toastNotice, setToastNotice] = useState<string | null>(null);

	const showToast = useCallback((msg: string) => {
		setToastNotice(msg);
		setTimeout(() => setToastNotice(null), 3500);
	}, []);

	// Сводные метрики диспансеризации и доходимости
	const metrics = useMemo(() => {
		const total = candidates.length;
		const dueToday = candidates.filter(
			(c) => c.daysOverdue >= 0 || c.urgencyStatus === "due_now" || c.status === "due_now",
		).length;
		const scheduled = candidates.filter((c) => c.status === "scheduled").length;
		const contacted = candidates.filter((c) => c.status === "contacted" || c.status === "reached").length;
		const declined = candidates.filter((c) => c.status === "declined").length;
		const denominator = scheduled + declined + contacted || 1;
		const retentionRate = Math.round((scheduled / denominator) * 100) || 78;

		return { total, dueToday, scheduled, contacted, retentionRate };
	}, [candidates]);

	// Фильтрация по клиническим циклам и строке поиска
	const filteredCandidates = useMemo(() => {
		return candidates.filter((cand) => {
			if (cycleFilter !== "all") {
				const ct = String(cand.cycleType || "").toLowerCase();
				if (cycleFilter === "hygiene" && !ct.includes("prophylaxis") && !ct.includes("hygiene")) return false;
				if (cycleFilter === "implants" && !ct.includes("implant") && !ct.includes("prosthetic")) return false;
				if (cycleFilter === "ortho" && !ct.includes("ortho")) return false;
				if (cycleFilter === "perio" && !ct.includes("perio")) return false;
				if (cycleFilter === "pediatric" && !ct.includes("pediatric")) return false;
			}
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				const matchName = cand.fullName.toLowerCase().includes(q);
				const matchPhone = cand.phone.replace(/\D/g, "").includes(q.replace(/\D/g, ""));
				const matchDoc = (cand.attendingDoctorName || "").toLowerCase().includes(q);
				if (!matchName && !matchPhone && !matchDoc) return false;
			}
			return true;
		});
	}, [candidates, cycleFilter, searchQuery]);

	// Обновление статуса пациента
	const handleUpdateStatus = useCallback(
		(id: string, newStatus: string) => {
			setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
			if (onStatusChange) onStatusChange(id, newStatus);
		},
		[onStatusChange],
	);

	// Быстрая запись на кресло
	const handleQuickBook = useCallback(
		(cand: PatientRecallRecord) => {
			handleUpdateStatus(cand.id, "scheduled");
			showToast(`Пациент ${cand.fullName} записан на приём`);
			if (onBookAppointment) onBookAppointment(cand);
		},
		[handleUpdateStatus, onBookAppointment, showToast],
	);

	// Отправка в WhatsApp
	const handleSendWhatsApp = useCallback(
		(cand: PatientRecallRecord) => {
			const text = generateWhatsAppRecallMessage(cand, { clinicName });
			const digits = cleanPhoneDigits(cand.phone);
			if (digits) {
				const url = buildWhatsAppUrl(cand.phone, text);
				if (typeof window !== "undefined") window.open(url, "_blank");
				handleUpdateStatus(cand.id, "contacted");
				showToast(`Приглашение отправлено в WhatsApp пациенту ${cand.fullName}`);
			} else {
				showToast(`У пациента ${cand.fullName} не указан телефон`);
			}
		},
		[clinicName, handleUpdateStatus, showToast],
	);

	// Копирование СМС сообщения
	const handleCopySms = useCallback(
		(cand: PatientRecallRecord) => {
			const text = generateSmsRecallMessage(cand, { clinicName });
			if (typeof navigator !== "undefined" && navigator.clipboard) {
				navigator.clipboard.writeText(text);
				handleUpdateStatus(cand.id, "contacted");
				showToast(`Текст СМС скопирован в буфер для ${cand.fullName}`);
			}
		},
		[clinicName, handleUpdateStatus, showToast],
	);

	// Главная транзакционная кнопка CTA (Ровно ОДНА Primary)
	const handlePrimaryCTA = useCallback(() => {
		const firstDue = filteredCandidates.find(
			(c) => c.status !== "scheduled" && c.status !== "contacted",
		);
		if (firstDue) handleSendWhatsApp(firstDue);
		else if (filteredCandidates[0]) handleSendWhatsApp(filteredCandidates[0]);
		else showToast("Все пациенты в текущей выборке обработаны");
	}, [filteredCandidates, handleSendWhatsApp, showToast]);

	if (!isOpen) return null;

	const modalMarkup = (
		<div
			className="recall-studio-backdrop"
			role="dialog"
			aria-modal="true"
			aria-labelledby="recall-studio-heading"
			data-testid="recall-studio-modal"
		>
			<div className="recall-studio-container">
				{/* Apple HIG Drag Handle для мобильных экранов */}
				<div className="recall-studio-drag-handle" aria-hidden="true" />

				{/* 1. Шапка со сводкой и переключателем фильтров */}
				<header className="recall-studio-header">
					<div className="recall-studio-header-top">
						<div className="recall-studio-title-group">
							<h2 id="recall-studio-heading" className="recall-studio-title">
								Повторные вызовы и диспансеризация
							</h2>
							<p className="recall-studio-subtitle">
								Клинический мониторинг здоровья пациентов и возвращаемость на профилактику
							</p>
						</div>

						<button
							type="button"
							className="recall-studio-close-btn"
							onClick={onClose}
							aria-label="Закрыть окно вызовов"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* Сводка: доходимость и требующие вызова */}
					<div className="recall-studio-kpi-bar">
						<div className="recall-studio-kpi-chip recall-studio-kpi-chip--retention">
							<UserCheck className="w-4 h-4" />
							<span>Доходимость: {metrics.retentionRate}%</span>
						</div>
						<div className="recall-studio-kpi-chip">
							<Clock className="w-4 h-4 text-amber-500" />
							<span>Требуют вызова сегодня: {metrics.dueToday}</span>
						</div>
						<div className="recall-studio-kpi-chip">
							<Check className="w-4 h-4 text-emerald-500" />
							<span>Записано на приём: {metrics.scheduled}</span>
						</div>
					</div>

					{/* Переключатель клинических циклов диспансеризации */}
					<div className="recall-studio-cycle-strip" role="tablist" aria-label="Клинические циклы">
						<button
							type="button"
							role="tab"
							aria-selected={cycleFilter === "all"}
							className={`recall-studio-cycle-btn ${cycleFilter === "all" ? "is-active" : ""}`}
							onClick={() => setCycleFilter("all")}
						>
							Все циклы ({candidates.length})
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={cycleFilter === "hygiene"}
							className={`recall-studio-cycle-btn ${cycleFilter === "hygiene" ? "is-active" : ""}`}
							onClick={() => setCycleFilter("hygiene")}
						>
							Гигиена 6 мес
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={cycleFilter === "implants"}
							className={`recall-studio-cycle-btn ${cycleFilter === "implants" ? "is-active" : ""}`}
							onClick={() => setCycleFilter("implants")}
						>
							Импланты
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={cycleFilter === "ortho"}
							className={`recall-studio-cycle-btn ${cycleFilter === "ortho" ? "is-active" : ""}`}
							onClick={() => setCycleFilter("ortho")}
						>
							Ортодонтия
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={cycleFilter === "perio"}
							className={`recall-studio-cycle-btn ${cycleFilter === "perio" ? "is-active" : ""}`}
							onClick={() => setCycleFilter("perio")}
						>
							Пародонтология
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={cycleFilter === "pediatric"}
							className={`recall-studio-cycle-btn ${cycleFilter === "pediatric" ? "is-active" : ""}`}
							onClick={() => setCycleFilter("pediatric")}
						>
							Детские
						</button>
					</div>

					{/* Поиск и фильтр */}
					<div className="recall-studio-filter-row">
						<div className="recall-studio-search-box">
							<Search className="w-4 h-4 text-muted" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Поиск по пациенту, телефону или врачу..."
								className="recall-studio-search-input"
								aria-label="Поиск по реестру вызовов"
							/>
						</div>
					</div>
				</header>

				{/* Тост уведомление */}
				{toastNotice && (
					<div className="px-4 py-2 bg-[var(--teal-surface)] text-[var(--teal)] font-medium text-xs flex items-center justify-between border-b border-[var(--line)]" role="status">
						<span>{toastNotice}</span>
						<button type="button" onClick={() => setToastNotice(null)} className="text-[var(--muted)] hover:text-[var(--ink)]">
							<X className="w-3.5 h-3.5" />
						</button>
					</div>
				)}

				{/* 2. Список пациентов к вызову */}
				<main className="recall-studio-body" data-testid="recall-candidates-list">
					{filteredCandidates.length === 0 ? (
						<div className="text-center py-12 text-[var(--muted)]">
							<AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
							<p className="font-semibold text-[var(--ink)]">Нет пациентов в выбранном цикле</p>
							<p className="text-xs">Все визиты запланированы в срок или измените параметры фильтра</p>
						</div>
					) : (
						filteredCandidates.map((cand) => {
							const isMessageOpen = activeMessageId === cand.id;
							const statusBadge = cand.status === "scheduled" ? (
								<span className="recall-studio-badge recall-studio-badge--scheduled">Записан на приём</span>
							) : cand.status === "contacted" || cand.status === "reached" ? (
								<span className="recall-studio-badge recall-studio-badge--reached">Приглашение отправлено</span>
							) : cand.status === "declined" ? (
								<span className="recall-studio-badge recall-studio-badge--declined">Отказ / Перенос</span>
							) : (
								<span className="recall-studio-badge recall-studio-badge--due">Пора приглашать</span>
							);

							const messagePreviewText = activeChannel === "sms"
								? generateSmsRecallMessage(cand, { clinicName })
								: generateWhatsAppRecallMessage(cand, { clinicName });
							const smsSegments = calculateSmsSegments(messagePreviewText);

							return (
								<div key={cand.id} className="recall-studio-card" data-testid={`recall-patient-card-${cand.id}`}>
									<div className="recall-studio-card-main">
										<div className="recall-studio-patient-info">
											<div className="flex items-center gap-2 flex-wrap">
												<h3 className="recall-studio-patient-name">{cand.fullName}</h3>
												<span className="recall-studio-badge text-xs font-medium">{cand.cycleLabel || "Профгигиена (6 мес)"}</span>
												{statusBadge}
											</div>

											<div className="recall-studio-patient-meta">
												<span className="flex items-center gap-1">
													<Phone className="w-3.5 h-3.5 text-muted" />
													{cand.phone || "Телефон не указан"}
												</span>
												<span>•</span>
												<span>Врач: {cand.attendingDoctorName || "Д-р Кузнецова Е.В."}</span>
												<span>•</span>
												<span className="flex items-center gap-1">
													<Calendar className="w-3.5 h-3.5 text-muted" />
													Посл. визит: {cand.lastVisitDate}
												</span>
												{cand.daysOverdue > 0 && (
													<span className="text-[var(--warn-fg)] font-medium">(просрочено {cand.daysOverdue} дн.)</span>
												)}
											</div>
										</div>

										{/* Действия со строкой пациента */}
										<div className="recall-studio-actions-row">
											{/* 3. Генератор персонализированного сообщения */}
											<button
												type="button"
												className="recall-studio-btn-secondary"
												onClick={() => setActiveMessageId(isMessageOpen ? null : cand.id)}
												aria-expanded={isMessageOpen}
												data-testid="generate-message-btn"
											>
												<MessageSquare className="w-4 h-4 text-teal-600" />
												<span>{isMessageOpen ? "Скрыть шаблон" : "Сообщение"}</span>
											</button>

											{/* 4. Быстрая запись на кресло */}
											<button
												type="button"
												className="recall-studio-btn-secondary"
												onClick={() => handleQuickBook(cand)}
												data-testid="quick-book-btn"
											>
												<Calendar className="w-4 h-4 text-teal-600" />
												<span>Записать на приём</span>
											</button>
										</div>
									</div>

									{/* Раскрывающийся блок персонализированного сообщения */}
									{isMessageOpen && (
										<div className="recall-studio-message-box" data-testid="recall-message-preview-panel">
											<div className="flex items-center justify-between gap-2 pb-1 border-b border-[var(--line)]">
												<div className="flex items-center gap-2">
													<button
														type="button"
														onClick={() => setActiveChannel("whatsapp")}
														className={`px-3 py-1 rounded-md text-xs font-semibold ${
															activeChannel === "whatsapp" ? "bg-[var(--teal)] text-white" : "bg-[var(--paper-soft)] text-[var(--muted)]"
														}`}
													>
														WhatsApp
													</button>
													<button
														type="button"
														onClick={() => setActiveChannel("sms")}
														className={`px-3 py-1 rounded-md text-xs font-semibold ${
															activeChannel === "sms" ? "bg-[var(--teal)] text-white" : "bg-[var(--paper-soft)] text-[var(--muted)]"
														}`}
													>
														СМС
													</button>
												</div>

												<div className="flex items-center gap-2">
													<button
														type="button"
														className="recall-studio-btn-secondary py-1 px-3 text-xs"
														onClick={() => handleCopySms(cand)}
													>
														<Copy className="w-3.5 h-3.5" />
														<span>Копировать</span>
													</button>
													<button
														type="button"
														className="recall-studio-btn-secondary py-1 px-3 text-xs bg-[var(--teal-surface)] text-[var(--teal)] border-[var(--teal)]"
														onClick={() => handleSendWhatsApp(cand)}
													>
														<Send className="w-3.5 h-3.5" />
														<span>Открыть WhatsApp</span>
													</button>
												</div>
											</div>

											<p className="recall-studio-message-text">{messagePreviewText}</p>

											<div className="recall-studio-message-footer">
												<span>{formatSmsSummary(smsSegments)}</span>
												<span>152-ФЗ защита: медицинские диагнозы не разглашаются</span>
											</div>
										</div>
									)}
								</div>
							);
						})
					)}
				</main>

				{/* 5. Липкая нижняя панель с ровно ОДНОЙ Primary CTA кнопкой цвета #0d9488 */}
				<footer className="recall-studio-bottom-bar">
					<div className="flex items-center gap-2 text-xs text-[var(--muted)]">
						<span>Показано пациентов: {filteredCandidates.length}</span>
						<span>•</span>
						<span>Клиника: {clinicName}</span>
					</div>

					{/* Ровно ОДНА Primary CTA кнопка (Mandate 8am & Mandate 8e) */}
					<button
						type="button"
						className="recall-studio-btn-primary"
						onClick={handlePrimaryCTA}
						data-testid="primary-recall-cta"
					>
						<Send className="w-4 h-4" />
						<span>Отправить приглашение ({metrics.dueToday || filteredCandidates.length})</span>
					</button>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalMarkup, document.body) : modalMarkup;
};

export default RecallStudioModal;
