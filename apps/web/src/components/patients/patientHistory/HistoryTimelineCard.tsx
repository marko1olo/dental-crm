/**
 * apps/web/src/components/patients/patientHistory/HistoryTimelineCard.tsx
 *
 * DENTE Dental CRM — Компонент отдельного визита/события в клиническом таймлайне.
 * Layer 1: Десктопная строка, мобильная Apple Health карточка и аккордеон протокола ЭМК 043/у.
 */

import React from "react";
import {
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	ClipboardList,
	Clock,
	ExternalLink,
	Eye,
	Package,
	PanelRight,
	Printer,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	User,
} from "lucide-react";
import { ToothMolar } from "../../icons/DentalIcons";
import { showToast } from "../../GlobalToast";
import type { ClinicalVisitItem } from "./types";

export interface HistoryTimelineCardProps {
	visit: ClinicalVisitItem;
	isExpanded: boolean;
	onToggle: () => void;
	onExtract043: (visit: ClinicalVisitItem) => void;
	onAddToTreatmentPlan: (visit: ClinicalVisitItem) => void;
	onNavigateToVisit?: ((visitId: string) => void) | undefined;
	onOpenDetailDrawer?: ((visit: ClinicalVisitItem) => void) | undefined;
}

export const HistoryTimelineCard: React.FC<HistoryTimelineCardProps> = React.memo(
	function HistoryTimelineCard({
		visit,
		isExpanded,
		onToggle,
		onExtract043,
		onAddToTreatmentPlan,
		onNavigateToVisit,
		onOpenDetailDrawer,
	}) {
		const formattedDateStr = (() => {
			try {
				const d = new Date(visit.date);
				if (!Number.isNaN(d.getTime())) {
					return `${d.toLocaleDateString("ru-RU")}${visit.time ? ` ${visit.time}` : ""}`;
				}
			} catch {}
			return visit.date;
		})();

		return (
			<div
				className={`clinical-visit-accordion ${isExpanded ? "expanded" : ""}`}
				data-testid={`timeline-visit-card-${visit.id}`}
			>
				{/* ─── DESKTOP COMPACT ROW (hidden on mobile, visible on md+) ────── */}
				<div
					className="clinical-visit-compact-row hidden md:flex"
					onClick={onToggle}
					role="button"
					tabIndex={0}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							onToggle();
						}
					}}
					aria-expanded={isExpanded}
					title="Нажмите, чтобы развернуть протокол приёма"
				>
					<div className="clinical-visit-left-pills">
						{/* Кнопка-индикатор раскрытия */}
						<span className={`clinical-row-chevron-badge ${isExpanded ? "expanded" : ""}`} aria-hidden="true">
							{isExpanded ? (
								<ChevronDown className="w-3.5 h-3.5 text-[var(--teal)]" />
							) : (
								<ChevronRight className="w-3.5 h-3.5" />
							)}
						</span>

						{/* Дата */}
						<span className="clinical-pill clinical-pill-date">
							<Clock className="w-3 h-3 text-[var(--muted)]" />
							<span>{formattedDateStr}</span>
						</span>

						{/* Номер зуба (если есть) */}
						{visit.toothNumber ? (
							<span
								className="clinical-pill clinical-pill-tooth"
								data-testid={`pill-tooth-${visit.toothNumber}`}
							>
								<ToothMolar className="w-3.5 h-3.5 text-[var(--teal)]" />
								<span>Зуб {visit.toothNumber}</span>
							</span>
						) : (
							<span className="clinical-pill text-[var(--muted)]">
								<span>Общий приём</span>
							</span>
						)}

						{/* Диагноз МКБ-10 */}
						<span
							className="clinical-pill clinical-pill-diagnosis"
							title={`${visit.diagnosisCode} ${visit.diagnosisTitle}`}
						>
							<span className="font-mono text-teal-700 dark:text-teal-400 font-black">
								{visit.diagnosisCode}
							</span>
							<span className="truncate">{visit.diagnosisTitle}</span>
						</span>

						{/* Врач */}
						<span className="clinical-pill clinical-pill-doctor hidden md:inline-flex">
							<User className="w-3 h-3 text-[var(--muted)]" />
							<span>{visit.doctorName}</span>
						</span>

						{/* Направление */}
						<span className="clinical-pill text-[10px] hidden lg:inline-flex bg-slate-100 dark:bg-slate-800 text-[var(--muted)]">
							{visit.specialtyLabelRu}
						</span>
					</div>

					<div className="clinical-visit-right-pills">
						{/* Сумма */}
						<span className="clinical-pill clinical-pill-amount">
							{visit.amountRub.toLocaleString("ru-RU")} ₽
						</span>

						{/* Статус оплаты и гарантия */}
						<span className="clinical-pill clinical-pill-status-paid">
							<Check className="w-3 h-3" />
							<span>Оплачен</span>
						</span>

						{visit.warrantyUntil && (
							<span
								className="clinical-pill clinical-pill-warranty hidden sm:inline-flex"
								title="Гарантийный период на манипуляцию"
							>
								<ShieldCheck className="w-3 h-3 text-indigo-500" />
								<span>Гарантия до {visit.warrantyUntil}</span>
							</span>
						)}
					</div>
				</div>

				{/* ─── MOBILE APPLE HEALTH RECORDS CARD HEADER (visible on mobile <md) ────── */}
				<div
					className="clinical-mobile-card-header flex md:hidden"
					onClick={onToggle}
					role="button"
					tabIndex={0}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							onToggle();
						}
					}}
					aria-expanded={isExpanded}
					title="Нажмите, чтобы развернуть протокол приёма"
				>
					{/* Top Meta: Specialty Chip + Date/Time + Chevron */}
					<div className="clinical-mobile-header-top">
						<div className="clinical-mobile-meta-group">
							<span className={`clinical-specialty-pill specialty-${visit.specialty}`}>
								{visit.specialtyLabelRu}
							</span>
							<span className="clinical-mobile-date">
								<Clock className="w-3 h-3 text-[var(--muted)]" />
								<span>{formattedDateStr}</span>
							</span>
						</div>
						<span className={`clinical-row-chevron-badge ${isExpanded ? "expanded" : ""}`} aria-hidden="true">
							{isExpanded ? (
								<ChevronDown className="w-4 h-4 text-[var(--teal)]" />
							) : (
								<ChevronRight className="w-4 h-4" />
							)}
						</span>
					</div>

					{/* Middle Line: Big Prominent Diagnosis + Tooth */}
					<div className="clinical-mobile-diagnosis-row">
						<div className="clinical-mobile-diagnosis">
							<span className="clinical-diagnosis-code font-mono font-black text-teal-600 dark:text-teal-400">
								{visit.diagnosisCode}
							</span>
							<span className="clinical-diagnosis-title font-semibold text-[var(--ink)]">
								{visit.diagnosisTitle}
							</span>
						</div>
						{visit.toothNumber && (
							<span className="clinical-pill-tooth shrink-0" data-testid={`mobile-pill-tooth-${visit.toothNumber}`}>
								<ToothMolar className="w-3.5 h-3.5 text-[var(--teal)]" />
								<span>Зуб {visit.toothNumber}</span>
							</span>
						)}
					</div>

					{/* Bottom Line: Doctor + Finances + Status */}
					<div className="clinical-mobile-bottom-row">
						<div className="clinical-mobile-doctor">
							<User className="w-3 h-3 text-[var(--muted)]" />
							<span className="truncate">{visit.doctorName}</span>
						</div>
						<div className="clinical-mobile-finances">
							<span className="clinical-mobile-amount font-mono font-bold text-[var(--ink)]">
								{visit.amountRub.toLocaleString("ru-RU")} ₽
							</span>
							<span className={`clinical-mobile-payment-badge status-${visit.paymentStatus}`}>
								{visit.isPaid ? (
									<>
										<Check className="w-3 h-3" />
										<span>Оплачен</span>
									</>
								) : (
									<span>Запланирован</span>
								)}
							</span>
						</div>
					</div>
				</div>

				{/* ─── EXPANDED DETAILED PROTOCOL PANE ──────────────── */}
				{isExpanded && (
					<div
						className="clinical-visit-details-pane"
						data-testid={`timeline-visit-details-${visit.id}`}
					>
						{/* SOAP Сетка клинических данных Формы 043/у */}
						<div className="clinical-soap-grid">
							{/* Жалобы */}
							<div className="clinical-soap-card">
								<div className="clinical-soap-title">
									<Clock className="w-3 h-3 text-amber-500" />
									<span>Жалобы (Subjective)</span>
								</div>
								<div className="clinical-soap-body">
									{visit.complaints || "Активных жалоб не предъявляет."}
								</div>
							</div>

							{/* Объективный статус */}
							<div className="clinical-soap-card">
								<div className="clinical-soap-title">
									<Stethoscope className="w-3 h-3 text-teal-500" />
									<span>Объективно (Status Localis)</span>
								</div>
								<div className="clinical-soap-body">
									{visit.statusLocalis || "Слизистая без воспаления, десневой край интактен."}
								</div>
							</div>

							{/* Протокол лечения */}
							<div className="clinical-soap-card md:col-span-2">
								<div className="clinical-soap-title">
									<Sparkles className="w-3 h-3 text-indigo-500" />
									<span>Протокол лечения и манипуляции (Assessment & Plan)</span>
								</div>
								<div className="clinical-soap-body font-normal">
									{visit.treatmentProtocol || "Проведено плановый осмотр."}
								</div>
							</div>

							{/* Рекомендации */}
							{visit.recommendations && (
								<div className="clinical-soap-card md:col-span-2">
									<div className="clinical-soap-title">
										<CheckCircle2 className="w-3 h-3 text-emerald-500" />
										<span>Назначения и рекомендации</span>
									</div>
									<div className="clinical-soap-body">
										{visit.recommendations}
									</div>
								</div>
							)}
						</div>

						{/* Списанные материалы и прикрепленные снимки (Apple Health Records Grid) */}
						{((visit.attachedScans && visit.attachedScans.length > 0) || visit.attachedScan || (visit.materialsDeducted && visit.materialsDeducted.length > 0)) && (
							<div className="clinical-attachments-row">
								{/* Сетка снимков RVG / КТ / Фото */}
								{(() => {
									const scansList = visit.attachedScans && visit.attachedScans.length > 0
										? visit.attachedScans
										: visit.attachedScan
											? [visit.attachedScan]
											: [];

									if (scansList.length === 0) return null;

									return (
										<div className="clinical-scans-section w-full">
											<div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5 mb-2">
												<Eye className="w-3.5 h-3.5 text-[var(--teal)]" />
												<span>Прикрепленные снимки и рентгенограммы ({scansList.length})</span>
											</div>
											<div className="clinical-scans-grid">
												{scansList.map((scan, sIdx) => (
													<div
														key={sIdx}
														className="clinical-scan-card"
														title={`${scan.title} — нажмите для просмотра`}
														onClick={(e) => {
															e.stopPropagation();
															showToast(`Просмотр снимка: ${scan.title}`, "info");
														}}
													>
														<div className="clinical-scan-thumb">
															<img
																src={scan.previewUrl}
																alt={scan.title}
																loading="lazy"
															/>
															<span className="clinical-scan-kind-badge">
																{scan.kind}
															</span>
														</div>
														<div className="clinical-scan-meta">
															<span className="clinical-scan-title truncate">{scan.title}</span>
															{scan.tooth && (
																<span className="clinical-scan-tooth">Зуб {scan.tooth}</span>
															)}
														</div>
													</div>
												))}
											</div>
										</div>
									);
								})()}

								{/* Списанные материалы по техкарте (Мандат 8v) */}
								{visit.materialsDeducted && visit.materialsDeducted.length > 0 && (
									<div className="clinical-materials-section w-full">
										<div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
											<Package className="w-3.5 h-3.5 text-purple-500" />
											<span>Списано со склада по техкарте:</span>
										</div>
										<div className="flex flex-wrap gap-1.5">
											{visit.materialsDeducted.map((mat, mIdx) => (
												<span
													key={mIdx}
													className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] font-medium inline-flex items-center gap-1"
												>
													<span>{mat.name}</span>
													<strong className="text-[var(--teal)] font-mono">
														({mat.quantity} {mat.unit})
													</strong>
												</span>
											))}
										</div>
									</div>
								)}
							</div>
						)}

						{/* Нижняя панель действий протокола (Медицинская выписка + В план лечения) */}
						<div className="clinical-details-actions">
							{visit.warrantyUntil && (
								<div className="clinical-warranty-badge">
									<ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
									<span>
										Гарантия: <strong>до {visit.warrantyUntil}</strong>
									</span>
								</div>
							)}

							<div className="clinical-actions-btn-group">
								{onOpenDetailDrawer && (
									<button
										type="button"
										onClick={() => onOpenDetailDrawer(visit)}
										className="clinical-btn-print"
										data-testid={`btn-detail-drawer-${visit.id}`}
										title="Открыть подробный протокол в боковой панели"
									>
										<PanelRight className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
										<span>Шторка протокола</span>
									</button>
								)}

								<button
									type="button"
									onClick={() => onExtract043(visit)}
									className="clinical-btn-print"
									data-testid={`btn-extract-043-${visit.id}`}
									title="Сформировать медицинскую выписку из карты"
								>
									<Printer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
									<span>Выписка из карты</span>
								</button>

								<button
									type="button"
									onClick={() => onAddToTreatmentPlan(visit)}
									className="clinical-btn-plan"
									data-testid={`btn-add-to-plan-${visit.id}`}
									title="Включить клинический диагноз и манипуляцию в план лечения"
								>
									<ClipboardList className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
									<span>В план лечения</span>
								</button>

								<button
									type="button"
									onClick={() => {
										if (onNavigateToVisit) {
											onNavigateToVisit(visit.id);
										} else {
											showToast(`Переход к протоколу визита ${visit.id}`, "info");
										}
									}}
									className="clinical-btn-goto"
									data-testid={`btn-goto-visit-${visit.id}`}
									title="Перейти к полной карте приёма"
								>
									<span>К визиту</span>
									<ExternalLink className="w-3.5 h-3.5 shrink-0" />
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		);
	},
);

HistoryTimelineCard.displayName = "HistoryTimelineCard";
