/**
 * @file HeaderGlobalSearch.tsx
 * @description Instant global patient search bar with Cmd/Ctrl+K keyboard shortcut
 * and Voice Command Recognition Everywhere (Mandate 8e, Voice-First CRM).
 * Connects directly to live /api/patients?search=... endpoint with debounced queries.
 * Supports navigation commands ("открой кассу", "расписание") & patient lookup ("найди Иванова").
 */

import { Command, Loader2, Mic, Search, User, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { showToast } from "../GlobalToast";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { useUnifiedDictation } from "../../hooks/useUnifiedDictation";
import { useAppStore } from "../../store/appStore";
import type { HeaderGlobalSearchProps } from "./types";

interface SearchResultItem {
	id: string;
	name: string;
	phone: string;
	birthYear?: string | undefined;
}

export function HeaderGlobalSearch({
	className = "",
	placeholder = "Поиск пациента по ФИО или телефону...",
	onSelectPatient,
}: HeaderGlobalSearchProps) {
	const [query, setQuery] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const [isMac, setIsMac] = useState(false);
	const [apiResults, setApiResults] = useState<SearchResultItem[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const searchListId = useId();

	useEffect(() => {
		if (typeof navigator !== "undefined") {
			setIsMac(
				/(Mac|iPhone|iPod|iPad)/i.test(
					navigator.platform || navigator.userAgent,
				),
			);
		}
	}, []);

	// Global shortcut: Cmd/Ctrl + K to focus search
	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				inputRef.current?.focus();
				setIsOpen(true);
			}
		};

		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => window.removeEventListener("keydown", handleGlobalKeyDown);
	}, []);

	// Click outside and Esc handler
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				setIsOpen(false);
				inputRef.current?.blur();
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	const appLogic = useOptionalAppLogicContext();

	// Voice command dispatcher for navigation & search
	const handleVoiceCommand = useCallback((phrase: string) => {
		const raw = phrase.trim();
		if (!raw) return;
		const clean = raw.toLowerCase();

		// 1. Клинические и навигационные команды
		const navMap: Array<{ test: (c: string) => boolean; view: any; label: string }> = [
			{ test: (c) => c.includes("касс") || c.includes("оплат") || c.includes("платеж") || c.includes("чек"), view: "finance", label: "Касса и чеки" },
			{ test: (c) => c.includes("расписан") || c.includes("запис") || c.includes("календар"), view: "schedule", label: "Расписание приёмов" },
			{ test: (c) => c.includes("пациент") && (c.includes("картотек") || c.includes("баз") || c.includes("все") || c === "пациенты"), view: "patients", label: "Картотека пациентов" },
			{ test: (c) => c.includes("план") || c.includes("воронк"), view: "pipeline", label: "Планы лечения" },
			{ test: (c) => c.includes("снимок") || c.includes("снимк") || c.includes("рентген") || c.includes("кт") || c.includes("клкт"), view: "imaging", label: "Рентген и томография" },
			{ test: (c) => c.includes("прием") || c.includes("визит") || c.includes("кресл"), view: "visit", label: "Приём пациента" },
			{ test: (c) => c.includes("документ") || c.includes("справк") || c.includes("договор"), view: "documents", label: "Документы и справки" },
			{ test: (c) => c.includes("склад") || c.includes("материал") || c.includes("остатк"), view: "inventory", label: "Склад материалов" },
			{ test: (c) => c.includes("стерил") || c.includes("автоклав") || c.includes("журнал"), view: "scanner", label: "Журнал автоклавирования" },
			{ test: (c) => c.includes("лаборатор") || c.includes("наряд") || c.includes("коронк") || c.includes("техник"), view: "lab", label: "Зуботехническая лаборатория" },
			{ test: (c) => c.includes("обращен") || c.includes("лид") || c.includes("заявк"), view: "leads", label: "Обращения пациентов" },
			{ test: (c) => c.includes("аналитик") || c.includes("отчет"), view: "analytics", label: "Аналитика клиники" },
			{ test: (c) => c.includes("настройк") || c.includes("профил"), view: "settings", label: "Настройки клиники" },
		];

		const match = navMap.find((item) => item.test(clean));
		if (match) {
			useAppStore.getState().setCurrentView(match.view);
			showToast(`Переход: ${match.label}`, "info");
			setIsOpen(false);
			return;
		}

		// 2. Поиск пациента («найди Иванова», «пациент Смирнова», или просто ФИО/телефон)
		const patientQuery = raw
			.replace(
				/^(найди|найдите|поиск|пациент|открой|покажи|ищи|пациента)\s+/i,
				"",
			)
			.trim();
		const finalQuery = patientQuery || raw;
		setQuery(finalQuery);
		setIsOpen(true);
		inputRef.current?.focus();
		showToast(`Голосовой поиск: «${finalQuery}»`, "info");
	}, []);

	const {
		isRecording,
		audioLevel,
		toggleDictation,
	} = useUnifiedDictation({
		context: "general",
		onResult: handleVoiceCommand,
	});

	// Debounced live API query to /api/patients?search=...
	useEffect(() => {
		const trimmed = query.trim();
		if (!trimmed) {
			setApiResults([]);
			setIsLoading(false);
			return;
		}

		let isCancelled = false;
		setIsLoading(true);

		const timer = setTimeout(async () => {
			try {
				const res = await fetch(
					`/api/patients?search=${encodeURIComponent(trimmed)}&limit=25`,
					{
						credentials: "include",
						headers: { Accept: "application/json" },
					},
				);
				if (!res.ok) {
					if (!isCancelled) setApiResults([]);
					return;
				}
				const data = await res.json();
				if (!isCancelled) {
					if (Array.isArray(data)) {
						const items: SearchResultItem[] = data.map(
							(p: Record<string, unknown>) => ({
								id: String(p.id ?? ""),
								name: String(p.fullName ?? p.name ?? "Пациент"),
								phone: String(p.phone ?? ""),
								birthYear: p.birthDate
									? String(new Date(String(p.birthDate)).getFullYear())
									: undefined,
							}),
						);
						setApiResults(items);
					} else {
						setApiResults([]);
					}
				}
			} catch {
				if (!isCancelled) setApiResults([]);
			} finally {
				if (!isCancelled) setIsLoading(false);
			}
		}, 250);

		return () => {
			isCancelled = true;
			clearTimeout(timer);
		};
	}, [query]);

	// Merge API results with in-memory dashboard cache without synthetic dummy data
	const filteredPatients = useMemo<SearchResultItem[]>(() => {
		const cleanQuery = query.trim().toLowerCase();
		if (!cleanQuery) return [];

		const seen = new Set<string>();
		const combined: SearchResultItem[] = [];

		for (const p of apiResults) {
			if (p.id && !seen.has(p.id)) {
				seen.add(p.id);
				combined.push(p);
			}
		}

		const rawLocal = appLogic?.dashboard?.patients;
		if (Array.isArray(rawLocal)) {
			const cleanDigits = query.replace(/\D/g, "");
			for (const p of rawLocal as Record<string, unknown>[]) {
				const id = String(p.id ?? "");
				if (!id || seen.has(id)) continue;
				const name = String(p.fullName ?? p.name ?? "");
				const phone = String(p.phone ?? "");
				const matchesName = name.toLowerCase().includes(cleanQuery);
				const matchesPhone =
					cleanDigits.length >= 3 &&
					phone.replace(/\D/g, "").includes(cleanDigits);
				if (matchesName || matchesPhone) {
					seen.add(id);
					combined.push({
						id,
						name: name || "Пациент",
						phone,
						birthYear: p.birthDate
							? String(new Date(String(p.birthDate)).getFullYear())
							: undefined,
					});
				}
			}
		}

		return combined;
	}, [apiResults, appLogic?.dashboard?.patients, query]);

	const handleSelect = (patientId: string) => {
		setIsOpen(false);
		setQuery("");
		onSelectPatient?.(patientId);
	};

	return (
		<div
			ref={containerRef}
			className={`dnt-header-global-search relative flex-1 max-w-xs sm:max-w-sm md:max-w-md ${className}`}
		>
			<div className="relative flex items-center w-full">
				<Search
					size={14}
					className="absolute left-2.5 text-[var(--muted,#64748b)] pointer-events-none shrink-0"
					aria-hidden="true"
				/>

				<input
					ref={inputRef}
					type="search"
					role="combobox"
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
						setIsOpen(true);
					}}
					onFocus={() => setIsOpen(true)}
					placeholder={
						isRecording ? "Слушаю команду или имя пациента..." : placeholder
					}
					className={`w-full h-8 pl-8 pr-20 text-xs rounded-lg border transition-all ${
						isRecording
							? "border-rose-500 ring-1 ring-rose-500 bg-rose-50/10 text-[var(--ink,#0f172a)] placeholder:text-rose-500"
							: "border-[var(--line,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] placeholder:text-[var(--muted,#94a3b8)] focus:outline-none focus:border-[var(--teal,#0d9488)] focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
					}`}
					aria-label="Глобальный поиск пациента и навигация"
					aria-autocomplete="list"
					aria-controls={isOpen ? searchListId : undefined}
					aria-expanded={isOpen}
				/>

				{/* Right controls: Mic button, Loading spinner, Clear button or Shortcut badge */}
				<div className="absolute right-1.5 flex items-center gap-1">
					{/* Кнопка голосового ввода и навигации */}
					<button
						type="button"
						onClick={toggleDictation}
						className={`w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer ${
							isRecording
								? "bg-rose-500 text-white animate-pulse shadow-2xs"
								: "text-[var(--muted,#64748b)] hover:text-[var(--teal,#0d9488)] hover:bg-[var(--paper-soft,#f1f5f9)]"
						}`}
						title={
							isRecording
								? "Остановить запись голоса"
								: "Голосовой поиск и навигация («найди Иванова», «открой кассу»)"
						}
						aria-label="Голосовой поиск и навигация"
						data-testid="btn-header-voice-search"
					>
						<Mic
							size={13}
							className={isRecording ? "animate-pulse" : ""}
							style={
								isRecording && audioLevel > 0
									? { transform: `scale(${1 + audioLevel * 0.3})` }
									: undefined
							}
						/>
					</button>

					{isLoading ? (
						<Loader2
							size={12}
							className="animate-spin text-[var(--teal,#0d9488)]"
						/>
					) : query ? (
						<button
							type="button"
							onClick={() => {
								setQuery("");
								setApiResults([]);
								inputRef.current?.focus();
							}}
							className="p-1 rounded text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
							aria-label="Очистить поиск"
						>
							<X size={12} />
						</button>
					) : (
						<kbd
							className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-[var(--muted,#64748b)] bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#cbd5e1)] rounded"
							title={`Шорткат: ${isMac ? "Cmd" : "Ctrl"} + K`}
						>
							{isMac ? <Command size={10} /> : "Ctrl"}K
						</kbd>
					)}
				</div>
			</div>

			{/* Search Results Dropdown */}
			{isOpen && query.trim().length > 0 && (
				<div
					id={searchListId}
					className="absolute top-full left-0 right-0 mt-1.5 p-1 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#e2e8f0)] shadow-xl z-50 max-h-72 overflow-y-auto"
					role="listbox"
				>
					<div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)] border-b border-[var(--line-subtle,#f1f5f9)] flex items-center justify-between">
						<span>Найдено: {filteredPatients.length}</span>
						{isLoading && (
							<Loader2
								size={10}
								className="animate-spin text-[var(--teal,#0d9488)]"
							/>
						)}
					</div>

					{filteredPatients.length > 0 ? (
						filteredPatients.map((patient) => (
							<button
								key={patient.id}
								type="button"
								role="option"
								aria-selected={false}
								onClick={() => handleSelect(patient.id)}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between hover:bg-[var(--paper-soft,#f8fafc)] transition-colors cursor-pointer group"
							>
								<div className="flex items-center gap-2 min-w-0">
									<div className="w-6 h-6 rounded-full bg-[var(--teal-surface,#0d948814)] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
										<User size={12} />
									</div>
									<div className="min-w-0">
										<span className="font-medium text-[var(--ink,#0f172a)] block truncate">
											{patient.name}
										</span>
										<span className="text-[10px] text-[var(--muted,#64748b)] block font-mono">
											{patient.phone}
										</span>
									</div>
								</div>
								{patient.birthYear && (
									<span className="text-[10px] text-[var(--muted,#94a3b8)] shrink-0 ml-2">
										{patient.birthYear} г.р.
									</span>
								)}
							</button>
						))
					) : isLoading ? (
						<div className="py-4 text-center text-xs text-[var(--muted,#64748b)] flex items-center justify-center gap-2">
							<Loader2
								size={14}
								className="animate-spin text-[var(--teal,#0d9488)]"
							/>
							<span>Поиск в базе пациентов...</span>
						</div>
					) : (
						<div className="py-4 text-center text-xs text-[var(--muted,#64748b)]">
							Пациенты не найдены по запросу «{query}»
						</div>
					)}
				</div>
			)}
		</div>
	);
}
