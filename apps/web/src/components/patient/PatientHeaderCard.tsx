/**
 * DENTE CRM — Patient Header Card Component
 * (DOMAIN: macOS/iOS Clinical HIG, Patient Profile Header, Sentiment & Loyalty)
 */

import React, { useMemo } from "react";
import {
	AlertTriangle,
	Calendar,
	CheckCircle2,
	Clock,
	Copy,
	Crown,
	Edit3,
	FileText,
	HeartPulse,
	MessageSquare,
	Phone,
	ShieldAlert,
	Sparkles,
	User,
	UserCheck,
} from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";
import { openWhatsAppChat } from "../../store/telephonyStore";
import { PatientLoyaltyHeader } from "../patients/PatientLoyaltyHeader";
import { PatientSentimentBadge } from "./PatientSentimentBadge";

export interface PatientHeaderCardProps {
	patientId?: string | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: flexible patient record
	patient?: any | null | undefined;
	onEditPatient?: (() => void) | undefined;
	onOpenAnamnesis?: (() => void) | undefined;
	className?: string | undefined;
}

export function formatPatientBirthAndAge(birthDateIso?: string | null): string {
	if (!birthDateIso) return "";
	const date = new Date(birthDateIso);
	if (Number.isNaN(date.getTime())) return "";

	const today = new Date();
	let age = today.getFullYear() - date.getFullYear();
	const m = today.getMonth() - date.getMonth();
	if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
		age--;
	}

	const dateStr = date.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	let ageWord = "лет";
	const lastDigit = age % 10;
	const lastTwoDigits = age % 100;
	if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
		ageWord = "лет";
	} else if (lastDigit === 1) {
		ageWord = "год";
	} else if (lastDigit >= 2 && lastDigit <= 4) {
		ageWord = "года";
	}

	return `${dateStr} (${age} ${ageWord})`;
}

