/**
 * Patient Mobile Portal 3D Odontogram & Treatment Progress Timeline Modal
 * (DOMAIN: PORTAL TIMELINE)
 *
 * Интерактивный мобильный портал для пациента:
 * - Понятная карта зубов (Odontogram) с простыми статусами («Пломба», «Имплант», «Винир»)
 * - Хронологический прогресс лечения с фотопротоколом «До / После» и рентген-снимками
 * - Рекомендации лечащего врача по домашнему уходу
 * - Финансовая прозрачность и расчет налогового вычета 13% для ФНС
 */

import type React from "react";
import { useMemo, useState } from "react";
import {
	Activity,
	Award,
	Calendar,
	Camera,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Circle,
	Clock,
	DollarSign,
	FileText,
	Heart,
	HelpCircle,
	Image as ImageIcon,
	Info,
	Percent,
	Shield,
	Smile,
	Sparkles,
	Star,
	User,
	X,
} from "lucide-react";
import {
	DEMO_PATIENT_PORTAL_TIMELINE,
	PLAIN_LANGUAGE_TOOTH_STATUSES,
	getToothAnatomyInfo,
	type PatientFriendlyToothStatus,
	type PatientPortalTimelineData,
	type PatientPortalVisitItem,
} from "./portalTimelinePresets";
import {
	aggregateToothStatuses,
	calculateFinancialLedger,
	calculatePortalProgress,
	filterTimelineEvents,
	generateTaxCertificateRequest,
} from "./portalTimelineEngine";
import "./portalTimeline.css";

export interface PatientPortalTimelineModalProps {
	readonly isOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly initialData?: PatientPortalTimelineData | undefined;
	readonly onRequestTaxCertificate?: ((requestText: string) => void) | undefined;
}

