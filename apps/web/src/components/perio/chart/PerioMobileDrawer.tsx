/**
 * PerioMobileDrawer.tsx — Нативный Bottom Sheet Apple HIG для смартфонов (390x844).
 * Переключатель 6 секстантов ВОЗ/PSR и кнопки действий в Natural Thumb Zone (Мандат 8b, <= 120 строк).
 */

import type { PsrSextantResult } from "@dental/shared";
import { ShieldCheck, X } from "lucide-react";
import React from "react";
import { triggerHaptic } from "../../../native/mobileBridge";

type PsrCode = PsrSextantResult["code"];

export interface PerioMobileDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onApplySextantCode?: ((sextantName: string, code: PsrCode, asterisk?: boolean) => void) | undefined;
	readonly onApplyNormAll?: (() => void) | undefined;
}

const SEXTANTS = [
	{ name: "S1", label: "S1 (17–14)" },
	{ name: "S2", label: "S2 (13–23)" },
	{ name: "S3", label: "S3 (24–27)" },
	{ name: "S4", label: "S4 (37–34)" },
	{ name: "S5", label: "S5 (33–43)" },
	{ name: "S6", label: "S6 (44–47)" },
] as const;

export const PerioMobileDrawer: React.FC<PerioMobileDrawerProps> = React.memo(({
	isOpen, onClose, onApplySextantCode, onApplyNormAll,
}) => {
	const [selectedSextant, setSelectedSextant] = React.useState<string>("S1");

	if (!isOpen) return null;

	const handleCode = (code: PsrCode, asterisk = false) => {
		triggerHaptic("selection");
		onApplySextantCode?.(selectedSextant, code, asterisk);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
			<div
				className="w-full max-w-lg bg-[var(--paper)] rounded-t-[24px] border-t border-[var(--line)] shadow-2xl p-4 flex flex-col gap-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] overflow-x-clip max-w-[100vw] animate-in slide-in-from-bottom duration-250 select-none"
				data-testid="perio-mobile-drawer"
			>
				{/* Drag Handle & Header */}
				<div className="flex flex-col items-center gap-2">
					<div className="w-9 h-1 rounded-full bg-[var(--muted)]/40 shrink-0" />
					<div className="w-full flex items-center justify-between">
						<span className="text-sm font-bold text-[var(--ink)]">Экспресс-скрининг ВОЗ (PSR)</span>
						<button
							type="button" onClick={onClose}
							className="w-8 h-8 rounded-full bg-[var(--paper-soft)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)]"
						>
							<X size={16} />
						</button>
					</div>
				</div>

				{/* 6 Sextants Selector Chips */}
				<div className="grid grid-cols-6 gap-1 w-full">
					{SEXTANTS.map((s) => (
						<button
							key={s.name} type="button"
							onClick={() => { triggerHaptic("selection"); setSelectedSextant(s.name); }}
							className={`h-11 rounded-xl text-xs font-bold font-mono flex flex-col items-center justify-center transition-all ${
								selectedSextant === s.name
									? "bg-teal-600 text-white shadow-xs font-black"
									: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
							}`}
							data-testid={`psr-sextant-chip-${s.name}`}
						>
							<span>{s.name}</span>
						</button>
					))}
				</div>

				{/* Natural Thumb Zone (Codes 0..4) */}
				<div className="grid grid-cols-5 gap-1.5 w-full pt-1">
					{[
						{ code: 0 as PsrCode, label: "0", sub: "Норма", cls: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/40" },
						{ code: 1 as PsrCode, label: "1", sub: "BOP+", cls: "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40" },
						{ code: 2 as PsrCode, label: "2", sub: "Камень", cls: "bg-amber-500/25 text-amber-800 dark:text-amber-300 border-amber-500/40 font-bold" },
						{ code: 3 as PsrCode, label: "3", sub: "4-5 мм", cls: "bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/40 font-bold" },
						{ code: 4 as PsrCode, label: "4*", sub: ">=6 мм", cls: "bg-rose-500/20 text-rose-800 dark:text-rose-200 border-rose-500/40 font-black" },
					].map((item) => (
						<button
							key={item.label} type="button" onClick={() => handleCode(item.code, item.code === 4)}
							className={`min-h-[52px] h-[52px] rounded-xl flex flex-col items-center justify-center border active:scale-95 transition-all shadow-xs ${item.cls}`}
							data-testid={`psr-code-btn-${item.code}`}
						>
							<span className="text-base font-black leading-none">{item.label}</span>
							<span className="text-[10px] opacity-75">{item.sub}</span>
						</button>
					))}
				</div>

				{/* 1-Click All Norm CTA */}
				{onApplyNormAll && (
					<button
						type="button"
						onClick={() => { triggerHaptic("impact"); onApplyNormAll(); onClose(); }}
						className="min-h-[48px] h-12 w-full rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xs"
					>
						<ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
						<span>Все 6 секстантов в норме (PSR 0)</span>
					</button>
				)}
			</div>
		</div>
	);
});

PerioMobileDrawer.displayName = "PerioMobileDrawer";
