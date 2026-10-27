import {
	Clock,
	FileCheck,
	FileText,
	ShieldAlert,
	ShieldCheck,
} from "lucide-react";
import React from "react";

export interface PatientHeaderDocBadgesProps {
	readonly contractStatus: "issued" | "draft" | "none";
	readonly consentStatus: "issued" | "draft" | "none";
	readonly nextAppointment?: { startsAt?: string } | null;
	readonly diagnosisText?: string;
}

const CONTRACT_CONFIG = {
	issued: {
		cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
		icon: <FileCheck size={11} className="shrink-0 text-emerald-600 dark:text-emerald-400" />,
		label: "Договор: Подписан",
		title: "Договор на оказание медицинских услуг подписан",
	},
	draft: {
		cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
		icon: <FileText size={11} className="shrink-0 text-amber-600 dark:text-amber-400" />,
		label: "Договор: Черновик",
		title: "Договор в статусе черновика",
	},
	none: {
		cls: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]",
		icon: <FileText size={11} className="shrink-0 opacity-60" />,
		label: "Договор: Не оформлен",
		title: "Договор не оформлен",
	},
};

const CONSENT_CONFIG = {
	issued: {
		cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
		icon: <ShieldCheck size={11} className="shrink-0 text-emerald-600 dark:text-emerald-400" />,
		label: "Согласие: Подписано",
		title: "Информированное согласие на лечение подписано",
	},
	draft: {
		cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
		icon: <Clock size={11} className="shrink-0 text-amber-600 dark:text-amber-400" />,
		label: "Согласие: Черновик",
		title: "Согласие на лечение в статусе черновика",
	},
	none: {
		cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
		icon: <ShieldAlert size={11} className="shrink-0 text-amber-600 dark:text-amber-400" />,
		label: "Согласие: Требуется",
		title: "Требуется оформить согласие на лечение перед началом приёма",
	},
};

export const PatientHeaderDocBadges: React.FC<PatientHeaderDocBadgesProps> = ({
	contractStatus,
	consentStatus,
	nextAppointment,
	diagnosisText,
}) => {
	const c = CONTRACT_CONFIG[contractStatus] || CONTRACT_CONFIG.none;
	const s = CONSENT_CONFIG[consentStatus] || CONSENT_CONFIG.none;
	const nextDate = nextAppointment?.startsAt ? new Date(nextAppointment.startsAt) : null;

	return (
		<>
			<span
				className={`px-1.5 py-0.5 rounded-md border text-[10px] font-bold inline-flex items-center gap-1 shrink-0 ${c.cls}`}
				title={c.title}
				data-testid="badge-contract-status"
			>
				{c.icon}
				<span>{c.label}</span>
			</span>
			<span
				className={`px-1.5 py-0.5 rounded-md border text-[10px] font-bold inline-flex items-center gap-1 shrink-0 ${s.cls}`}
				title={s.title}
				data-testid="badge-consent-status"
			>
				{s.icon}
				<span>{s.label}</span>
			</span>
			{nextDate && (
				<span
					className="px-1.5 py-0.5 rounded-md bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal-dark,#0f766e)] dark:text-[var(--teal,#2dd4bf)] border border-[var(--teal,#0d9488)]/30 text-[10px] font-bold inline-flex items-center gap-1 shrink-0"
					title={`Следующий приём: ${nextDate.toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`}
					data-testid="header-next-appointment-badge"
				>
					<Clock size={10} className="shrink-0" />
					<span className="truncate max-w-[170px] sm:max-w-[240px]">
						Приём: {nextDate.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} {nextDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
					</span>
				</span>
			)}
			{diagnosisText && (
				<span
					className="px-1.5 py-0.5 rounded-md bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] text-[10px] font-semibold truncate max-w-[140px]"
					title={`Диагноз: ${diagnosisText}`}
					data-testid="header-diagnosis-badge"
				>
					{diagnosisText}
				</span>
			)}
		</>
	);
};
