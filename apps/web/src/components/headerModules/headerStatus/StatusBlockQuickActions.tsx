/**
 * @file StatusBlockQuickActions.tsx
 * @description Theme, typography scale, accessibility, and session locking (Mandate 8b <= 120 lines).
 */

import React from "react";
import { Building2, Glasses, Layers, Lock, Moon, Sparkles, Sun } from "lucide-react";
import { useAppStore } from "../../../store/appStore.js";
import { useThemeStore } from "../../../store/themeStore.js";
import { AccessibilityModeButton } from "../HeaderUserMenu.js";
import type { StatusBlockQuickActionsProps } from "./headerStatusTypes.js";

const FONT_SIZES = [
	{ size: "normal" as const, label: "A", title: "Стандартный шрифт (100%)" },
	{ size: "large" as const, label: "A+", title: "Увеличенный шрифт (115%)" },
	{ size: "x-large" as const, label: "A++", title: "Крупный шрифт (130%)" },
];

export function StatusBlockQuickActions({ onClose, onLockSession }: StatusBlockQuickActionsProps) {
	const theme = useThemeStore();
	const setCurrentView = useAppStore((s) => s.setCurrentView);
	const isLight = theme.themeMode === "light" || theme.themeMode === "warm_sand" || theme.themeMode === "sakura";

	const navigateToSettings = () => {
		onClose(); setCurrentView("settings");
		if (typeof window !== "undefined") window.location.hash = "settings";
	};

	return (
		<div className="dnt-cc-section">
			<div className="dnt-cc-section-header">
				<span className="dnt-cc-section-title">
					<Glasses size={13} className="text-[var(--teal)]" />
					<span>Доступность и масштаб</span>
				</span>
				<fieldset className="flex items-center gap-1 bg-[var(--paper-soft,#f1f5f9)] p-0.5 rounded-lg border border-[var(--line,#cbd5e1)] m-0" aria-label="Размер шрифта">
					{FONT_SIZES.map((btn) => (
						<button
							key={btn.size}
							type="button"
							onClick={() => theme.setA11yFontSize(btn.size)}
							className={`min-h-[32px] min-w-[32px] px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer ${
								theme.a11yFontSize === btn.size
									? "bg-[var(--paper-strong,#ffffff)] text-[var(--ink,#0f172a)] shadow-xs border border-[var(--line,#cbd5e1)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							title={btn.title}
							aria-pressed={theme.a11yFontSize === btn.size}
						>
							{btn.label}
						</button>
					))}
				</fieldset>
			</div>

			<div className="pt-2.5 pb-1 flex items-center justify-between gap-2">
				<span className="text-xs font-semibold text-[var(--muted)]">Тема оформления:</span>
				<div className="dente-segmented-bar" role="radiogroup" aria-label="Быстрое переключение темы">
					<button
						type="button"
						role="radio"
						aria-checked={isLight}
						onClick={() => theme.setThemeMode("light")}
						className={`dente-segmented-item ${isLight ? "active" : ""}`}
						data-testid="header-theme-toggle-light"
					>
						<Sun size={13} className="shrink-0 text-amber-500" />
						<span>Светлая</span>
					</button>
					<button
						type="button"
						role="radio"
						aria-checked={!isLight}
						onClick={() => theme.setThemeMode("dark")}
						className={`dente-segmented-item ${!isLight ? "active" : ""}`}
						data-testid="header-theme-toggle-dark"
					>
						<Moon size={13} className="shrink-0 text-sky-400" />
						<span>Тёмная</span>
					</button>
				</div>
			</div>

			<div className="flex items-center justify-between gap-2 pt-1 text-xs">
				<AccessibilityModeButton className="flex-1 !min-h-[44px]" onToggle={theme.toggleAccessibilityMode} />
				<button
					type="button"
					onClick={() => { onClose(); window?.dispatchEvent?.(new CustomEvent("dente:open-theme-switcher")); }}
					className="dnt-cc-btn dnt-cc-btn--secondary flex-1 !min-h-[44px]"
					data-testid="header-palette-picker-btn"
				>
					<Sparkles size={14} className="text-[var(--teal)]" />
					<span>Палитра (10 тем)</span>
				</button>
			</div>

			<div className="pt-2 flex items-center gap-2">
				<button type="button" onClick={navigateToSettings} className="secondary-button flex-1 h-8 min-h-[32px] text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] flex items-center justify-center gap-1.5 cursor-pointer" data-testid="header-quick-clinic-settings-btn">
					<Building2 size={13} className="text-[var(--teal)] shrink-0" />
					<span>Профиль</span>
				</button>
				<button type="button" onClick={navigateToSettings} className="secondary-button flex-1 h-8 min-h-[32px] text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] flex items-center justify-center gap-1.5 cursor-pointer" data-testid="header-quick-branches-btn">
					<Layers size={13} className="text-[var(--teal)] shrink-0" />
					<span>Филиалы</span>
				</button>
			</div>

			{onLockSession && (
				<div className="pt-2">
					<button type="button" onClick={() => { onClose(); onLockSession(); }} className="dnt-cc-btn dnt-cc-btn--secondary w-full !min-h-[44px] text-rose-600 dark:text-rose-400">
						<Lock size={14} />
						<span>Заблокировать сессию</span>
					</button>
				</div>
			)}
		</div>
	);
}
