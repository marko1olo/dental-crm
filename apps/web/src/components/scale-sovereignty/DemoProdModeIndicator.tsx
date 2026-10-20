/**
 * @file DemoProdModeIndicator.tsx
 * @description Dual-Engine Contour Indicator (Demo Showcase vs. Live Production).
 * Adheres to Mandate 8c (Zero-Mocks in Prod), Mandate 8e (Doctor Autonomy),
 * Mandate 8n (PostgreSQL 18 on port 5432), and Mandate 8d (0 cartoon emojis).
 */

import React, { useCallback } from "react";
import {
	Database,
	LogOut,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import {
	isDemoShowcaseMode,
	disableDemoShowcaseMode,
} from "../../utils/demoModeEngine.js";
import { restoreLiveStaffSessionAfterDemo } from "../../utils/demo/demoInteractiveSimulation.js";
import { syncAuthTokensFromStorage } from "../../lib/apiAuthFetch.js";
import { showToast } from "../GlobalToast.js";

export interface DemoProdModeIndicatorProps {
	className?: string;
	compact?: boolean;
	onModeSwitch?: () => void;
}

export function DemoProdModeIndicator({
	className = "",
	compact = false,
	onModeSwitch,
}: DemoProdModeIndicatorProps) {
	const isDemo = isDemoShowcaseMode();

	const handleExitDemoToProduction = useCallback(() => {
		disableDemoShowcaseMode();
		restoreLiveStaffSessionAfterDemo();
		syncAuthTokensFromStorage();

		if (typeof window !== "undefined") {
			try {
				localStorage.removeItem("dente_demo_showcase");
				localStorage.removeItem("dente_demo_active_role");
			} catch {
				// storage error
			}
			const url = new URL(window.location.href);
			url.searchParams.delete("demo");
			url.searchParams.delete("showcase");
			if (url.hash.includes("demo")) {
				url.hash = "";
			}
			window.location.href = url.pathname + (url.search ? url.search : "");
		}

		showToast("Переход в боевой режим клиники (PostgreSQL 18:5432)", "info");
		onModeSwitch?.();
	}, [onModeSwitch]);

	if (isDemo) {
		return (
			<div
				className={`dnt-contour-indicator dnt-contour-indicator--demo inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold ${className}`}
				data-testid="demo-contour-indicator"
				title="Активен ознакомительный демо-контур со сквозным сидированием в PostgreSQL 18"
			>
				<Sparkles size={12} className="text-amber-500 shrink-0" aria-hidden="true" />
				<span className="truncate max-w-[100px] sm:max-w-none">
					{compact ? "Демо" : "Демо-витрина"}
				</span>
				<button
					type="button"
					onClick={handleExitDemoToProduction}
					data-testid="exit-to-prod-button"
					className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
					title="Безопасно переключиться в боевой режим клиники"
					aria-label="Перейти в боевой режим"
				>
					<LogOut size={10} aria-hidden="true" />
					<span>В боевой</span>
				</button>
			</div>
		);
	}

	return (
		<div
			className={`dnt-contour-indicator dnt-contour-indicator--prod inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors ${className}`}
			data-testid="prod-contour-indicator"
			data-engine="PG 18:5432"
			title="Активен боевой контур клиники (PostgreSQL 18 на 127.0.0.1:5432)"
		>
			<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
			<span className="truncate max-w-[80px] sm:max-w-none">
				{compact ? "Боевой" : "Боевой контур"}
			</span>
		</div>
	);
}

export default DemoProdModeIndicator;
