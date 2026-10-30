/**
 * PerioWorkspaceFooter.tsx — Мобильный плавающий футер кабинета пародонтологии
 * Natural Thumb Zone (Apple HIG), 1 Primary CTA #0d9488 (Мандаты 8am, 8al, 8ze).
 */

import React from "react";
import { Check, Save } from "lucide-react";

export interface PerioWorkspaceFooterProps {
	readonly onSetAllIntact: () => void;
	readonly onSave: () => void;
}

export const PerioWorkspaceFooter: React.FC<PerioWorkspaceFooterProps> = React.memo(({
	onSetAllIntact,
	onSave,
}) => {
	return (
		<div className="perio-mobile-floating-bar fixed bottom-0 left-0 right-0 p-3 bg-[var(--paper)]/95 backdrop-blur-md border-t border-[var(--line)] z-20 flex items-center justify-between gap-2 shadow-lg">
			<button
				type="button"
				onClick={onSetAllIntact}
				disabled={false}
				className="min-h-[44px] px-3.5 rounded-xl bg-[var(--paper-soft)] text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-[var(--line)] flex items-center gap-1.5 cursor-pointer shrink-0"
			>
				<Check className="w-3.5 h-3.5" /> <span>Норма</span>
			</button>
			<button
				type="button"
				onClick={onSave}
				disabled={false}
				data-testid="perio-save-mobile-btn"
				className="perio-primary-cta-btn flex-1 min-h-[48px] px-3 rounded-xl !bg-[#0d9488] hover:!bg-[#0f766e] !text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all whitespace-nowrap"
				title="Сохранить статус десны"
			>
				<Save className="w-4 h-4 !text-white shrink-0" /> <span className="!text-white">✓ Зафиксировать статус</span>
			</button>
		</div>
	);
});

PerioWorkspaceFooter.displayName = "PerioWorkspaceFooter";
