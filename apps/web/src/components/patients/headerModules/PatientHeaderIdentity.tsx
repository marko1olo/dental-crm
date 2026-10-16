/**
 * DENTE CRM — Patient Header Identity & Status Info
 * (DOMAIN: Avatar, Initials, Name, Badges, Phone, Sentiment, Loyalty)
 */

import React from "react";
import {
	Calendar,
	Clock,
	Copy,
	FileCheck,
	FileText,
	Phone,
	ShieldAlert,
	ShieldCheck,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import { PatientLoyaltyHeader } from "../PatientLoyaltyHeader";
import { PatientSentimentBadge } from "../PatientSentimentBadge";

export interface PatientHeaderIdentityProps {
	// biome-ignore lint/suspicious/noExplicitAny: patient record
	resolvedPatient: any;
	fullName: string;
	initials: string;
	birthDateStr: string;
	phone: string;
	diagnosisText: string;
	isActiveVisit: boolean;
	nextAppointment: {
		id: string;
		startsAt?: string;
		status?: string;
		reason?: string;
	} | null;
	contractStatus?: "issued" | "draft" | "none";
	consentStatus?: "issued" | "draft" | "none";
}

export const PatientHeaderIdentity: React.FC<PatientHeaderIdentityProps> = ({
	resolvedPatient,
	fullName,
	initials,
	birthDateStr,
	phone,
	diagnosisText,
	isActiveVisit,
	nextAppointment,
	contractStatus,
	consentStatus,
}) => {
	const handleCopyPhone = () => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(phone);
			showToast("Телефон скопирован в буфер", "success");
		}
	};

	const effectiveContractStatus =
		contractStatus ??
		(resolvedPatient?.hasSignedContract || resolvedPatient?.contractStatus === "issued"
			? "issued"
			: resolvedPatient?.contractStatus === "draft"
				? "draft"
				: "none");

	const effectiveConsentStatus =
		consentStatus ??
		(resolvedPatient?.hasSignedConsent || resolvedPatient?.consentStatus === "issued"
			? "issued"
			: resolvedPatient?.consentStatus === "draft"
				? "draft"
				: "none");

	return (
		<div className="flex items-center gap-2.5 min-w-0 flex-1">
			{/* Avatar */}
			<div
				className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-[var(--teal-dark,#0d9488)] to-cyan-600 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-xs ring-1 ring-[var(--teal,#0d9488)]/30"
				title={fullName}
			>
				{initials}
			</div>

			<div className="min-w-0 flex-1">
				{/* Line 1: Full name + clinical & legal badges */}
				<div className="flex items-center gap-1.5 flex-wrap min-w-0">
					<h2 className="text-sm sm:text-base font-black text-[var(--ink)] leading-tight">
						{fullName}
					</h2>
					{isActiveVisit && (
						<span
							className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold inline-flex items-center gap-1 shrink-0"
							title="Пациент в данный момент находится на приёме"
						>
							<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
							В клинике
						</span>
					)}
					{/* Statutory Legal Badges (ПП РФ № 736 & 323-ФЗ ст. 20) */}
					{effectiveContractStatus === "issued" ? (
						<span
							className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-[10px] font-bold inline-flex items-center gap-1 shrink-0"
							title="Договор на оказание платных медицинских услуг подписан (ПП РФ № 736)"
							data-testid="badge-contract-status"
						>
							<FileCheck size={11} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
							<span>Договор: Подписан</span>
						</span>
					) : effectiveContractStatus === "draft" ? (
						<span
							className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-[10px] font-bold inline-flex items-center gap-1 shrink-0"
							title="Договор сформирован как черновик и ожидает подписания"
							data-testid="badge-contract-status"
						>
							<FileText size={11} className="shrink-0 text-amber-600 dark:text-amber-400" />
							<span>Договор: Черновик</span>
						</span>
					) : (
						<span
							className="px-1.5 py-0.5 rounded-md bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)] text-[10px] font-medium inline-flex items-center gap-1 shrink-0"
							title="Договор с пациентом не оформлен"
							data-testid="badge-contract-status"
						>
							<FileText size={11} className="shrink-0 opacity-60" />
							<span>Договор: Не оформлен</span>
						</span>
					)}

					{effectiveConsentStatus === "issued" ? (
						<span
							className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-[10px] font-bold inline-flex items-center gap-1 shrink-0"
							title="Информированное добровольное согласие (ИДС) подписано (323-ФЗ ст. 20, Приказ 1051н)"
							data-testid="badge-consent-status"
						>
							<ShieldCheck size={11} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
							<span>ИДС: Подписано</span>
						</span>
					) : effectiveConsentStatus === "draft" ? (
						<span
							className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-[10px] font-bold inline-flex items-center gap-1 shrink-0"
							title="ИДС сформировано как черновик и ожидает подписания"
							data-testid="badge-consent-status"
						>
							<Clock size={11} className="shrink-0 text-amber-600 dark:text-amber-400" />
							<span>ИДС: Черновик</span>
						</span>
					) : (
						<span
							className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-[10px] font-bold inline-flex items-center gap-1 shrink-0"
							title="Требуется оформление и подписание ИДС перед приёмом (323-ФЗ ст. 20)"
							data-testid="badge-consent-status"
						>
							<ShieldAlert size={11} className="shrink-0 text-amber-600 dark:text-amber-400" />
							<span>ИДС: Требуется</span>
						</span>
					)}
					{nextAppointment?.startsAt && (
						<span
							className="px-1.5 py-0.5 rounded-md bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal-dark,#0f766e)] dark:text-[var(--teal,#2dd4bf)] border border-[var(--teal,#0d9488)]/30 text-[10px] font-bold inline-flex items-center gap-1 shrink-0"
							title={`Следующий приём: ${new Date(nextAppointment.startsAt).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`}
							data-testid="header-next-appointment-badge"
						>
							<Clock size={10} className="shrink-0" />
							<span className="truncate max-w-[170px] sm:max-w-[240px]">
								Приём: {new Date(nextAppointment.startsAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} {new Date(nextAppointment.startsAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
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
				</div>

				{/* Line 2: Birthdate, Phone with copy, Loyalty, Sentiment */}
				<div className="flex items-center gap-2.5 flex-wrap text-[11px] text-[var(--muted)] mt-0.5 min-w-0">
					{birthDateStr && (
						<span className="inline-flex items-center gap-1 shrink-0">
							<Calendar size={11} className="shrink-0 opacity-70" />
							<span>{birthDateStr}</span>
						</span>
					)}
					{phone ? (
						<span className="inline-flex items-center gap-1 font-mono font-semibold text-[var(--ink)] shrink-0">
							<Phone size={11} className="text-[var(--teal,#0d9488)] shrink-0" />
							<span>{phone}</span>
							<button
								type="button"
								onClick={handleCopyPhone}
								className="p-0.5 rounded hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
								title="Скопировать телефон"
								aria-label="Скопировать телефон"
							>
								<Copy size={11} />
							</button>
						</span>
					) : (
						<span className="italic shrink-0">Телефон не указан</span>
					)}
					<PatientSentimentBadge patient={resolvedPatient} />
					<PatientLoyaltyHeader patientId={resolvedPatient.id} />
				</div>
			</div>
		</div>
	);
};
