import { Check, ChevronDown, Syringe } from "lucide-react";
import React, { useMemo, useState } from "react";
import { ANESTHETIC_OPTIONS, type AnestheticKey } from "../../../../store/doctorPreferencesStore";

const PRIMARY_KEYS: readonly AnestheticKey[] = [
	"articaine_200k", "articaine_100k", "septanest_100k", "scandonest_mepivacaine_3",
];

interface DoctorAnestheticSelectorProps {
	selectedAnestheticKey: AnestheticKey;
	onSelectAnesthetic: (key: AnestheticKey) => void;
}

export function DoctorAnestheticSelector({ selectedAnestheticKey, onSelectAnesthetic }: DoctorAnestheticSelectorProps) {
	const [showAll, setShowAll] = useState(false);

	const primary = useMemo(
		() => PRIMARY_KEYS.map((k) => ANESTHETIC_OPTIONS.find((a) => a.key === k || a.id === k) || {
			id: k, key: k, name: k, title: k, manufacturer: "Стандарт", description: "",
			popularityRank: 1, isFavoriteDefault: false, badge: k,
		}),
		[],
	);
	const secondary = useMemo(() => ANESTHETIC_OPTIONS.filter((a) => !PRIMARY_KEYS.includes(a.key as AnestheticKey)), []);

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<Syringe size={14} className="text-teal-600" />
					<span>Основной рабочий анестетик (препарат выбора):</span>
				</label>
				<span className="text-[11px] text-[var(--muted)]">Подставляется при создании протокола</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
				{primary.map((drug) => {
					const isSelected = selectedAnestheticKey === drug.key;
					const isCardio = drug.key === "scandonest_mepivacaine_3";
					return (
						<button
							key={drug.key} type="button" onClick={() => onSelectAnesthetic(drug.key as AnestheticKey)}
							className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-2 min-h-[96px] ${
								isSelected ? "bg-[var(--paper)] border-teal-600 shadow-xs ring-2 ring-teal-500/40" : "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/60"
							}`}
							data-testid={`anesthetic-option-${drug.key}`}
						>
							<div className="flex items-start justify-between gap-1.5 w-full">
								<div className="min-w-0">
									<span className="text-xs font-bold text-[var(--ink)] leading-snug block">{drug.name}</span>
									<span className="text-[10px] text-[var(--muted)] block mt-0.5">{drug.manufacturer}</span>
								</div>
								{isSelected ? (
									<span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
										<Check size={12} className="stroke-[3]" />
									</span>
								) : <span className="w-5 h-5 rounded-full border border-[var(--line)] shrink-0" />}
							</div>
							<p className="text-[11px] text-[var(--muted)] m-0 line-clamp-2 leading-relaxed">{drug.description}</p>
							<div className="flex items-center justify-between gap-1 pt-1.5 border-t border-[var(--line)]/50 text-[10px]">
								<span className={`font-semibold ${isCardio ? "text-rose-600 dark:text-rose-400 font-bold" : "text-teal-700 dark:text-teal-300"}`}>{drug.badge}</span>
								{isSelected && <span className="font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 px-1.5 py-0.2 rounded">Активен</span>}
							</div>
						</button>
					);
				})}
			</div>

			{secondary.length > 0 && (
				<div className="pt-1">
					<button
						type="button" onClick={() => setShowAll((prev) => !prev)}
						className="h-8 min-h-[32px] px-3.5 rounded-lg text-xs font-semibold text-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] hover:border-teal-500/50 shadow-2xs transition-all inline-flex items-center gap-2 cursor-pointer select-none"
						data-testid="toggle-secondary-anesthetics-btn"
					>
						<ChevronDown size={14} className={`text-teal-600 dark:text-teal-400 transition-transform duration-200 shrink-0 ${showAll ? "rotate-180" : ""}`} />
						<span>{showAll ? "Скрыть редкие анестетики" : `Показать другие анестетики каталога (${secondary.length})`}</span>
					</button>
					{showAll && (
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2 pt-2 border-t border-[var(--line)]">
							{secondary.map((drug) => (
								<button
									key={drug.key} type="button" onClick={() => onSelectAnesthetic(drug.key as AnestheticKey)}
									className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1.5 min-h-[72px] ${
										selectedAnestheticKey === drug.key ? "bg-[var(--paper)] border-teal-600 ring-2 ring-teal-500/40" : "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/60"
									}`}
								>
									<span className="text-xs font-bold text-[var(--ink)] block">{drug.name}</span>
									<span className="text-[10px] text-[var(--muted)] line-clamp-1">{drug.description}</span>
								</button>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
