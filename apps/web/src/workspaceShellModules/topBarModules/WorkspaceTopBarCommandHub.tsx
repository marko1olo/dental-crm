/**
 * DENTE Dental CRM — Central Island: Unified Command Hub / Search (Layer 4)
 * 
 * Mandate 8d (Apple HIG / Studio Clinical Standard), Mandate 8e (Doctor Autonomy)
 * 1-click & Ctrl+K Omnibar Spotlight trigger with Voice Search & Command Routing.
 */

import React, { useCallback } from "react";
import { Mic, Search } from "lucide-react";
import { workspaceTopbarLabels } from "../../workspaceUiLabels";
import { useUnifiedDictation } from "../../hooks/useUnifiedDictation";
import { useAppStore } from "../../store/appStore";

export function WorkspaceTopBarCommandHub() {
	const handleOpenCommandHud = useCallback((initialQuery?: string) => {
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente:open-command-hud", {
					detail: initialQuery ? { query: initialQuery } : undefined,
				}),
			);
		}
	}, []);

	const routeVoiceCommand = useCallback((rawText: string) => {
		const text = rawText.trim().toLowerCase();
		if (!text) return;

		const navMap: Record<string, string> = {
			"касса": "finance",
			"кассу": "finance",
			"оплата": "finance",
			"чеки": "finance",
			"расписание": "schedule",
			"календарь": "schedule",
			"пациенты": "patients",
			"пациентов": "patients",
			"картотека": "patients",
			"планы": "pipeline",
			"план": "pipeline",
			"снимки": "imaging",
			"снимок": "imaging",
			"рентген": "imaging",
			"кт": "imaging",
			"прием": "visit",
			"приём": "visit",
			"визит": "visit",
			"документы": "documents",
			"договор": "documents",
			"склад": "inventory",
			"материалы": "inventory",
			"сканер": "scanner",
			"честный знак": "scanner",
			"лаборатория": "lab",
			"наряды": "lab",
			"лиды": "leads",
			"онлайн-запись": "leads",
			"аналитика": "analytics",
			"отчеты": "analytics",
			"отчёты": "analytics",
			"настройки": "settings",
		};

		for (const [trigger, view] of Object.entries(navMap)) {
			if (text.includes(trigger)) {
				useAppStore.getState().setCurrentView(view as any);
				if (typeof window !== "undefined") {
					window.location.hash = view;
				}
				return;
			}
		}

		// Поиск пациента или номер зуба: "найди Иванова", "пациент Петров", "зуб 46"
		const cleanQuery = text
			.replace(/^(найди|найти|пациент|пациента|открой|открыть|поиск)\s+/i, "")
			.trim();

		handleOpenCommandHud(cleanQuery || text);
	}, [handleOpenCommandHud]);

	const {
		isRecording,
		audioLevel,
		toggleDictation,
	} = useUnifiedDictation({
		context: "general",
		onResult: (text) => {
			if (!text.trim()) return;
			routeVoiceCommand(text);
		},
		onInterim: (interim) => {
			if (interim.trim().length >= 3) {
				handleOpenCommandHud(interim);
			}
		},
	});

	const handleMicClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		void toggleDictation();
	};

	return (
		<div className="topbar-command-hub flex-1 max-w-[420px] mx-auto flex items-center gap-1.5 z-10">
			<button
				type="button"
				id="topbar-command-hud-btn"
				data-testid="topbar-command-hud-btn"
				onClick={() => handleOpenCommandHud()}
				className="flex-1 h-9 min-h-[38px] px-2.5 sm:px-3 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper)] border border-[var(--line)] hover:border-[var(--teal)] text-[var(--muted)] hover:text-[var(--text)] transition-all flex items-center justify-between gap-1.5 sm:gap-2 shadow-xs group cursor-pointer"
				title={workspaceTopbarLabels.commandHud.title}
				aria-label={workspaceTopbarLabels.commandHud.label}
			>
				<span className="flex items-center gap-2 truncate text-xs text-[var(--muted-darker)] group-hover:text-[var(--text)] font-medium">
					<Search size={14} className="text-[var(--teal)] shrink-0 opacity-80 group-hover:opacity-100" aria-hidden="true" />
					<span className="truncate hidden sm:inline">Поиск пациента, карты, команды...</span>
					<span className="truncate sm:hidden">Поиск...</span>
				</span>
				<kbd className="topbar-kbd-shortcut hidden sm:inline-flex items-center text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] shrink-0">
					Ctrl+K
				</kbd>
			</button>

			<button
				type="button"
				onClick={handleMicClick}
				className={`btn-header-voice-search h-9 w-9 min-w-[36px] flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
					isRecording
						? "bg-rose-500/15 border-rose-500 text-rose-600 animate-pulse"
						: "bg-[var(--paper-soft)] hover:bg-[var(--paper)] border-[var(--line)] hover:border-[var(--teal)] text-[var(--teal)]"
				}`}
				data-testid="btn-header-voice-search"
				title={isRecording ? "Остановить голосовой ввод" : "Голосовой поиск и команды"}
				aria-label={isRecording ? "Остановить голосовой ввод" : "Голосовой поиск и команды"}
				style={
					isRecording && audioLevel > 0.05
						? { transform: `scale(${1 + Math.min(audioLevel * 0.25, 0.2)})` }
						: undefined
				}
			>
				<Mic size={15} />
			</button>
		</div>
	);
}
