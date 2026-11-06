/**
 * @file CopilotSettingsTrustTab.tsx
 * @description Trust Level & Autonomy settings tab: 3 trust tiers (confirm_all, balanced, autonomous)
 * and fine-grained agent tool auto-approve permissions (Mandate 8b <= 200 lines, Mandate 8e).
 */

import React from "react";
import { Lock, ShieldAlert, ShieldCheck, Zap } from "lucide-react";
import type { AiTrustLevel, GranularAgentPermissions } from "../../../store/copilotStore";
import { CopilotSettingsGranularPermissions } from "./CopilotSettingsGranularPermissions";

export const TRUST_LEVELS: Array<{
	id: AiTrustLevel;
	title: string;
	badge: string;
	description: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
	{
		id: "confirm_all",
		title: "Строгий контроль — Максимальный контроль (Параноик)",
		badge: "100% подтверждений",
		description: "Двухфазное подтверждение каждого действия и мутации базы данных (одонтограмма, расписание, списание, чтение файлов).",
		icon: Lock,
	},
	{
		id: "balanced",
		title: "Сбалансированный (Копайлот)",
		badge: "Рекомендуемый",
		description: "Авто-запись дневников SOAP и смет, подтверждение только деструктивных операций и удаления.",
		icon: ShieldCheck,
	},
	{
		id: "autonomous",
		title: "Автономный ассистент — Высокая автономия (Суперагент)",
		badge: "Мандат 8e",
		description: "Применение готовых планов в 1 клик по Мандату 8e без лишних преград с возможностью быстрой отмены.",
		icon: Zap,
	},
];

export interface CopilotSettingsTrustTabProps {
	trustLevel: AiTrustLevel;
	setTrustLevel: (lvl: AiTrustLevel) => void;
	granularPermissions: GranularAgentPermissions;
	setGranularPermissions: (perms: GranularAgentPermissions) => void;
}

export function CopilotSettingsTrustTab({
	trustLevel,
	setTrustLevel,
	granularPermissions,
	setGranularPermissions,
}: CopilotSettingsTrustTabProps) {
	return (
		<div className="space-y-4 text-xs" data-testid="copilot-settings-trust-tab">
			<section className="space-y-2">
				<label className="font-bold text-[var(--ink)] flex items-center gap-1.5">
					<ShieldAlert size={14} className="text-[var(--teal,#0d9488)]" />
					<span>Уровень доверия к действиям ИИ</span>
				</label>
				<div className="grid grid-cols-1 gap-2">
					{TRUST_LEVELS.map((lvl) => {
						const normalizedActive = trustLevel === "supervised" ? "balanced" : (trustLevel === "cautious" ? "confirm_all" : trustLevel);
						const isSelected = normalizedActive === lvl.id;
						const Icon = lvl.icon;
						return (
							<button
								key={lvl.id}
								type="button"
								onClick={() => setTrustLevel(lvl.id)}
								className={`p-2.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
									isSelected
										? "border-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.08))] shadow-sm"
										: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								<div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
									isSelected ? "bg-[var(--teal,#0d9488)] text-white" : "bg-[var(--paper-soft)] text-[var(--muted)]"
								}`}>
									<Icon size={14} />
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between gap-2">
										<span className="font-bold text-[var(--ink)]">{lvl.title}</span>
										<span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
											isSelected ? "bg-[var(--teal,#0d9488)]/20 text-[var(--teal,#0d9488)]" : "bg-[var(--paper-soft)] text-[var(--muted)]"
										}`}>
											{lvl.badge}
										</span>
									</div>
									<p className="mt-0.5 text-[11px] text-[var(--muted)] leading-relaxed">{lvl.description}</p>
								</div>
							</button>
						);
					})}
				</div>
			</section>

			<CopilotSettingsGranularPermissions
				granularPermissions={granularPermissions}
				setGranularPermissions={setGranularPermissions}
			/>
		</div>
	);
}
