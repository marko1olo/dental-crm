/**
 * @file HeaderGlobalSearch.tsx
 * @description Instant global patient search bar with Cmd/Ctrl+K keyboard shortcut.
 * Connects directly to live /api/patients?search=... endpoint with debounced queries.
 * Zero hardcoded dummy data (Mandates 8f, 8am, 8wy).
 */

import { Command, Loader2, Search, User, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
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
				const res = await fetch(`/api/patients?search=${encodeURIComponent(trimmed)}&limit=25`, {
					credentials: "include",
					headers: { Accept: "application/json" },
				});
				if (!res.ok) {
					if (!isCancelled) setApiResults([]);
					return;
				}
				const data = await res.json();
				if (!isCancelled) {
					if (Array.isArray(data)) {
						const items: SearchResultItem[] = data.map((p: Record<string, unknown>) => ({
							id: String(p.id ?? ""),
							name: String(p.fullName ?? p.name ?? "Пациент"),
							phone: String(p.phone ?? ""),
							birthYear: p.birthDate
								? String(new Date(String(p.birthDate)).getFullYear())
								: undefined,
						}));
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
				const matchesPhone = cleanDigits.length >= 3 && phone.replace(/\D/g, "").includes(cleanDigits);
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
					placeholder={placeholder}
					className="w-full h-8 pl-8 pr-16 text-xs rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] placeholder:text-[var(--muted,#94a3b8)] focus:outline-none focus:border-[var(--teal,#0d9488)] focus:ring-1 focus:ring-[var(--teal,#0d9488)] transition-all"
					aria-label="Глобальный поиск пациента"
					aria-autocomplete="list"
					aria-controls={isOpen ? searchListId : undefined}
					aria-expanded={isOpen}
				/>

				{/* Shortcut badge, Loading spinner or Clear button */}
				<div className="absolute right-2 flex items-center gap-1">
					{isLoading ? (
						<Loader2 size={12} className="animate-spin text-[var(--teal,#0d9488)]" />
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
						{isLoading && <Loader2 size={10} className="animate-spin text-[var(--teal,#0d9488)]" />}
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
							<Loader2 size={14} className="animate-spin text-[var(--teal,#0d9488)]" />
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
