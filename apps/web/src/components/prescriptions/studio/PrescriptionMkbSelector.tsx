/**
 * apps/web/src/components/prescriptions/studio/PrescriptionMkbSelector.tsx
 *
 * Селектор стоматологических диагнозов МКБ-10 (K00..K14, Z-коды) для рецептурной студии.
 * Мандаты 8e (Автономия врача), 8x (Клинический язык), 8s (SSOT), [PHR-04] (Сохранение редких кодов).
 * Apple HIG: Тач >= 44px, доступность, мгновенный поиск без сброса ручного ввода.
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Search, ChevronDown, Check, X, Stethoscope } from "lucide-react";
import {
	DENTAL_ICD10_FULL_CATALOG,
	findDentalIcd10,
	searchDentalIcd10Catalog,
	normalizeDentalIcd10Code,
	type DentalIcd10Entry,
} from "../../../lib/icd10";

export interface PrescriptionMkbSelectorProps {
	readonly value: string;
	readonly onChange: (code: string, entry?: DentalIcd10Entry | undefined) => void;
	readonly className?: string | undefined;
}

const COMMON_PRESCRIPTION_ICD = [
	{ code: "K04.0", label: "Пульпит" },
	{ code: "K04.5", label: "Хронический периодонтит" },
	{ code: "K05.2", label: "Острый пародонтит" },
	{ code: "K10.2", label: "Альвеолит / остит челюсти" },
	{ code: "K01.1", label: "Ретенированный зуб (перикоронит)" },
];

export const PrescriptionMkbSelector: React.FC<PrescriptionMkbSelectorProps> = ({
	value,
	onChange,
	className = "",
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const normalizedCurrent = normalizeDentalIcd10Code(value);
	const activeEntry = useMemo(() => findDentalIcd10(normalizedCurrent), [normalizedCurrent]);

	const searchResults = useMemo(() => {
		if (!searchQuery.trim()) {
			return DENTAL_ICD10_FULL_CATALOG.slice(0, 25);
		}
		return searchDentalIcd10Catalog(searchQuery, 25);
	}, [searchQuery]);

	// Close on click outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleSelectCode = useCallback(
		(entry: DentalIcd10Entry) => {
			onChange(entry.code, entry);
			setIsOpen(false);
			setSearchQuery("");
		},
		[onChange],
	);

	const handleCommitCustom = useCallback(() => {
		const trimmed = searchQuery.trim().toUpperCase();
		if (!trimmed) return;
		const found = findDentalIcd10(trimmed);
		if (found) {
			onChange(found.code, found);
		} else {
			// Preserves rare or custom typed code without clobbering (PHR-04)
			onChange(trimmed);
		}
		setIsOpen(false);
		setSearchQuery("");
	}, [searchQuery, onChange]);

	return (
		<div ref={containerRef} className={`relative flex flex-col gap-1.5 ${className}`}>
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs font-semibold text-[var(--rx-ink-muted)] flex items-center gap-1.5">
					<Stethoscope className="w-3.5 h-3.5 text-[var(--rx-teal)]" />
					Диагноз МКБ-10:
				</span>

				{/* Quick chips */}
				<div className="hidden sm:flex items-center gap-1">
					{COMMON_PRESCRIPTION_ICD.map((chip) => {
						const isSelected = normalizedCurrent === chip.code;
						return (
							<button
								key={chip.code}
								type="button"
								onClick={() => onChange(chip.code)}
								className={`px-2 py-0.5 text-[11px] rounded-md transition-colors ${
									isSelected
										? "bg-[var(--rx-teal)] text-white font-semibold"
										: "bg-[var(--paper-soft)] text-[var(--rx-ink-muted)] hover:text-[var(--rx-ink)] hover:bg-[var(--line)]"
								}`}
								title={chip.label}
							>
								{chip.code}
							</button>
						);
					})}
				</div>
			</div>

			{/* Trigger Button / Input Display */}
			<div className="relative">
				<button
					type="button"
					onClick={() => {
						setIsOpen((prev) => !prev);
						if (!isOpen) {
							setTimeout(() => inputRef.current?.focus(), 50);
						}
					}}
					className="w-full flex items-center justify-between gap-2 px-3 py-2 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--rx-teal)] transition-all text-left text-sm text-[var(--rx-ink)] cursor-pointer"
					aria-expanded={isOpen}
					data-testid="prescription-icd-selector-trigger"
				>
					<div className="flex items-center gap-2 min-w-0 flex-1">
						<span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[var(--rx-teal-subtle)] text-[var(--rx-teal)] shrink-0">
							{value || "K04.0"}
						</span>
						<span className="truncate text-xs text-[var(--rx-ink)]">
							{activeEntry?.label || "Пульпит (болезни пульпы и периапикальных тканей)"}
						</span>
					</div>
					<ChevronDown className={`w-4 h-4 text-[var(--rx-ink-muted)] shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
				</button>

				{/* Dropdown Menu */}
				{isOpen && (
					<div
						className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xl overflow-hidden flex flex-col max-h-[320px]"
						data-testid="prescription-icd-dropdown"
					>
						{/* Search Bar */}
						<div className="p-2 border-b border-[var(--line)] flex items-center gap-2 bg-[var(--paper-soft)]">
							<Search className="w-4 h-4 text-[var(--rx-ink-muted)] shrink-0" />
							<input
								ref={inputRef}
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleCommitCustom();
									} else if (e.key === "Escape") {
										setIsOpen(false);
									}
								}}
								placeholder="Поиск по коду (K04.02, K05.21) или названию..."
								className="w-full bg-transparent text-xs text-[var(--rx-ink)] placeholder-[var(--rx-ink-muted)] outline-none min-h-[36px]"
								data-testid="prescription-icd-search-input"
							/>
							{searchQuery && (
								<button
									type="button"
									onClick={() => setSearchQuery("")}
									className="p-1 text-[var(--rx-ink-muted)] hover:text-[var(--rx-ink)]"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							)}
						</div>

						{/* Results List */}
						<div className="overflow-y-auto flex-1 divide-y divide-[var(--line)] p-1">
							{searchResults.length === 0 ? (
								<div className="p-3 text-center text-xs text-[var(--rx-ink-muted)]">
									<p>Диагноз не найден в стандартном списке.</p>
									<button
										type="button"
										onClick={handleCommitCustom}
										className="mt-2 px-3 py-1 text-xs rounded-lg bg-[var(--rx-teal)] text-white font-medium hover:opacity-90"
									>
										Использовать «{searchQuery.trim().toUpperCase()}»
									</button>
								</div>
							) : (
								searchResults.map((entry) => {
									const isSelected = normalizedCurrent === entry.code;
									return (
										<button
											key={entry.code}
											type="button"
											onClick={() => handleSelectCode(entry)}
											className={`w-full flex items-center justify-between gap-2 p-2 rounded-lg text-left transition-colors min-h-[44px] cursor-pointer ${
												isSelected
													? "bg-[var(--rx-teal-subtle)] text-[var(--rx-teal)] font-medium"
													: "hover:bg-[var(--paper-soft)] text-[var(--rx-ink)]"
											}`}
											data-testid={`icd-option-${entry.code}`}
										>
											<div className="flex flex-col gap-0.5 min-w-0">
												<div className="flex items-center gap-1.5">
													<span className="font-mono font-bold text-xs px-1.5 py-0.2 rounded bg-[var(--line)] text-[var(--rx-ink)]">
														{entry.code}
													</span>
													<span className="text-[11px] text-[var(--rx-ink-muted)]">{entry.group}</span>
												</div>
												<span className="text-xs truncate">{entry.label}</span>
											</div>
											{isSelected && <Check className="w-4 h-4 text-[var(--rx-teal)] shrink-0" />}
										</button>
									);
								})
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

PrescriptionMkbSelector.displayName = "PrescriptionMkbSelector";
