/**
 * FamilyDentalCareHubWidget.tsx — Семейный хаб профилактики, гигиены и оценки кариес-риска (CAMBRA)
 *
 * Функционал:
 * 1. Единый семейный календарь чек-апов и 6-месячный цикл профессиональной гигиены полости рта (GBT / Air-Flow).
 * 2. Оценка кариес-риска по международному стандарту CAMBRA (Caries Management by Risk Assessment) для каждого члена семьи.
 * 3. Пакетная запись «Параллельный приём: Родитель + Ребёнок» (одновременные смежные кресла, экономия времени до 60 мин и семейная скидка 10%).
 * 4. Напоминания и PUSH-уведомления с тач-таргетами >= 44px по закону Фиттса.
 */

import React, { useState, useMemo, useCallback } from "react";
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	Award,
	Calendar,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	Heart,
	Info,
	PlusCircle,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Star,
	Stethoscope,
	User,
	Users,
	Zap,
	Bell,
	CheckSquare,
	ArrowRight,
	Sliders,
} from "lucide-react";
import "./familyDentalCareHub.css";

// ============================================================================
// 1. ТИПЫ И ИНТЕРФЕЙСЫ (TYPES & CONTRACTS)
// ============================================================================

export type CambraRiskLevel = "low" | "moderate" | "high" | "extreme";

export interface FamilyMemberDentalProfile {
	readonly id: string;
	readonly fullName: string;
	readonly relationshipLabelRu: string;
	readonly ageYears: number;
	readonly isMinor: boolean;
	readonly lastHygieneDateRu: string;
	readonly nextHygieneDueRu: string;
	readonly daysUntilNextHygiene: number;
	readonly hygieneCycleMonths: number;
	readonly cambraRisk: CambraRiskLevel;
	readonly cambraRiskLabelRu: string;
	readonly cambraScore: number; // 0..10
	readonly cambraFactorsRu: readonly string[];
	readonly primaryDoctorRu: string;
	readonly status: "on_track" | "due_soon" | "overdue";
}

export interface ParallelBookingPackage {
	readonly id: string;
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly adultMemberName: string;
	readonly adultProcedureRu: string;
	readonly childMemberName: string;
	readonly childProcedureRu: string;
	readonly totalDurationMinutes: number;
	readonly savedMinutes: number;
	readonly priceRubOriginal: number;
	readonly priceRubDiscounted: number;
	readonly discountPercent: number;
}

export interface FamilyDentalCareHubData {
	readonly familyId: string;
	readonly familyName: string;
	readonly familyHygieneScorePercent: number; // 88%
	readonly nextFamilyCheckupDateRu: string;
	readonly members: readonly FamilyMemberDentalProfile[];
	readonly parallelPackages: readonly ParallelBookingPackage[];
}

export interface FamilyDentalCareHubWidgetProps {
	readonly data?: FamilyDentalCareHubData | undefined;
	readonly currentPatientId?: string | undefined;
	readonly onBookMemberHygiene?: (member: FamilyMemberDentalProfile) => void;
	readonly onBookParallelVisit?: (pkg: ParallelBookingPackage) => void;
	readonly onSendFamilyReminder?: (familyId: string) => Promise<void> | void;
	readonly className?: string | undefined;
}

// ============================================================================
// 2. ДЕМО-ПРЕСЕТ ДЛЯ СЕМЬИ ИВАНОВЫХ (REALISTIC CLINICAL DATA)
// ============================================================================