export const PatientHeaderCard: React.FC<PatientHeaderCardProps> = ({
	patientId,
	patient: propPatient,
	onEditPatient,
	onOpenAnamnesis,
	className = "",
}) => {
	const { dashboard, selectedPatient: ctxPatient } = useAppLogicContext();

	const resolvedPatient = useMemo(() => {
		if (propPatient) return propPatient;
		if (patientId && dashboard?.patients) {
			return dashboard.patients.find((p) => p.id === patientId) || null;
		}
		return ctxPatient || null;
	}, [propPatient, patientId, dashboard?.patients, ctxPatient]);

	if (!resolvedPatient) {
		return null;
	}

	const fullName = resolvedPatient.fullName || "Пациент без имени";
	const initials = fullName
		.split(" ")
		.map((part: string) => part[0])
		.filter(Boolean)
		.slice(0, 2)
		.join("")
		.toUpperCase() || "П";

	const balance = Number(
		resolvedPatient.balanceRub ?? resolvedPatient.balance ?? 0,
	);
	const phone = resolvedPatient.phone || "";
	const birthDateStr = formatPatientBirthAndAge(
		resolvedPatient.birthDate || resolvedPatient.birthDateIso,
	);

	const allergyText =
		resolvedPatient.allergies ||
		resolvedPatient.anamnesis?.allergies ||
		"";

	return (
		<div
			className={`patient-header-card p-4 rounded-2xl bg-[var(--paper-strong,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] border border-[var(--line,rgba(0,0,0,0.08))] dark:border-[var(--line,rgba(255,255,255,0.1))] shadow-xs transition-colors space-y-3 ${className}`}
			data-testid="patient-header-card"
		>
			{/* Top Row: Avatar, FIO, Actions, Sentiment & Loyalty */}
			<div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
				{/* Avatar & Core Info */}
				<div className="flex items-center gap-3 min-w-0">
					<div
						className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--teal-dark,#0d9488)] to-cyan-600 text-white font-extrabold text-base flex items-center justify-center shrink-0 shadow-xs ring-2 ring-[var(--teal,#0d9488)]/20"
						title={fullName}
					>
						{initials}
					</div>

					<div className="min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<h2 className="text-base sm:text-lg font-black text-[var(--ink,#0f172a)] dark:text-white leading-tight truncate">
								{fullName}
							</h2>
							{dashboard?.activeVisit?.patientId === resolvedPatient.id && (
								<span
									className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0"
									title="Пациент в данный момент находится на приёме"
								>
									<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
									В клинике
								</span>
							)}
						</div>

						{birthDateStr && (
							<div className="text-xs text-[var(--muted,#64748b)] dark:text-[var(--muted,#94a3b8)] mt-0.5 flex items-center gap-1.5">
								<Calendar size={12} className="shrink-0 opacity-70" />
								<span>{birthDateStr}</span>
							</div>
						)}
					</div>
				</div>

				{/* Right Badges: Sentiment & Loyalty & Balance */}
				<div className="flex items-center gap-2 flex-wrap shrink-0 self-start sm:self-auto">
					{/* Patient Sentiment Scoring Badge */}
					<PatientSentimentBadge patient={resolvedPatient} />

					{/* Loyalty Tier Selector */}
					<PatientLoyaltyHeader patientId={resolvedPatient.id} />

					{/* 54-FZ Fiscal Balance */}
					<span
						className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono shrink-0 whitespace-nowrap border ${
							balance > 0
								? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/40"
								: balance < 0
									? "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/40"
									: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
						}`}
						title={
							balance > 0
								? "Аванс / Депозит пациента (54-ФЗ)"
								: balance < 0
									? "Задолженность за оказанные услуги"
									: "Баланс нулевой (все услуги оплачены)"
						}
					>
						{balance > 0
							? `Депозит: +${balance.toLocaleString("ru-RU")} ₽`
							: balance < 0
								? `Долг: ${Math.abs(balance).toLocaleString("ru-RU")} ₽`
								: "Баланс: 0 ₽"}
					</span>
				</div>
			</div>

			{/* Contact & Safety Quick Bar */}
			<div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--line,rgba(0,0,0,0.06))] dark:border-[var(--line,rgba(255,255,255,0.06))] flex-wrap sm:flex-nowrap text-xs">
				<div className="flex items-center gap-3 min-w-0 flex-wrap">
					{phone ? (
						<div className="flex items-center gap-1.5 font-mono font-semibold text-[var(--ink)]">
							<Phone size={13} className="text-[var(--teal,#0d9488)] shrink-0" />
							<span>{phone}</span>
							<button
								type="button"
								onClick={() => {
									if (typeof navigator !== "undefined" && navigator.clipboard) {
										void navigator.clipboard.writeText(phone);
										showToast("Телефон скопирован в буфер", "success");
									}
								}}
								className="p-1 rounded-md hover:bg-[var(--paper-soft,#f1f5f9)] dark:hover:bg-[var(--paper-soft,#1e293b)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
								title="Скопировать телефон"
								aria-label="Скопировать телефон"
							>
								<Copy size={12} />
							</button>
						</div>
					) : (
						<span className="text-[var(--muted)] italic">Телефон не указан</span>
					)}

					{phone && (
						<button
							type="button"
							onClick={() =>
								openWhatsAppChat(
									phone,
									`Здравствуйте, ${fullName}! Стоматологическая клиника DENTE приветствует вас.`,
								)
							}
							className="h-8 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 font-bold inline-flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all text-xs"
							title="Написать в WhatsApp"
						>
							<MessageSquare size={13} className="text-emerald-600 dark:text-emerald-400" />
							<span>WhatsApp</span>
						</button>
					)}
				</div>

				{/* Quick Actions (Edit, Anamnesis) */}
				<div className="flex items-center gap-1.5 shrink-0">
					{onOpenAnamnesis && (
						<button
							type="button"
							onClick={onOpenAnamnesis}
							className="h-8 px-2.5 rounded-lg bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-soft,#1e293b)] hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] dark:text-white border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors text-xs"
						>
							<HeartPulse size={13} className="text-rose-500" />
							<span>Анамнез 043/у</span>
						</button>
					)}
					{onEditPatient && (
						<button
							type="button"
							onClick={onEditPatient}
							className="h-8 px-2.5 rounded-lg bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-soft,#1e293b)] hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] dark:text-white border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors text-xs"
						>
							<Edit3 size={13} />
							<span>Изменить</span>
						</button>
					)}
				</div>
			</div>

			{/* Prominent Allergy / Medical Safety Alert Banner if present */}
			{allergyText && (
				<div
					className="p-2.5 rounded-xl bg-amber-500/15 border-2 border-amber-500/50 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2 shadow-xs"
					data-testid="header-allergy-alert"
				>
					<AlertTriangle size={15} className="text-amber-600 shrink-0 animate-bounce" />
					<div className="flex-1 min-w-0">
						<span className="uppercase tracking-wider font-black mr-1 text-[11px] text-amber-700 dark:text-amber-300">
							Клиническая безопасность:
						</span>
						<span>{allergyText}</span>
					</div>
				</div>
			)}
		</div>
	);
};

export default PatientHeaderCard;
