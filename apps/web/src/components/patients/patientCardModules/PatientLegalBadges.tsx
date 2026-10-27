import { FileCheck, FileText, ShieldAlert, ShieldCheck } from "lucide-react";
import React from "react";

interface PatientLegalBadgesProps {
	readonly contractStatus: "issued" | "draft" | "none";
	readonly consentStatus: "issued" | "draft" | "none";
}

export function PatientLegalBadges({ contractStatus, consentStatus }: PatientLegalBadgesProps) {
	return (
		<>
			{contractStatus === "issued" ? (
				<span
					className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-xs font-bold inline-flex items-center gap-1 shrink-0"
					title="Договор на оказание платных медицинских услуг подписан"
					data-testid="badge-contract-status"
				>
					<FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
					<span>Договор: Подписан</span>
				</span>
			) : contractStatus === "draft" ? (
				<span
					className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-xs font-bold inline-flex items-center gap-1 shrink-0"
					title="Договор сформирован как черновик и ожидает подписания"
					data-testid="badge-contract-status"
				>
					<FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
					<span>Договор: Черновик</span>
				</span>
			) : (
				<span
					className="px-2 py-0.5 rounded-md bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)] text-xs font-medium inline-flex items-center gap-1 shrink-0"
					title="Договор с пациентом не оформлен"
					data-testid="badge-contract-status"
				>
					<FileText className="w-3.5 h-3.5 opacity-60" />
					<span>Договор: Не оформлен</span>
				</span>
			)}

			{consentStatus === "issued" ? (
				<span
					className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-xs font-bold inline-flex items-center gap-1 shrink-0"
					title="Информированное согласие на лечение подписано пациентом"
					data-testid="badge-consent-status"
				>
					<ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
					<span>ИДС: Подписано</span>
				</span>
			) : consentStatus === "draft" ? (
				<span
					className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-xs font-bold inline-flex items-center gap-1 shrink-0"
					title="Согласие на лечение сформировано как черновик и ожидает подписания"
					data-testid="badge-consent-status"
				>
					<FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
					<span>ИДС: Черновик</span>
				</span>
			) : (
				<span
					className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-xs font-bold inline-flex items-center gap-1 shrink-0"
					title="Требуется оформление и подписание информированного согласия на лечение"
					data-testid="badge-consent-status"
				>
					<ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
					<span>ИДС: Требуется</span>
				</span>
			)}
		</>
	);
}
