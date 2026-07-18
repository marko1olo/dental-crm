import { Search, X } from "lucide-react";
import React from "react";
import { getIcdColor, ICD_GROUP_COLORS, ICD10_DICTIONARY } from "../../lib/icd10";

export interface VisitIcdDropdownProps {
	isLocked: boolean;
	diagnosisIcd10: string;
	icdSearch: string;
	showIcdDropdown: boolean;
	icdRef: React.RefObject<HTMLDivElement>;
	setDiagnosisIcd10: (code: string) => void;
	setIcdSearch: (search: string) => void;
	setShowIcdDropdown: (show: boolean) => void;
}

export const VisitIcdDropdown: React.FC<VisitIcdDropdownProps> = ({
	isLocked,
	diagnosisIcd10,
	icdSearch,
	showIcdDropdown,
	icdRef,
	setDiagnosisIcd10,
	setIcdSearch,
	setShowIcdDropdown,
}) => {
	const filteredIcd = ICD10_DICTIONARY.filter(
		(i) =>
			i.code.toLowerCase().includes(icdSearch.toLowerCase()) ||
			i.label.toLowerCase().includes(icdSearch.toLowerCase()) ||
			i.group.toLowerCase().includes(icdSearch.toLowerCase()),
	).slice(0, 12);

	const handleIcdSelect = (code: string) => {
		setDiagnosisIcd10(code);
		setIcdSearch(code);
		setShowIcdDropdown(false);
	};

	return (
		<div className="sm:col-span-2 space-y-1.5 relative" ref={icdRef}>
			<label className="text-xs tracking-widest uppercase text-zinc-400 font-semibold flex items-center gap-1.5">
				<span className="text-amber-400 font-mono font-bold">A</span> —
				Диагноз МКБ-10
			</label>
			{diagnosisIcd10 ? (
				<div
					className={`w-full rounded-xl px-4 py-3 text-sm font-medium border flex items-center gap-2 ${getIcdColor(diagnosisIcd10)} transition-all`}
				>
					<span className="font-mono bg-black/20 px-2 py-0.5 rounded text-xs">
						{diagnosisIcd10}
					</span>
					<span className="flex-1 truncate">
						{ICD10_DICTIONARY.find((i) => i.code === diagnosisIcd10)?.label ?? "Диагноз выбран"}
					</span>
					{!isLocked && (
						<button
							onClick={() => {
								setDiagnosisIcd10("");
								setIcdSearch("");
							}}
							className="ml-auto hover:bg-black/20 p-1 rounded"
							title="Сбросить"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					)}
				</div>
			) : (
				<div className="relative">
					<Search className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
					<input
						id="diary-icd-search"
						disabled={isLocked}
						className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl pl-9 p-3 text-sm text-zinc-200 focus:ring-2 focus:ring-amber-500/50 outline-none disabled:opacity-50"
						value={icdSearch}
						onChange={(e) => {
							setIcdSearch(e.target.value);
							setShowIcdDropdown(true);
						}}
						onFocus={() => !isLocked && setShowIcdDropdown(true)}
						placeholder="K02.1 Кариес... или введите название"
					/>
					{showIcdDropdown && filteredIcd.length > 0 && (
						<div className="absolute z-30 top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
							{filteredIcd.map((icd) => (
								<div
									key={icd.code}
									className="p-3 hover:bg-zinc-700/80 cursor-pointer flex gap-3 items-center border-b border-zinc-700/40 last:border-0"
									onMouseDown={(e) => {
										e.preventDefault();
										handleIcdSelect(icd.code);
									}}
								>
									<span
										className={`px-2 py-0.5 rounded text-xs font-mono border shrink-0 ${ICD_GROUP_COLORS[icd.group] ?? ""}`}
									>
										{icd.code}
									</span>
									<div className="min-w-0">
										<div className="text-sm text-zinc-200 truncate">
											{icd.label}
										</div>
										<div className="text-xs text-zinc-500">
											{icd.group}
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
};
