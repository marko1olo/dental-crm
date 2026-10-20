/**
 * apps/web/src/components/settings/DelimitedTileCard.tsx
 *
 * Канонический компонент тайла настроек по стандарту Apple Settings (Delimited Tile Card):
 * - Непрозрачная основа var(--paper-card)
 * - 1px граница var(--line)
 * - Микротень shadow-[0_1px_3px_rgba(0,0,0,0.06)]
 * - Скругление rounded-xl
 * - Паддинг p-3.5
 * - Бейдж иконки 28x28px в var(--paper-soft)
 * - Тактильный тумблер iOS Switch 36x20px со сдвигом на аппаратном translate-x
 * - 0 сырых HEX/slate/white цветов (строго дизайн-токены)
 */

import type React from "react";
import type { LucideIcon } from "lucide-react";

export interface DelimitedTileCardProps {
	icon: LucideIcon;
	title: string;
	description: string;
	checked: boolean;
	onChange: () => void;
	testId?: string;
	disabled?: boolean;
}

export const DelimitedTileCard: React.FC<DelimitedTileCardProps> = ({
	icon: Icon,
	title,
	description,
	checked,
	onChange,
	testId,
	disabled = false,
}) => {
	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (disabled) return;
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onChange();
		}
	};

	return (
		<div
			role="button"
			tabIndex={disabled ? -1 : 0}
			onClick={disabled ? undefined : onChange}
			onKeyDown={handleKeyDown}
			className={`flex items-center justify-between p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-card)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all select-none ${
				disabled
					? "opacity-60 cursor-not-allowed"
					: "hover:border-[var(--line-strong)] hover:shadow-xs cursor-pointer active:scale-[0.99]"
			}`}
			data-testid={testId}
			aria-pressed={checked}
		>
			<div className="flex items-center gap-3 min-w-0 pr-2">
				<div className="w-7 h-7 rounded-lg bg-[var(--paper-soft)] border border-[var(--line-subtle)] flex items-center justify-center shrink-0 text-[var(--teal)]">
					<Icon size={14} />
				</div>
				<div className="min-w-0">
					<div className="text-xs font-semibold text-[var(--ink)] truncate">{title}</div>
					<div className="text-[11px] text-[var(--muted)] truncate">{description}</div>
				</div>
			</div>
			<div
				className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
					checked ? "bg-[var(--teal)]" : "bg-[var(--line-strong)]"
				}`}
				aria-hidden="true"
			>
				<div
					className={`w-4 h-4 rounded-full bg-[var(--switch-thumb)] shadow-xs transition-transform absolute top-0.5 left-0.5 ${
						checked ? "translate-x-4" : "translate-x-0"
					}`}
				/>
			</div>
		</div>
	);
};
