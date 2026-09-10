/**
 * apps/web/src/components/PatientPortal.tsx
 *
 * DENTE Dental CRM — Compact Patient Portal Preview Component.
 * Consolidates 1116-line legacy monolith; full patient cabinet is in components/portal/patientCabinet/PatientCabinetModal.tsx.
 */

import type React from "react";
import { Calendar, CreditCard, FileText, ShieldCheck, Sparkles } from "lucide-react";

export interface PatientPortalProps {
	readonly className?: string;
	readonly onClose?: () => void;
}

export const PatientPortal: React.FC<PatientPortalProps> = ({ className = "" }) => {
	return (
		<div className={`flex flex-col gap-3 text-xs ${className}`}>
			<div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between">
				<div className="flex flex-col gap-0.5">
					<span className="font-bold text-sm text-[var(--ink,#0f172a)] flex items-center gap-1.5">
						<ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
						Личный кабинет пациента DENTE
					</span>
					<span className="text-[11px] text-[var(--muted,#64748b)]">
						Интерактивный защищенный портал (Приказ 804н / 63-ФЗ ПЭП)
					</span>
				</div>
				<span className="px-2 py-0.5 rounded-md bg-teal-600 text-white font-bold text-[10px]">
					Онлайн
				</span>
			</div>

			<div className="grid grid-cols-2 gap-2">
				<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col gap-1">
					<span className="flex items-center gap-1.5 font-bold text-[var(--ink,#0f172a)]">
						<Calendar className="w-3.5 h-3.5 text-teal-600" />
						Визиты
					</span>
					<span className="text-[11px] text-[var(--muted,#64748b)]">
						Запись и история приемов
					</span>
				</div>
				<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col gap-1">
					<span className="flex items-center gap-1.5 font-bold text-[var(--ink,#0f172a)]">
						<CreditCard className="w-3.5 h-3.5 text-emerald-600" />
						Оплата СБП
					</span>
					<span className="text-[11px] text-[var(--muted,#64748b)]">
						1-клик QR НСПК
					</span>
				</div>
				<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col gap-1">
					<span className="flex items-center gap-1.5 font-bold text-[var(--ink,#0f172a)]">
						<FileText className="w-3.5 h-3.5 text-blue-600" />
						Документы
					</span>
					<span className="text-[11px] text-[var(--muted,#64748b)]">
						ИДС, договоры, планы
					</span>
				</div>
				<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col gap-1">
					<span className="flex items-center gap-1.5 font-bold text-[var(--ink,#0f172a)]">
						<Sparkles className="w-3.5 h-3.5 text-amber-500" />
						Бонусы
					</span>
					<span className="text-[11px] text-[var(--muted,#64748b)]">
						Семейный кошелек
					</span>
				</div>
			</div>
		</div>
	);
};

export default PatientPortal;
