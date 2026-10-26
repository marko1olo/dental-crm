/**
 * apps/web/src/components/settings/roleMatrix/PermissionRowItem.tsx
 *
 * Apple HIG Permission Row with 44x24px Switch (Mandates 8b, 8e, 8n, 8x).
 * Strictly <= 120 lines ceiling.
 */

import { type AccessLevel, type PermissionDefinition, getAccessLevelBadge } from "@dental/shared";
import { AlertTriangle, Check, Lock } from "lucide-react";
import type React from "react";
import { HUMAN_PERM_TITLES, SUPER_PERMISSIONS_MAP } from "./roleMatrixConstants";

interface PermissionRowItemProps {
	readonly permission: PermissionDefinition;
	readonly level: AccessLevel;
	readonly onToggle: (permKey: string) => void;
	readonly onCycleLevel: (permKey: string) => void;
}

export const PermissionRowItem: React.FC<PermissionRowItemProps> = ({
	permission,
	level,
	onToggle,
	onCycleLevel,
}) => {
	const badge = getAccessLevelBadge(level);
	const superInfo = SUPER_PERMISSIONS_MAP[permission.key];
	const isGranted = level === "full" || level === "read" || level === "own";
	const humanMeta = HUMAN_PERM_TITLES[permission.key];
	const title = humanMeta?.title || permission.title;
	const desc = humanMeta?.desc || permission.description;

	return (
		<div
			className="p-3 sm:py-2.5 sm:px-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 hover:bg-[var(--paper-soft)]/50 transition-colors min-h-[52px]"
			data-testid={`perm-row-${permission.key}`}
		>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="font-bold text-xs text-[var(--ink)] leading-snug">{title}</span>
					<span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]">
						{permission.module}
					</span>
					{superInfo && (
						<span
							className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
								superInfo.isCritical
									? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
									: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
							}`}
							title={superInfo.hint}
						>
							<AlertTriangle size={10} className="shrink-0" />
							<span>{superInfo.badge}</span>
						</span>
					)}
				</div>
				<p className="text-[11px] text-[var(--muted)] m-0 mt-0.5 leading-normal">{desc}</p>
			</div>

			<div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
				<button
					type="button"
					onClick={() => onCycleLevel(permission.key)}
					className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border shadow-2xs cursor-pointer touch-manipulation min-h-[36px] ${badge.badgeClass} ${badge.borderClass}`}
					data-testid={`perm-badge-${permission.key}-${level}`}
					title="Нажмите для смены уровня доступа (Чтение / Полный / Закрыто)"
				>
					{isGranted ? <Check size={12} className="stroke-[3]" /> : <Lock size={12} />}
					<span>{badge.label}</span>
				</button>

				{/* Apple HIG 44x24px Switch Toggle with >= 44x44px touch area */}
				<button
					type="button"
					role="switch"
					aria-checked={isGranted}
					aria-label={`Переключить доступ для ${title}`}
					onClick={() => onToggle(permission.key)}
					className="w-11 h-11 flex items-center justify-center cursor-pointer touch-manipulation rounded-lg hover:bg-[var(--paper-soft)]"
					data-testid={`perm-switch-${permission.key}`}
				>
					<div
						className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center ${
							level === "full" ? "bg-emerald-500 justify-end" :
							level === "read" ? "bg-sky-500 justify-center" :
							level === "own" ? "bg-amber-500 justify-center" : "bg-[var(--line)] justify-start"
						}`}
					>
						<div className="w-5 h-5 rounded-full bg-[var(--paper)] shadow-xs pointer-events-none" />
					</div>
				</button>
			</div>
		</div>
	);
};
