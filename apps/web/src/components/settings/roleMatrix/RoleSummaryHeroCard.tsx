/**
 * apps/web/src/components/settings/roleMatrix/RoleSummaryHeroCard.tsx
 *
 * Profile card & security barriers (Mandates 8b, 8e, 8n, 8x).
 * Strictly <= 120 lines ceiling.
 */

import type { GranularStaffRole } from "@dental/shared";
import { Check, Lock, Shield, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import type React from "react";
import { CANONICAL_ROLE_PROFILES, ROLE_DISPLAY_NAMES } from "./roleMatrixConstants";

interface RoleSummaryHeroCardProps {
	readonly role: GranularStaffRole;
	readonly onApplyDoctorPreset?: () => void;
	readonly onResetToStandard?: () => void;
}

const ROLE_BARRIERS: Record<string, { testId: string; title: string; color: string; items: [string, string][] }> = {
	doctor: {
		testId: "doctor-security-barriers", title: "Принципы автономии и безопасности для роли «Врач-стоматолог»:", color: "text-[var(--teal)]",
		items: [
			["Защита базы:", "Врач видит карты своих пациентов, телефоны маскируются."],
			["Финансовая изоляция:", "Личная сделка открыта; P&L и чужие зарплаты закрыты."],
			["Автономия врача:", "Свобода дневников ЭМК, назначения услуг и скидки до 100%."],
			["Прайс-лист услуг:", "Базовые расценки открыты, смена цен — за владельцем."],
		],
	},
	owner: {
		testId: "owner-security-barriers", title: "Полномочия роли «Главврач / Владелец»:", color: "text-purple-500",
		items: [
			["P&L и прибыль:", "Выручка по креслам, чистая прибыль и маржинальность."],
			["Управление ФОТ:", "Процентные ставки врачей, оклады и удержания за ЗТЛ."],
			["Безопасность базы:", "Аудит обращений к ПДн и экспорт клиентской базы."],
			["Клинический аудит:", "Утверждение стандартов лечения без блокировки врача."],
		],
	},
	assistant: {
		testId: "assistant-security-barriers", title: "Барьеры безопасности для роли «Ассистент врача»:", color: "text-amber-500",
		items: [
			["Маскирование телефонов:", "Номера телефонов пациентов скрыты в реестрах от утечек."],
			["Запрет подписи ЭМК:", "Подписание клинических протоколов за врача заблокировано."],
			["Расходники и автоклавы:", "Списание материалов на приёме и журналы стерилизации."],
		],
	},
	registrar: {
		testId: "admin-security-barriers", title: "Барьеры безопасности для роли «Администратор»:", color: "text-sky-500",
		items: [
			["Касса и чеки:", "Приём оплат, пробитие чеков, оформление расписания."],
			["Изоляция зарплат и P&L:", "Финансовые ведомости врачей и прибыль скрыты."],
			["Запрет правки ЭМК:", "Регистратор не имеет доступа к клиническим диагнозам."],
		],
	},
};

export const RoleSummaryHeroCard: React.FC<RoleSummaryHeroCardProps> = ({ role, onApplyDoctorPreset }) => {
	const canonical = CANONICAL_ROLE_PROFILES.find((c) => c.id === role);
	const roleTitle = ROLE_DISPLAY_NAMES[role] || role;
	const barrierKey = role === "head_doctor" ? "owner" : role === "senior_nurse" ? "assistant" : role === "senior_admin" ? "registrar" : role;
	const barriers = ROLE_BARRIERS[barrierKey];

	return (
		<div className="flex flex-col gap-2.5 min-w-0" data-testid="role-summary-hero-card">
			<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal-soft)] text-[var(--teal-dark)] flex items-center justify-center shrink-0 border border-[var(--teal)]/20">
						<ShieldCheck size={18} />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="font-bold text-xs sm:text-sm text-[var(--ink)]">{roleTitle}</span>
							{canonical && (
								<span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--teal-soft)] text-[var(--teal-dark)] font-semibold border border-[var(--line-subtle)]">
									{canonical.badge}
								</span>
							)}
						</div>
						<p className="text-[11px] text-[var(--muted)] m-0 leading-normal line-clamp-1">{canonical?.summary}</p>
					</div>
				</div>

				{role === "doctor" && onApplyDoctorPreset && (
					<button
						type="button" onClick={onApplyDoctorPreset}
						className="px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-bold bg-[var(--teal-soft)] text-[var(--teal-dark)] hover:bg-[var(--teal)]/20 border border-[var(--teal)]/30 flex items-center gap-1.5 cursor-pointer touch-manipulation transition-colors shrink-0"
						title="Применить клинический пресет: скидки до 100%, ЭМК без блокировок"
					>
						<Sparkles size={14} className="text-[var(--teal)]" />
						<span>✓ Автономия врача (скидки 100%)</span>
					</button>
				)}
			</div>

			{barriers && (
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs flex flex-col gap-2" data-testid={barriers.testId}>
					<div className="font-bold text-[11px] text-[var(--ink)] flex items-center gap-1.5">
						<ShieldCheck size={15} className={barriers.color} />
						<span>{barriers.title}</span>
					</div>
					<div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${barriers.items.length} gap-2 text-[11px]`}>
						{barriers.items.map(([hdr, desc]) => (
							<div key={hdr} className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
								<strong className="block text-[var(--ink)]">{hdr}</strong>
								<span className="text-[var(--muted)]">{desc}</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
