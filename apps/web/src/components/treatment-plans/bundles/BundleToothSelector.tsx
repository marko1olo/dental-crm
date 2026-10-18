import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { AnatomicalToothSVG } from "../../odontogram/AnatomicalToothSVG";

export interface BundleToothSelectorProps {
	readonly selectedTooth: number;
	readonly onToothChange: (tooth: number) => void;
	readonly customToothInput: string;
	readonly onCustomToothChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	readonly searchQuery: string;
	readonly onSearchChange: (query: string) => void;
}

const UPPER_ARCH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_ARCH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export const BundleToothSelector: React.FC<BundleToothSelectorProps> = ({
	selectedTooth,
	onToothChange,
	customToothInput,
	onCustomToothChange,
	searchQuery,
	onSearchChange,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	return (
		<div className="flex items-center gap-2 shrink-0">
			<div className="relative" ref={dropdownRef}>
				<div className="flex items-center gap-1.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl px-2 h-9 shadow-xs">
					<button
						type="button"
						onClick={() => setIsOpen(!isOpen)}
						data-testid="tooth-quick-select"
						className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)] hover:text-[var(--teal)] transition-colors cursor-pointer"
						title="Выбрать анатомический зуб (1-клик FDI)"
					>
						<div className="w-4 h-6 flex items-center justify-center overflow-hidden pointer-events-none">
							<AnatomicalToothSVG number={selectedTooth || 11} state="Healthy" scale={0.24} onClick={() => {}} />
						</div>
						<span className="font-mono">#{selectedTooth}</span>
						<ChevronDown size={13} className="text-[var(--muted)]" />
					</button>

					<input
						type="text"
						value={customToothInput}
						onChange={onCustomToothChange}
						placeholder="FDI"
						maxLength={2}
						className="w-9 text-center font-mono font-bold text-xs text-[var(--teal)] outline-none border-l border-[var(--line)] pl-1"
						title="Ввести номер зуба вручную (11-85)"
						data-testid="custom-tooth-input"
					/>
				</div>

				{isOpen && (
					<div className="absolute left-0 top-11 z-50 p-2.5 bg-[var(--paper-strong)] border border-[var(--line)] rounded-2xl shadow-2xl backdrop-blur-md w-[380px] space-y-2 animate-in fade-in zoom-in-95 duration-100">
						<div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Анатомический выбор FDI:</div>
						<div className="grid grid-cols-8 gap-1">
							{UPPER_ARCH.map((t) => (
								<button key={t} type="button" onClick={() => { onToothChange(t); setIsOpen(false); }} className={`p-1 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${selectedTooth === t ? "bg-teal-500/20 border-teal-500 text-teal-700 dark:text-teal-300 font-bold" : "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500"}`}>
									<span className="text-[10px] font-mono leading-none">{t}</span>
									<div className="w-3.5 h-4 flex items-center justify-center overflow-hidden pointer-events-none">
										<AnatomicalToothSVG number={t} state="Healthy" scale={0.18} onClick={() => {}} />
									</div>
								</button>
							))}
						</div>
						<div className="grid grid-cols-8 gap-1">
							{LOWER_ARCH.map((t) => (
								<button key={t} type="button" onClick={() => { onToothChange(t); setIsOpen(false); }} className={`p-1 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${selectedTooth === t ? "bg-teal-500/20 border-teal-500 text-teal-700 dark:text-teal-300 font-bold" : "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500"}`}>
									<div className="w-3.5 h-4 flex items-center justify-center overflow-hidden pointer-events-none">
										<AnatomicalToothSVG number={t} state="Healthy" scale={0.18} onClick={() => {}} />
									</div>
									<span className="text-[10px] font-mono leading-none">{t}</span>
								</button>
							))}
						</div>
					</div>
				)}
			</div>

			<div className="dente-search-wrap" style={{ width: "250px" }}>
				<Search size={14} className="dente-search-icon" />
				<input type="text" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder="Поиск пакета или кода..." className="dente-search-input" data-testid="bundles-search-input" />
				{searchQuery && (
					<button type="button" onClick={() => onSearchChange("")} className="dente-search-clear" aria-label="Очистить поиск">
						<X size={13} />
					</button>
				)}
			</div>
		</div>
	);
};