export const PatientPortalTimelineModal: React.FC<PatientPortalTimelineModalProps> = ({
	isOpen = true,
	onClose,
	initialData,
	onRequestTaxCertificate,
}) => {
	const data = initialData || DEMO_PATIENT_PORTAL_TIMELINE;

	const [selectedToothFdi, setSelectedToothFdi] = useState<string>("1.6");
	const [timelineFilter, setTimelineFilter] = useState<"all" | "completed" | "scheduled" | "with_media">("all");
	const [expandedVisitId, setExpandedVisitId] = useState<string | null>("vis-4");
	const [statusNotice, setStatusNotice] = useState<string | null>(null);

	// Расчеты прогресса и финансов
	const progress = useMemo(() => calculatePortalProgress(data), [data]);
	const finance = useMemo(() => calculateFinancialLedger(data), [data]);
	const toothAgg = useMemo(() => aggregateToothStatuses(data.toothStatuses), [data.toothStatuses]);
	const taxRequest = useMemo(
		() => generateTaxCertificateRequest(data.patientName, finance.totalPaidRub, true),
		[data.patientName, finance.totalPaidRub],
	);

	// Выбранный зуб
	const selectedToothInfo = useMemo(() => {
		const anatomy = getToothAnatomyInfo(selectedToothFdi);
		const statusKey = data.toothStatuses[selectedToothFdi] || "healthy_observed";
		const statusInfo = PLAIN_LANGUAGE_TOOTH_STATUSES[statusKey] || PLAIN_LANGUAGE_TOOTH_STATUSES.healthy_observed;
		return { anatomy, statusKey, statusInfo };
	}, [selectedToothFdi, data.toothStatuses]);

	// Отфильтрованные визиты
	const filteredVisits = useMemo(() => {
		return filterTimelineEvents(data.visitsHistory, timelineFilter);
	}, [data.visitsHistory, timelineFilter]);

	// Верхняя и нижняя челюсти для зубной формулы
	const upperTeeth = ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"];
	const lowerTeeth = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"];

	const handleToothClick = (fdiFormatted: string) => {
		setSelectedToothFdi(fdiFormatted);
	};

	const handleTaxRequestClick = () => {
		if (onRequestTaxCertificate) {
			onRequestTaxCertificate(taxRequest.applicationTextRu);
		}
		setStatusNotice(`Заявка на справку для налоговой на сумму ${finance.totalPaidRub.toLocaleString("ru-RU")} ₽ успешно отправлена администратору.`);
		setTimeout(() => setStatusNotice(null), 4000);
	};

	if (!isOpen) return null;

	return (
		<div
			className="portal-timeline-backdrop"
			role="dialog"
			aria-modal="true"
			aria-labelledby="portal-modal-title"
		>
			<div className="portal-timeline-modal" data-testid="patient-portal-modal">
				{/* Header */}
				<header className="pt-header">
					<div className="pt-header-user">
						<div className="pt-avatar" aria-hidden="true">
							{data.patientName.charAt(0)}
						</div>
						<div>
							<h2 id="portal-modal-title" className="pt-header-title">
								Личный кабинет: {data.patientName}
							</h2>
							<p className="pt-header-subtitle">
								{data.curatingDoctor} &bull; {data.activePlanTitle}
							</p>
						</div>
					</div>

					{onClose ? (
						<button
							type="button"
							className="pt-close-btn"
							onClick={onClose}
							aria-label="Закрыть личный кабинет"
						>
							<X size={20} />
						</button>
					) : null}
				</header>

				{/* Notice Banner */}
				{statusNotice ? (
					<div
						style={{
							background: "var(--pt-success-light)",
							color: "var(--pt-success)",
							padding: "8px 20px",
							fontSize: "0.875rem",
							fontWeight: 600,
							display: "flex",
							alignItems: "center",
							gap: "8px",
						}}
					>
						<CheckCircle2 size={16} />
						<span>{statusNotice}</span>
					</div>
				) : null}

				{/* Body */}
				<div className="pt-body">
					{/* Progress Overview & Next Visit */}
					<div className="pt-overview-grid">
						{/* Progress Card */}
						<div className="pt-card">
							<h3 className="pt-card-title">
								<Sparkles size={16} style={{ color: "var(--pt-primary)" }} />
								<span>Прогресс плана лечения</span>
							</h3>

							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
								<span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--pt-primary)" }}>
									{progress.overallProgressPercent}%
								</span>
								<span style={{ fontSize: "0.8125rem", color: "var(--pt-text-muted)" }}>
									Завершено {progress.completedVisitsCount} из {progress.totalVisitsPlanned} визитов
								</span>
							</div>

							<div className="pt-progress-bar-bg">
								<div
									className="pt-progress-bar-fill"
									style={{ width: `${progress.overallProgressPercent}%` }}
								/>
							</div>
						</div>

						{/* Next Visit Card */}
						{data.nextScheduledVisit ? (
							<div className="pt-card" style={{ borderColor: "var(--pt-primary)" }}>
								<h3 className="pt-card-title">
									<Calendar size={16} style={{ color: "var(--pt-primary)" }} />
									<span>Следующий визит</span>
								</h3>

								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
									<strong style={{ fontSize: "1rem", color: "var(--pt-text-main)" }}>
										{data.nextScheduledVisit.dateIso} в {data.nextScheduledVisit.timeRu}
									</strong>
									<span style={{ fontSize: "0.75rem", background: "var(--pt-primary-light)", color: "var(--pt-primary)", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
										Запись подтверждена
									</span>
								</div>

								<p style={{ fontSize: "0.8125rem", margin: 0, color: "var(--pt-text-muted)" }}>
									{data.nextScheduledVisit.titleRu} ({data.nextScheduledVisit.doctorName})
								</p>
							</div>
						) : null}
					</div>

					{/* Interactive Patient Odontogram (Tooth Formula) */}
					<section className="pt-odontogram-card">
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<h3 className="pt-card-title" style={{ margin: 0 }}>
								<Smile size={16} style={{ color: "var(--pt-primary)" }} />
								<span>Интерактивная карта улыбки (Нажмите на зуб для просмотра)</span>
							</h3>
						</div>

						{/* Upper Jaw */}
						<div>
							<div style={{ fontSize: "0.6875rem", color: "var(--pt-text-muted)", textAlign: "center", marginBottom: "4px" }}>
								Верхняя челюсть
							</div>
							<div className="pt-tooth-grid">
								{upperTeeth.map((t) => {
									const fdi = `${t[0]}.${t[1]}`;
									const statusKey = data.toothStatuses[fdi] || "healthy_observed";
									const info = PLAIN_LANGUAGE_TOOTH_STATUSES[statusKey] || PLAIN_LANGUAGE_TOOTH_STATUSES.healthy_observed;
									const isSelected = selectedToothFdi === fdi;

									return (
										<button
											key={fdi}
											type="button"
											className={`pt-tooth-btn ${isSelected ? "selected" : ""}`}
											onClick={() => handleToothClick(fdi)}
											title={`${fdi} — ${info.titleRu}`}
										>
											<span className="pt-tooth-num">{fdi}</span>
											<span
												className="pt-tooth-indicator"
												style={{ background: info.colorHex }}
											/>
										</button>
									);
								})}
							</div>
						</div>

						{/* Lower Jaw */}
						<div>
							<div style={{ fontSize: "0.6875rem", color: "var(--pt-text-muted)", textAlign: "center", marginBottom: "4px" }}>
								Нижняя челюсть
							</div>
							<div className="pt-tooth-grid">
								{lowerTeeth.map((t) => {
									const fdi = `${t[0]}.${t[1]}`;
									const statusKey = data.toothStatuses[fdi] || "healthy_observed";
									const info = PLAIN_LANGUAGE_TOOTH_STATUSES[statusKey] || PLAIN_LANGUAGE_TOOTH_STATUSES.healthy_observed;
									const isSelected = selectedToothFdi === fdi;

									return (
										<button
											key={fdi}
											type="button"
											className={`pt-tooth-btn ${isSelected ? "selected" : ""}`}
											onClick={() => handleToothClick(fdi)}
											title={`${fdi} — ${info.titleRu}`}
										>
											<span className="pt-tooth-num">{fdi}</span>
											<span
												className="pt-tooth-indicator"
												style={{ background: info.colorHex }}
											/>
										</button>
									);
								})}
							</div>
						</div>

						{/* Selected Tooth Detail Banner */}
						<div className="pt-tooth-detail-box">
							<div>
								<strong style={{ fontSize: "0.9375rem" }}>
									{selectedToothInfo.anatomy.friendlyNameRu}
								</strong>
								<p style={{ fontSize: "0.8125rem", color: "var(--pt-text-muted)", margin: "2px 0 0 0" }}>
									{selectedToothInfo.statusInfo.descriptionRu}
								</p>
							</div>

							<div
								style={{
									background: selectedToothInfo.statusInfo.colorHex,
									color: "#ffffff",
									padding: "6px 12px",
									borderRadius: "20px",
									fontSize: "0.75rem",
									fontWeight: 700,
									flexShrink: 0,
									display: "flex",
									alignItems: "center",
									gap: "4px",
								}}
							>
								{selectedToothInfo.statusInfo.icon === "sparkles" && <Sparkles size={14} />}
								{selectedToothInfo.statusInfo.icon === "diamond" && <Award size={14} />}
								{selectedToothInfo.statusInfo.icon === "microscope" && <Activity size={14} />}
								{selectedToothInfo.statusInfo.icon === "crown" && <Award size={14} />}
								{selectedToothInfo.statusInfo.icon === "smile" && <Smile size={14} />}
								{selectedToothInfo.statusInfo.icon === "implant" && <Activity size={14} />}
								{selectedToothInfo.statusInfo.icon === "shield" && <Shield size={14} />}
								{selectedToothInfo.statusInfo.icon === "clock" && <Clock size={14} />}
								{selectedToothInfo.statusInfo.icon === "circle" && <Circle size={14} />}
								<span>{selectedToothInfo.statusInfo.shortBadge}</span>
							</div>
						</div>
					</section>

					{/* Chronological Visit Timeline */}
					<section className="pt-odontogram-card">
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
							<h3 className="pt-card-title" style={{ margin: 0 }}>
								<Clock size={16} style={{ color: "var(--pt-primary)" }} />
								<span>История приемов & фотопротокол</span>
							</h3>

							<div style={{ display: "flex", gap: "4px" }}>
								<button
									type="button"
									className="pt-close-btn"
									style={{
										minHeight: "36px",
										padding: "4px 10px",
										fontSize: "0.75rem",
										fontWeight: timelineFilter === "all" ? 700 : 500,
										background: timelineFilter === "all" ? "var(--pt-primary-light)" : "transparent",
										color: timelineFilter === "all" ? "var(--pt-primary)" : "var(--pt-text-muted)",
									}}
									onClick={() => setTimelineFilter("all")}
								>
									Все ({data.visitsHistory.length})
								</button>

								<button
									type="button"
									className="pt-close-btn"
									style={{
										minHeight: "36px",
										padding: "4px 10px",
										fontSize: "0.75rem",
										fontWeight: timelineFilter === "with_media" ? 700 : 500,
										background: timelineFilter === "with_media" ? "var(--pt-primary-light)" : "transparent",
										color: timelineFilter === "with_media" ? "var(--pt-primary)" : "var(--pt-text-muted)",
									}}
									onClick={() => setTimelineFilter("with_media")}
								>
									С фото и снимками
								</button>
							</div>
						</div>

						{/* Feed */}
						<div className="pt-timeline-feed">
							{filteredVisits.map((visit) => {
								const isExpanded = expandedVisitId === visit.id;

								return (
									<div key={visit.id} className="pt-visit-item" data-testid={`visit-item-${visit.id}`}>
										<div
											className="pt-visit-header"
											onClick={() => setExpandedVisitId((p) => (p === visit.id ? null : visit.id))}
										>
											<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
												<span className="pt-visit-date-badge">
													{visit.dateIso} &bull; {visit.timeRu}
												</span>
												<strong style={{ fontSize: "0.875rem" }}>{visit.titleRu}</strong>
											</div>

											<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
												<span style={{ fontSize: "0.8125rem", fontWeight: 700 }}>
													{visit.amountRub.toLocaleString("ru-RU")} ₽
												</span>
												{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
											</div>
										</div>

										{isExpanded && (
											<div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "6px" }}>
												<div style={{ fontSize: "0.75rem", color: "var(--pt-text-muted)" }}>
													Врач: <strong>{visit.doctorName}</strong> ({visit.doctorSpecialityRu}) &bull; {visit.clinicName}
												</div>

												{/* Procedures */}
												<ul className="pt-proc-list">
													{visit.proceduresSummary.map((p, idx) => (
														<li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
															<CheckCircle2 size={14} style={{ color: "var(--pt-success)", flexShrink: 0, marginTop: "2px" }} />
															<span>{p}</span>
														</li>
													))}
												</ul>

												{/* Care instructions */}
												{visit.careInstructionsRu.length > 0 && (
													<div className="pt-care-alert">
														<Heart size={14} style={{ flexShrink: 0, marginTop: "2px" }} />
														<div>
															<strong>Рекомендации врача по уходу:</strong>
															<div style={{ marginTop: "2px" }}>
																{visit.careInstructionsRu.join(". ")}
															</div>
														</div>
													</div>
												)}

												{/* Photos and X-Rays */}
												{visit.mediaAttachments.length > 0 && (
													<div>
														<div style={{ fontSize: "0.75rem", fontWeight: 700, marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
															<Camera size={14} />
															<span>Фото и снимки приема:</span>
														</div>
														<div className="pt-media-strip">
															{visit.mediaAttachments.map((media) => (
																<div key={media.id} className="pt-media-card">
																	<img
																		src={media.url}
																		alt={media.titleRu}
																		className="pt-media-thumb"
																	/>
																	<div className="pt-media-caption">
																		<strong>{media.titleRu}</strong>
																		{media.doctorNote && (
																			<p style={{ margin: "2px 0 0 0" }}>{media.doctorNote}</p>
																		)}
																	</div>
																</div>
															))}
														</div>
													</div>
												)}
											</div>
										)}
									</div>
								);
							})}
						</div>
					</section>

					{/* Financial Transparency & Tax Deduction */}
					<section className="pt-card">
						<h3 className="pt-card-title">
							<DollarSign size={16} style={{ color: "var(--pt-primary)" }} />
							<span>Финансовая прозрачность & Налоговый вычет 13%</span>
						</h3>

						<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
							<div className="pt-finance-row">
								<span style={{ color: "var(--pt-text-muted)" }}>Общая стоимость плана:</span>
								<strong>{finance.totalPlanCostRub.toLocaleString("ru-RU")} ₽</strong>
							</div>
							<div className="pt-finance-row">
								<span style={{ color: "var(--pt-text-muted)" }}>Оплачено:</span>
								<strong style={{ color: "var(--pt-success)" }}>
									{finance.totalPaidRub.toLocaleString("ru-RU")} ₽ ({finance.paidPercent}%)
								</strong>
							</div>
							<div className="pt-finance-row">
								<span style={{ color: "var(--pt-text-muted)" }}>Остаток к оплате:</span>
								<strong>{finance.remainingDueRub.toLocaleString("ru-RU")} ₽</strong>
							</div>
							<div className="pt-finance-row">
								<span style={{ color: "var(--pt-text-muted)" }}>Бонусы и кэшбэк:</span>
								<strong style={{ color: "var(--pt-primary)" }}>
									{finance.loyaltyBonusBalance.toLocaleString("ru-RU")} баллов
								</strong>
							</div>
						</div>

						{/* 1-Click Tax Certificate Action */}
						<div
							style={{
								background: "var(--pt-primary-light)",
								border: "1px solid var(--pt-primary)",
								borderRadius: "var(--pt-radius-sm)",
								padding: "12px",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: "12px",
								marginTop: "8px",
								flexWrap: "wrap",
							}}
						>
							<div>
								<strong style={{ fontSize: "0.875rem", color: "var(--pt-text-main)" }}>
									Справка для налогового вычета 13% (ФНС)
								</strong>
								<p style={{ fontSize: "0.75rem", color: "var(--pt-text-muted)", margin: "2px 0 0 0" }}>
									Вы можете вернуть до <strong>{taxRequest.refundEstimatedRub.toLocaleString("ru-RU")} ₽</strong> по расходам на лечение.
								</p>
							</div>

							<button
								type="button"
								className="pt-close-btn"
								style={{
									background: "var(--pt-primary)",
									color: "#ffffff",
									padding: "8px 14px",
									fontSize: "0.8125rem",
									fontWeight: 700,
									border: "none",
								}}
								onClick={handleTaxRequestClick}
								data-testid="request-tax-btn"
							>
								Заказать справку в 1 клик
							</button>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
};

export default PatientPortalTimelineModal;