export const DEFAULT_PRESET_FAMILY_CARE_HUB: FamilyDentalCareHubData = {
	familyId: "fam-grp-7701",
	familyName: "Семья Ивановых",
	familyHygieneScorePercent: 88,
	nextFamilyCheckupDateRu: "15 сентября 2026",
	members: [
		{
			id: "pat-101",
			fullName: "Иванова Анна Сергеевна",
			relationshipLabelRu: "Мама (Владелец)",
			ageYears: 36,
			isMinor: false,
			lastHygieneDateRu: "15 марта 2026",
			nextHygieneDueRu: "15 сентября 2026",
			daysUntilNextHygiene: 14,
			hygieneCycleMonths: 6,
			cambraRisk: "low",
			cambraRiskLabelRu: "Низкий риск кариеса",
			cambraScore: 2,
			cambraFactorsRu: ["Регулярная гигиена 2р/год", "Отсутствие активных полостей", "Фторсодержащая паста 1450 ppm"],
			primaryDoctorRu: "Д-р Смирнова А.С.",
			status: "due_soon",
		},
		{
			id: "pat-102",
			fullName: "Иванов Петр Николаевич",
			relationshipLabelRu: "Папа",
			ageYears: 38,
			isMinor: false,
			lastHygieneDateRu: "10 января 2026",
			nextHygieneDueRu: "10 июля 2026",
			daysUntilNextHygiene: -50,
			hygieneCycleMonths: 6,
			cambraRisk: "moderate",
			cambraRiskLabelRu: "Умеренный риск кариеса",
			cambraScore: 5,
			cambraFactorsRu: ["Наличие имплантата 4.6", "Коронка 1.6", "Требуется контроль десневой манжеты"],
			primaryDoctorRu: "Д-р Белов С.А.",
			status: "overdue",
		},
		{
			id: "pat-103",
			fullName: "Иванов Михаил Петрович",
			relationshipLabelRu: "Сын (Ребёнок)",
			ageYears: 7,
			isMinor: true,
			lastHygieneDateRu: "20 июня 2026",
			nextHygieneDueRu: "20 сентября 2026",
			daysUntilNextHygiene: 19,
			hygieneCycleMonths: 3, // Для детей с высоким риском цикл 3 месяца
			cambraRisk: "high",
			cambraRiskLabelRu: "Высокий риск кариеса (CAMBRA Pediatric)",
			cambraScore: 8,
			cambraFactorsRu: ["Сменный прикус", "Частые углеводные перекусы", "Требуется глубокое фторирование"],
			primaryDoctorRu: "Д-р Ковалева Е.М. (Детский стоматолог)",
			status: "due_soon",
		},
		{
			id: "pat-104",
			fullName: "Иванова София Петровна",
			relationshipLabelRu: "Дочь (Подросток)",
			ageYears: 12,
			isMinor: true,
			lastHygieneDateRu: "01 июля 2026",
			nextHygieneDueRu: "01 января 2027",
			daysUntilNextHygiene: 120,
			hygieneCycleMonths: 6,
			cambraRisk: "low",
			cambraRiskLabelRu: "Низкий риск кариеса",
			cambraScore: 1,
			cambraFactorsRu: ["Элайнеры / Ортодонтия", "Отличная гигиена монопучковой щеткой"],
			primaryDoctorRu: "Д-р Ковалева Е.М.",
			status: "on_track",
		},
	],
	parallelPackages: [
		{
			id: "pkg-parallel-mom-son",
			titleRu: "Параллельный приём: Мама + Сын (7 лет)",
			descriptionRu: "Одновременный прием в соседних кабинетах: взрослый терапевт + детский стоматолог",
			adultMemberName: "Иванова Анна Сергеевна",
			adultProcedureRu: "Комплексная гигиена GBT / Air-Flow + полировка",
			childMemberName: "Иванов Михаил Петрович",
			childProcedureRu: "Детская бережная гигиена + фторирование Fluor Protector",
			totalDurationMinutes: 60,
			savedMinutes: 60,
			priceRubOriginal: 12500,
			priceRubDiscounted: 11250,
			discountPercent: 10,
		},
	],
};

// ============================================================================
// 3. ОСНОВНОЙ КОМПОНЕНТ (MAIN COMPONENT)
// ============================================================================

