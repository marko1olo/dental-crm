import {
	AlertTriangle,
	Calendar,
	CalendarCheck,
	Check,
	Clock,
	Copy,
	CreditCard,
	Send,
	Shield,
	Sparkles,
	User,
	UserCheck,
	UserPlus,
	Zap,
} from "lucide-react";
import React from "react";
import type {
	PatientFinancialSummary,
	PatientLastVisitSummary,
	PatientSomaticAlert,
	PatientUpcomingAppointmentSummary,
	PatientActiveTreatmentPlanSummary,
	TelephonyPatientCategory,
} from "../../store/telephonyTypes";
import { resolvePatientCategory } from "../../store/telephonyStore";
import type { CallAttribution } from "./telephonyAttribution";
import { CHANNEL_BADGE_COLORS } from "./telephonyAttribution";

export interface IncomingCallerCardProps {
	callerName: string;
	formattedPhone: string;
	rawPhone: string;
	initials: string;
	avatarColors: { bg: string; text: string; border?: string | undefined };
	isKnownPatient: boolean;
	patientCategory?: TelephonyPatientCategory | undefined;
	birthDate?: string | null | undefined;
	financialSummary: PatientFinancialSummary;
	somaticAlerts: PatientSomaticAlert[];
	upcomingAppointment: PatientUpcomingAppointmentSummary | null;
	lastVisitSummary?: PatientLastVisitSummary | null | undefined;
	activeTreatmentPlan?: PatientActiveTreatmentPlanSummary | null | undefined;
	callAttribution?: CallAttribution | null | undefined;
	isLeadCaptured?: boolean | undefined;
	isCapturingLead?: boolean | undefined;
	onCopyPhone?: (() => void) | undefined;
	onSendWhatsApp?: (() => void) | undefined;
	onCopySms?: (() => void) | undefined;
	onCaptureLead?: (() => void) | undefined;
	smsCopied?: boolean | undefined;
	compact?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Caller Identity and Clinical / Financial Snapshot Card.
 * Adheres to Medical Density, Zero-Emojis, and WCAG AAA theme tokens.
 */
export function IncomingCallerCard({
	callerName,
	formattedPhone,
	rawPhone,
	initials,
	avatarColors,
	isKnownPatient,
	patientCategory,
	birthDate,
	financialSummary,
	somaticAlerts,
	upcomingAppointment,
	lastVisitSummary,
	activeTreatmentPlan,
	callAttribution,
	isLeadCaptured,
	isCapturingLead,
	onCopyPhone,
	onSendWhatsApp,
	onCopySms,
	onCaptureLead,
	smsCopied,
	compact = false,
	className = "",
}: IncomingCallerCardProps) {
	const hasDebt = financialSummary.hasDebt;
	const hasDms = financialSummary.hasInsurance;
	const allergyAlerts = somaticAlerts.filter((a) => a.category === "allergy");
	const acutePainAlerts = somaticAlerts.filter((a) => a.category === "pain");

	const resolvedCategory: TelephonyPatientCategory =
		patientCategory ||
		(isKnownPatient
			? resolvePatientCategory(
					{ id: "patient", fullName: callerName, notes: undefined },
					lastVisitSummary,
					undefined,
				)
			: "Первичный");

	const renderStatusBadge = () => {
		if (isKnownPatient) {
			if (resolvedCategory === "VIP") {
				return (
					<span
						className="text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 inline-flex items-center gap-1 shadow-xs"
						data-testid="incoming-caller-status-vip"
						title="VIP пациент клиники"
					>
						<Sparkles size={11} className="text-amber-600 dark:text-amber-400" />
						VIP
					</span>
				);
			}
			if (resolvedCategory === "Первичный") {
				return (
					<span
						className="text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 inline-flex items-center gap-1"
						data-testid="incoming-caller-status-new"
						title="Первичный пациент"
					>
						<UserPlus size={11} className="text-sky-600 dark:text-sky-400" />
						Первичный
					</span>
				);
			}
			return (
				<span
					className="text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 inline-flex items-center gap-1"
					data-testid="incoming-caller-status-regular"
					title="Постоянный пациент клиники"
				>
					<UserCheck size={11} className="text-emerald-600 dark:text-emerald-400" />
					Постоянный
				</span>
			);
		}

		return (
			<span
				className="text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 inline-flex items-center gap-1"
				data-testid="incoming-caller-status-unregistered"
				title="Новый пациент (номер отсутствует в базе CRM)"
			>
				<UserPlus size={11} className="text-amber-600 dark:text-amber-400" />
				Новый пациент
			</span>
		);
	};

	if (compact) {
		return (
			<div className={`space-y-1.5 ${className}`}>
				{/* Identity */}
				<div className="flex items-center gap-2.5">
					<div
						className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 shadow-xs border border-[var(--line-strong,var(--line,#e2e8f0))]"
						style={{
							backgroundColor: avatarColors.bg,
							color: avatarColors.text,
						}}
						title={callerName}
					>
						{initials}
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1.5 flex-wrap">
							<h3
								className="text-sm font-bold text-[var(--ink,#0f172a)] break-words leading-tight"
								title={callerName}
							>
								{callerName}
							</h3>
							{renderStatusBadge()}
							{!isKnownPatient && callAttribution && (
								<span
									className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 inline-flex items-center gap-1"
									style={{
										backgroundColor:
											CHANNEL_BADGE_COLORS[callAttribution.channelKey].bg,
										color:
											CHANNEL_BADGE_COLORS[callAttribution.channelKey].text,
										border: `1px solid ${CHANNEL_BADGE_COLORS[callAttribution.channelKey].border}`,
									}}
									data-testid="incoming-call-marketing-channel-badge"
									title={`Канал рекламы: ${callAttribution.channelLabel}${callAttribution.virtualNumberDisplay ? ` • ВАТС: ${callAttribution.virtualNumberDisplay}` : ""}${callAttribution.utmSummary ? ` • UTM: [${callAttribution.utmSummary}]` : ""}`}
								>
									{callAttribution.channelLabel}
								</span>
							)}
						</div>
						<div className="flex items-center gap-2 text-xs font-mono text-[var(--muted,#64748b)]">
							<span className="font-bold text-[var(--ink,#0f172a)] shrink-0">
								{formattedPhone}
							</span>
						</div>
					</div>
				</div>

				{/* Snapshot Badges */}
				<div className="flex items-center gap-1.5 flex-wrap text-xs pt-0.5">
					{/* Баланс / Долг */}
					{hasDebt ? (
						<span
							className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0"
							title={`Задолженность пациента: ${financialSummary.formattedDebt || `${Math.abs(financialSummary.debtRub || financialSummary.balanceRub || 0)} ₽`}`}
						>
							Долг: {financialSummary.formattedDebt || `${Math.abs(financialSummary.debtRub || financialSummary.balanceRub || 0)} ₽`}
						</span>
					) : (financialSummary.balanceRub || 0) > 0 ? (
						<span
							className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0"
							title={`Аванс на балансе: ${financialSummary.formattedBalance || `${financialSummary.balanceRub || 0} ₽`}`}
						>
							Аванс: +{financialSummary.formattedBalance || `${financialSummary.balanceRub || 0} ₽`}
						</span>
					) : (
						<span
							className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--paper-subtle,var(--paper-soft,#f1f5f9))] text-[var(--muted,#64748b)] border border-[var(--line,#e2e8f0)] shrink-0"
							title="Баланс пациента нулевой"
						>
							Баланс: 0 ₽
						</span>
					)}

					{/* ДМС Полис */}
					{hasDms && (
						<span
							className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1 shrink-0"
							title={`ДМС: ${financialSummary.insuranceName || "Полис активен"}`}
						>
							<Shield size={10} className="text-sky-500" />
							ДМС
						</span>
					)}

					{/* Следующая запись или последний визит */}
					{upcomingAppointment ? (
						<span
							className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)] flex items-center gap-1 min-w-0 max-w-[220px]"
							title={`Следующая запись: ${upcomingAppointment.formattedDate} ${upcomingAppointment.formattedTime} (${upcomingAppointment.doctorName})`}
						>
							<Calendar size={11} className="shrink-0" />
							<span className="truncate">
								{upcomingAppointment.isToday
									? "Сегодня"
									: upcomingAppointment.isTomorrow
										? "Завтра"
										: upcomingAppointment.formattedDate}{" "}
								{upcomingAppointment.formattedTime}
							</span>
						</span>
					) : lastVisitSummary && lastVisitSummary.lastVisitDate ? (
						<span
							className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--paper-subtle,var(--paper-soft,#f1f5f9))] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] flex items-center gap-1 min-w-0 max-w-[220px]"
							title={`Предыдущий визит: ${lastVisitSummary.formattedLastVisit} (${lastVisitSummary.doctorName || "Врач не указан"})`}
						>
							<Clock size={11} className="text-[var(--teal)] shrink-0" />
							<span className="truncate">
								Визит: {lastVisitSummary.formattedLastVisit.split(" в ")[0] || lastVisitSummary.formattedLastVisit}
							</span>
						</span>
					) : (
						<span className="px-2 py-0.5 rounded-full text-[11px] text-[var(--muted,#64748b)] border border-[var(--line,#e2e8f0)]">
							Нет записей
						</span>
					)}

					{/* Активный план лечения */}
					{activeTreatmentPlan && activeTreatmentPlan.hasActivePlan && (
						<span
							className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)] flex items-center gap-1 min-w-0 max-w-[240px]"
							title={`План: ${activeTreatmentPlan.planTitle} (${activeTreatmentPlan.formattedTotalCost}, выполнено ${activeTreatmentPlan.progressPercent}%)${activeTreatmentPlan.nextService ? ` • След: ${activeTreatmentPlan.nextService}` : ""}`}
							data-testid="incoming-call-active-plan-badge"
						>
							<Sparkles size={11} className="text-amber-500 shrink-0" />
							<span className="truncate">
								{activeTreatmentPlan.planTitle} ({activeTreatmentPlan.progressPercent}%)
							</span>
						</span>
					)}

					{/* Аллергия alert pill */}
					{allergyAlerts.length > 0 && (
						<span
							className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 flex items-center gap-1"
							title={`Аллергия: ${allergyAlerts.map((a) => a.label || (a as any).text || "Аллергия").join(", ")}`}
						>
							<AlertTriangle size={11} className="text-rose-600 shrink-0" />
							Аллергия
						</span>
					)}

					{/* Острая боль */}
					{acutePainAlerts.length > 0 && (
						<span
							className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 flex items-center gap-1"
							title="Острая боль"
						>
							<Zap size={11} className="text-rose-600 shrink-0" />
							Острая боль
						</span>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className={`space-y-3.5 text-xs ${className}`}>
			{/* Patient Identity Block */}
			<div className="p-3.5 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] flex items-center gap-3">
				<div
					className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black shrink-0 shadow-xs border border-[var(--line-strong,var(--line,#e2e8f0))]"
					style={{
						backgroundColor: avatarColors.bg,
						color: avatarColors.text,
					}}
				>
					{initials}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 flex-wrap">
						<h3
							className="text-base font-bold text-[var(--ink,#0f172a)] break-words leading-tight"
							title={callerName}
						>
							{callerName}
						</h3>
						{renderStatusBadge()}
					</div>
					<div className="flex items-center gap-2 mt-0.5 flex-wrap">
						<span className="font-mono font-bold text-xs text-[var(--teal)]">
							{formattedPhone}
						</span>
						{onCopyPhone && (
							<button
								type="button"
								onClick={onCopyPhone}
								className="text-[10px] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] inline-flex items-center gap-0.5 cursor-pointer underline"
								title="Скопировать номер"
							>
								<Copy size={11} />
								копировать
							</button>
						)}
					</div>
					{birthDate && (
						<span className="text-[11px] text-[var(--muted,#64748b)] block mt-0.5">
							Дата рождения: {birthDate}
						</span>
					)}
				</div>
			</div>

			{/* Unknown Caller: Prominent Registration Banner */}
			{!isKnownPatient && (
				<div
					className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-1 shadow-xs"
					data-testid="incoming-call-new-patient-banner"
				>
					<div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
						<UserPlus size={14} className="text-amber-600 dark:text-amber-400" />
						<span>Новый пациент</span>
					</div>
					<p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
						Номер <strong className="font-mono">{formattedPhone}</strong> не найден в базе CRM клиники. Создайте карту пациента за 5 секунд или запишите на приём без ручного ввода номера.
					</p>
				</div>
			)}

			{/* Somatic & Allergy Alerts (Prominent Red Invariant) */}
			{somaticAlerts.length > 0 && (
				<div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 space-y-1.5">
					<div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
						<AlertTriangle size={14} className="text-rose-600" />
						<span>Медицинские предупреждения:</span>
					</div>
					<div className="space-y-1">
						{somaticAlerts.map((alert, idx) => {
							const categoryLabel =
								alert.category === "allergy"
									? "Аллергия"
									: alert.category === "pain"
										? "Острая боль"
										: alert.category === "chronic"
											? "Хроническое"
											: alert.category === "risk"
												? "Фактор риска"
												: alert.severity === "high"
													? "Высокий риск"
													: alert.severity === "medium"
														? "Умеренный риск"
														: alert.severity === "info"
															? "Информация"
															: "Внимание";
							const alertText = alert.label || (alert as any).text || "Предупреждение";

							return (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: simple alert items
									key={idx}
									className="flex items-start gap-1.5 text-xs"
								>
									<span className="text-rose-500 font-bold">•</span>
									<span>
										<strong>{alertText}</strong>
										<span className="text-rose-600/80 dark:text-rose-400/80 ml-1">
											({categoryLabel})
										</span>
									</span>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Financial Status Card */}
			<div className="p-3.5 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] space-y-2">
				<div className="flex items-center justify-between">
					<span className="font-bold text-[11px] uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
						<CreditCard size={12} className="text-[var(--teal)]" />
						Финансовый статус:
					</span>
					{hasDms && (
						<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1">
							<Shield size={10} className="text-sky-500" />
							ДМС активен
						</span>
					)}
				</div>
				<div className="grid grid-cols-2 gap-2">
					<div className="p-2.5 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#e2e8f0)]">
						<span className="text-[10px] text-[var(--muted,#64748b)] block">
							Баланс
						</span>
						<span
							className={`text-sm font-bold ${
								hasDebt
									? "text-rose-600"
									: (financialSummary.balanceRub || 0) > 0
										? "text-emerald-600"
										: "text-[var(--ink,#0f172a)]"
							}`}
						>
							{hasDebt
								? `-${financialSummary.formattedDebt || `${Math.abs(financialSummary.debtRub || financialSummary.balanceRub || 0)} ₽`}`
								: (financialSummary.formattedBalance || `${financialSummary.balanceRub || 0} ₽`)}
						</span>
					</div>
					<div className="p-2.5 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#e2e8f0)]">
						<span className="text-[10px] text-[var(--muted,#64748b)] block">
							Статус договора
						</span>
						<span className="text-sm font-bold text-[var(--ink,#0f172a)]">
							{isKnownPatient ? "Договор заключен" : "Без договора"}
						</span>
					</div>
				</div>
			</div>

			{/* Upcoming Appointment Info */}
			{upcomingAppointment && (
				<div className="p-3.5 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] space-y-2">
					<div className="flex items-center justify-between">
						<span className="font-bold text-[11px] uppercase tracking-wider text-[var(--teal)] flex items-center gap-1.5">
							<CalendarCheck size={13} />
							Предстоящий приём:
						</span>
						<div className="flex items-center gap-1">
							<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--teal)] text-white">
								{upcomingAppointment.isToday
									? "Сегодня"
									: upcomingAppointment.isTomorrow
										? "Завтра"
										: upcomingAppointment.formattedDate}
							</span>
							{onSendWhatsApp && (
								<button
									type="button"
									onClick={onSendWhatsApp}
									className="h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
									title="Отправить подтверждение в WhatsApp"
								>
									<Send size={13} />
								</button>
							)}
							{onCopySms && (
								<button
									type="button"
									onClick={onCopySms}
									className="h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] flex items-center justify-center transition-all cursor-pointer shadow-xs"
									title="Скопировать SMS"
								>
									{smsCopied ? (
										<Check size={13} className="text-emerald-500" />
									) : (
										<Copy size={13} />
									)}
								</button>
							)}
						</div>
					</div>
					<div className="text-xs text-[var(--ink,#0f172a)] space-y-0.5">
						<div className="font-bold">
							Время: {upcomingAppointment.formattedTime}
						</div>
						<div className="text-[var(--muted,#64748b)]">
							Врач: {upcomingAppointment.doctorName}
						</div>
					</div>
				</div>
			)}

			{/* Previous Visit Summary */}
			{lastVisitSummary && (
				<div className="p-3 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] space-y-1">
					<span className="font-bold text-[10px] uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1">
						<Clock size={11} className="text-[var(--teal)]" />
						Предыдущий визит:
					</span>
					<div className="text-xs text-[var(--ink,#0f172a)]">
						<span className="font-semibold">
							{lastVisitSummary.formattedLastVisit}
						</span>
						{lastVisitSummary.doctorName && (
							<span className="text-[var(--muted,#64748b)]">
								{" "}
								· Врач: {lastVisitSummary.doctorName}
							</span>
						)}
					</div>
				</div>
			)}

			{/* Unknown Caller: 1-Click Lead Capture with Automatic Marketing Attribution */}
			{!isKnownPatient && callAttribution && (
				<div
					className="p-3.5 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--teal-soft)] space-y-2.5 shadow-xs"
					data-testid="telephony-lead-capture-card"
				>
					<div className="flex items-center justify-between gap-1 flex-wrap">
						<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink,#0f172a)]">
							<Sparkles size={14} className="text-amber-500 shrink-0" />
							<span>Захват в CRM-лиды</span>
						</div>
						<span
							className="px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0"
							style={{
								backgroundColor:
									CHANNEL_BADGE_COLORS[callAttribution.channelKey].bg,
								color:
									CHANNEL_BADGE_COLORS[callAttribution.channelKey].text,
								border: `1px solid ${CHANNEL_BADGE_COLORS[callAttribution.channelKey].border}`,
							}}
							data-testid="telephony-attribution-channel-pill"
						>
							{callAttribution.channelLabel}
						</span>
					</div>

					<div className="text-[11px] text-[var(--muted,#64748b)] space-y-1">
						{callAttribution.virtualNumberDisplay && (
							<div className="flex items-center justify-between">
								<span>Номер ВАТС:</span>
								<span className="font-mono font-semibold text-[var(--ink,#0f172a)]">
									{callAttribution.virtualNumberDisplay}
								</span>
							</div>
						)}
						{callAttribution.utmSummary && (
							<div className="flex items-start justify-between gap-1">
								<span className="shrink-0">UTM-метки:</span>
								<span className="font-mono text-[10px] text-[var(--teal)] text-right break-all">
									{callAttribution.utmSummary}
								</span>
							</div>
						)}
					</div>

					{onCaptureLead && (
						<button
							type="button"
							onClick={onCaptureLead}
							disabled={isCapturingLead || isLeadCaptured}
							className="w-full h-9 min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white text-[13px] font-semibold transition-all inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
							data-testid="drawer-action-capture-lead"
							title="1-Клик захват звонящего в лиды с автоматической разметкой рекламного канала"
						>
							<UserPlus size={15} />
							<span>
								{isLeadCaptured
									? `✓ Лид захвачен (${callAttribution.channelLabel})`
									: isCapturingLead
										? "Сохранение лида..."
										: `Захватить в лиды (${callAttribution.channelLabel})`}
							</span>
						</button>
					)}
				</div>
			)}
		</div>
	);
}
