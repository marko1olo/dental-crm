/**
 * SoftPresenceIndicator.tsx — DENTE CRM Passive Soft Presence Capsule
 *
 * Инварианты:
 * 1. Mandate 8e (Doctor Autonomy): нулевой визуальный барьер, никакой блокировки ввода.
 * 2. Mandate 8c (Quiet Telemetry): когда врач работает один, компонент скрыт (null).
 *    Когда карту открыл коллега, ненавязчиво отображается тихий бейдж с аватаром.
 * 3. 44x44px touch target доступность при клике на подробности.
 */

import React, { useMemo, useState } from "react";
import { Eye, Users, Info } from "lucide-react";
import type { SoftPeerPresence } from "../../hooks/useSoftPresence";

export interface SoftPresenceIndicatorProps {
	readonly activePeers: readonly SoftPeerPresence[];
	readonly summaryText: string | null;
	readonly className?: string | undefined;
}

export const SoftPresenceIndicator: React.FC<SoftPresenceIndicatorProps> = ({
	activePeers,
	summaryText,
	className = "",
}) => {
	const [isTooltipOpen, setIsTooltipOpen] = useState(false);

	if (!activePeers || activePeers.length === 0) {
		return null;
	}

	const primaryPeer = activePeers[0];
	if (!primaryPeer) return null;

	const roleLabelRu = useMemo(() => {
		switch (primaryPeer.role) {
			case "doctor":
				return "Врач";
			case "nurse":
			case "assistant":
				return "Ассистент";
			case "admin":
			case "senior_admin":
			case "registrar":
				return "Регистратор";
			default:
				return "Коллега";
		}
	}, [primaryPeer.role]);

	return (
		<div
			className={`relative inline-flex items-center shrink-0 ${className}`}
			data-testid="soft-presence-indicator"
		>
			<button
				type="button"
				onClick={() => setIsTooltipOpen((prev) => !prev)}
				onMouseEnter={() => setIsTooltipOpen(true)}
				onMouseLeave={() => setIsTooltipOpen(false)}
				className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-sky-400/30 bg-sky-50/60 dark:bg-sky-950/40 text-sky-800 dark:text-sky-200 text-[11px] font-medium transition-all hover:bg-sky-100/70 dark:hover:bg-sky-900/40 cursor-pointer select-none"
				aria-label={summaryText || "Коллега просматривает эту карту"}
				title={summaryText || "Коллега просматривает эту карту"}
			>
				<span className="relative flex h-2 w-2 shrink-0">
					<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
					<span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
				</span>

				<Eye className="w-3 h-3 text-sky-600 dark:text-sky-300 shrink-0" aria-hidden="true" />

				<span className="truncate max-w-[140px] sm:max-w-[200px]">
					{activePeers.length === 1
						? `${roleLabelRu}: ${primaryPeer.staffName}`
						: `${roleLabelRu}: ${primaryPeer.staffName} +${activePeers.length - 1}`}
				</span>
			</button>

			{/* Quiet Clinical Tooltip */}
			{isTooltipOpen && (
				<div
					className="absolute left-0 top-full mt-1 w-64 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xl z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
					role="tooltip"
				>
					<div className="flex items-start gap-1.5 mb-1 text-sky-700 dark:text-sky-300 font-bold">
						<Users size={14} className="shrink-0 mt-0.5" />
						<span>Совместный просмотр карты</span>
					</div>
					<p className="text-[11px] text-[var(--muted)] leading-relaxed mb-2">
						{summaryText || "Коллеги просматривают этот визит."}
					</p>
					<div className="flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50/80 dark:bg-emerald-950/30 p-1 rounded-md">
						<Info size={12} className="shrink-0" />
						<span>Блокировок нет: вы свободно сохраняете любые данные</span>
					</div>
				</div>
			)}
		</div>
	);
};

export default SoftPresenceIndicator;