export const FamilyDentalCareHubWidget: React.FC<FamilyDentalCareHubWidgetProps> = ({
	data = DEFAULT_PRESET_FAMILY_CARE_HUB,
	currentPatientId,
	onBookMemberHygiene,
	onBookParallelVisit,
	onSendFamilyReminder,
	className = "",
}) => {
	const [activeTab, setActiveTab] = useState<"members" | "parallel">("members");
	const [reminderSent, setReminderSent] = useState(false);

	const handleSendReminderClick = useCallback(async () => {
		setReminderSent(true);
		if (onSendFamilyReminder) {
			await onSendFamilyReminder(data.familyId);
		}
		setTimeout(() => setReminderSent(false), 3000);
	}, [data.familyId, onSendFamilyReminder]);

	return (
		<div className={`family-care-hub-container ${className}`}>
			{/* 1. HERO КАРТОЧКА СЕМЕЙНОЙ ПРОФИЛАКТИКИ */}
			<div className="family-care-hero-card">
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<div
							style={{
								width: "36px",
								height: "36px",
								borderRadius: "8px",
								backgroundColor: "var(--teal, #0d9488)",
								color: "var(--on-teal, #ffffff)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
							}}
						>
							<Users size={20} />
						</div>
						<div>
							<h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "var(--ink, #0f172a)" }}>
								Семейный хаб профилактики
							</h3>
							<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
								{`${data.familyName} • Индекс защиты семьи ${data.familyHygieneScorePercent}%`}
							</div>
						</div>
					</div>

					<span
						style={{
							fontSize: "11px",
							fontWeight: 700,
							color: "var(--teal-strong, #0f766e)",
							backgroundColor: "var(--teal-soft, #ccfbf1)",
							border: "1px solid rgba(13, 148, 136, 0.3)",
							padding: "2px 8px",
							borderRadius: "9999px",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<Sparkles size={11} />
						<span>CAMBRA Guard</span>
					</span>
				</div>

				{/* Прогресс-бар защиты семьи */}
				<div>
					<div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 600, marginBottom: "4px" }}>
						<span style={{ color: "var(--muted, #64748b)" }}>Уровень гигиены семьи</span>
						<span style={{ color: "var(--teal-strong, #0f766e)" }}>{`${data.familyHygieneScorePercent}% (Отлично)`}</span>
					</div>
					<div
						style={{
							height: "8px",
							borderRadius: "4px",
							backgroundColor: "var(--paper-soft, #e2e8f0)",
							overflow: "hidden",
						}}
					>
						<div
							style={{
								width: `${data.familyHygieneScorePercent}%`,
								height: "100%",
								backgroundColor: "var(--teal, #0d9488)",
								borderRadius: "4px",
								transition: "width 0.3s ease",
							}}
						/>
					</div>
				</div>

				{/* Следующий совместный чек-ап */}
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line, rgba(13, 148, 136, 0.15))", paddingTop: "8px" }}>
					<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
						Ближайший семейный визит: <strong style={{ color: "var(--ink, #0f172a)" }}>{data.nextFamilyCheckupDateRu}</strong>
					</div>

					<button
						type="button"
						onClick={handleSendReminderClick}
						style={{
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "6px",
							padding: "10px 14px",
							minHeight: "44px",
							minWidth: "44px",
							borderRadius: "8px",
							backgroundColor: reminderSent ? "var(--teal-soft, #ccfbf1)" : "var(--paper-strong, #ffffff)",
							border: "1px solid var(--line, rgba(13, 148, 136, 0.3))",
							color: "var(--teal-strong, #0f766e)",
							fontSize: "12px",
							fontWeight: 700,
							cursor: "pointer",
						}}
					>
						{reminderSent ? <Check size={14} /> : <Bell size={14} />}
						<span>{reminderSent ? "Напоминание отправлено!" : "Напомнить семье"}</span>
					</button>
				</div>

				{/* Переключатель вкладок */}
				<div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
					<button
						type="button"
						className="family-care-touch-btn"
						onClick={() => setActiveTab("members")}
						style={{
							flex: 1,
							backgroundColor: activeTab === "members" ? "var(--teal, #0d9488)" : "var(--paper-soft, #f1f5f9)",
							color: activeTab === "members" ? "var(--on-teal, #ffffff)" : "var(--ink, #0f172a)",
						}}
					>
						<Shield size={15} />
						<span>{`Члены семьи (${data.members.length})`}</span>
					</button>

					<button
						type="button"
						className="family-care-touch-btn"
						onClick={() => setActiveTab("parallel")}
						style={{
							flex: 1,
							backgroundColor: activeTab === "parallel" ? "var(--teal, #0d9488)" : "var(--paper-soft, #f1f5f9)",
							color: activeTab === "parallel" ? "var(--on-teal, #ffffff)" : "var(--ink, #0f172a)",
						}}
					>
						<Zap size={15} />
						<span>Параллельный приём (-10%)</span>
					</button>
				</div>
			</div>

			{/* 2. ВКЛАДКА: ЧЛЕНЫ СЕМЬИ И ОЦЕНКА CAMBRA */}
			{activeTab === "members" && (
				<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
					{data.members.map((member) => {
						const isOverdue = member.status === "overdue";
						const isDueSoon = member.status === "due_soon";

						return (
							<div key={member.id} className="family-member-care-card">
								{/* Header карточки */}
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
									<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
										<div
											style={{
												width: "34px",
												height: "34px",
												borderRadius: "50%",
												backgroundColor: member.isMinor ? "var(--teal-soft, #ccfbf1)" : "var(--paper-soft, #f1f5f9)",
												color: member.isMinor ? "var(--teal-strong, #0f766e)" : "var(--ink, #0f172a)",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												fontWeight: 700,
												fontSize: "13px",
												flexShrink: 0,
											}}
										>
											{member.fullName.slice(0, 1)}
										</div>

										<div>
											<div style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
												{member.fullName}
											</div>
											<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
												{`${member.relationshipLabelRu} • ${member.ageYears} лет`}
											</div>
										</div>
									</div>

									{/* CAMBRA бейдж */}
									<span className={`cambra-risk-badge cambra-risk-${member.cambraRisk}`}>
										<ShieldCheck size={12} />
										<span>{member.cambraRiskLabelRu}</span>
									</span>
								</div>

								{/* Статус гигиенического цикла */}
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										padding: "8px 10px",
										borderRadius: "8px",
										backgroundColor: isOverdue ? "var(--bad-bg)" : isDueSoon ? "var(--warn-bg)" : "var(--paper-soft, #f8fafc)",
										border: isOverdue ? "1px solid var(--bad-fg)" : isDueSoon ? "1px solid var(--warn-fg)" : "1px solid var(--line, rgba(0,0,0,0.06))",
										fontSize: "11px",
									}}
								>
									<div>
										<span style={{ color: "var(--muted, #64748b)" }}>Срок гигиены: </span>
										<strong style={{ color: isOverdue ? "var(--bad-fg)" : isDueSoon ? "var(--warn-fg)" : "var(--ink, #0f172a)" }}>
											{member.nextHygieneDueRu}
										</strong>
									</div>

									<span
										style={{
											fontWeight: 700,
											color: isOverdue ? "var(--bad-fg)" : isDueSoon ? "var(--warn-fg)" : "var(--teal-strong, #0f766e)",
										}}
									>
										{isOverdue ? "Просрочено" : isDueSoon ? `Через ${member.daysUntilNextHygiene} дн.` : "В графике"}
									</span>
								</div>

								{/* Факторы риска CAMBRA */}
								<div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
									{member.cambraFactorsRu.map((factor, idx) => (
										<span
											key={idx}
											style={{
												fontSize: "10px",
												padding: "2px 6px",
												borderRadius: "4px",
												backgroundColor: "var(--paper-soft, #f1f5f9)",
												color: "var(--muted, #64748b)",
											}}
										>
											• {factor}
										</span>
									))}
								</div>

								{/* Кнопка записи на гигиену */}
								{onBookMemberHygiene && (
									<button
										type="button"
										className="family-care-touch-btn"
										onClick={() => onBookMemberHygiene(member)}
										style={{
											backgroundColor: isOverdue || isDueSoon ? "var(--teal, #0d9488)" : "var(--paper-soft, #f1f5f9)",
											color: isOverdue || isDueSoon ? "var(--on-teal, #ffffff)" : "var(--ink, #0f172a)",
											width: "100%",
											fontSize: "12px",
										}}
									>
										<Calendar size={14} />
										<span>{`Записать ${member.fullName.split(" ")[1] || member.fullName} на гигиену`}</span>
									</button>
								)}
							</div>
						);
					})}
				</div>
			)}

			{/* 3. ВКЛАДКА: ПАРАЛЛЕЛЬНЫЙ ПРИЕМ (РОДИТЕЛЬ + РЕБЕНОК) */}
			{activeTab === "parallel" && (
				<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
					<div
						style={{
							borderRadius: "8px",
							padding: "10px 12px",
							backgroundColor: "var(--paper-soft, #f8fafc)",
							border: "1px solid var(--line, rgba(0, 0, 0, 0.08))",
							fontSize: "11px",
							color: "var(--muted, #64748b)",
							display: "flex",
							gap: "8px",
							alignItems: "flex-start",
						}}
					>
						<Info size={16} style={{ color: "var(--teal, #0d9488)", flexShrink: 0, marginTop: "1px" }} />
						<div>
							<strong>Как работает «Параллельный приём»: </strong>
							Мы бронируем сразу 2 кресла в соседних кабинетах в одно и то же время. Пока взрослый проходит профгигиену у терапевта, ребенок проходит бережную гигиену у детского врача.
						</div>
					</div>

					{data.parallelPackages.map((pkg) => (
						<div key={pkg.id} className="parallel-booking-banner">
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
								<div>
									<h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "var(--ink, #0f172a)" }}>
										{pkg.titleRu}
									</h4>
									<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", marginTop: "2px" }}>
										{pkg.descriptionRu}
									</div>
								</div>

								<span
									style={{
										fontSize: "11px",
										fontWeight: 800,
										color: "var(--ok-fg)",
										backgroundColor: "var(--ok-bg)",
										padding: "2px 8px",
										borderRadius: "9999px",
									}}
								>
									{`Скидка -${pkg.discountPercent}%`}
								</span>
							</div>

							{/* Детализация процедур */}
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "6px",
									padding: "8px",
									borderRadius: "8px",
									backgroundColor: "var(--paper-strong, #ffffff)",
									border: "1px solid rgba(0,0,0,0.06)",
									fontSize: "11px",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
									<User size={13} style={{ color: "var(--teal, #0d9488)" }} />
									<span><strong>{pkg.adultMemberName}: </strong>{pkg.adultProcedureRu}</span>
								</div>
								<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
									<Heart size={13} style={{ color: "var(--bad-fg)" }} />
									<span><strong>{pkg.childMemberName}: </strong>{pkg.childProcedureRu}</span>
								</div>
							</div>

							{/* Экономия времени и стоимость */}
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: "8px" }}>
								<div style={{ fontSize: "11px", color: "var(--ok-fg)", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
									<Clock size={13} />
									<span>{`Экономия времени: ${pkg.savedMinutes} мин`}</span>
								</div>

								<div style={{ textAlign: "right" }}>
									<span style={{ fontSize: "11px", color: "var(--muted, #64748b)", textDecoration: "line-through", marginRight: "6px" }}>
										{`${pkg.priceRubOriginal.toLocaleString("ru-RU")} ₽`}
									</span>
									<strong style={{ fontSize: "15px", color: "var(--teal-strong, #0f766e)" }}>
										{`${pkg.priceRubDiscounted.toLocaleString("ru-RU")} ₽`}
									</strong>
								</div>
							</div>

							{/* Кнопка записи на параллельный приём */}
							{onBookParallelVisit && (
								<button
									type="button"
									className="family-care-touch-btn"
									onClick={() => onBookParallelVisit(pkg)}
									style={{
										backgroundColor: "var(--ok-fg)",
										color: "var(--on-teal, #ffffff)",
										width: "100%",
									}}
								>
									<Zap size={15} />
									<span>Забронировать 2 кресла одновременно</span>
								</button>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
};
