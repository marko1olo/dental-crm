/**
 * Dentition and View Mode Toggle Bar
 * (DOMAIN: TELEGRAM MINI APP - LAYER 4 SUBCOMPONENT)
 */

import React from "react";

export interface TelegramDentitionToggleBarProps {
	dentitionMode: "adult" | "pediatric";
	viewMode: "quadrants" | "arch";
	onSelectDentition: (mode: "adult" | "pediatric") => void;
	onSelectViewMode: (mode: "quadrants" | "arch") => void;
}

export const TelegramDentitionToggleBar: React.FC<TelegramDentitionToggleBarProps> = ({
	dentitionMode,
	viewMode,
	onSelectDentition,
	onSelectViewMode,
}) => (
	<>
		<div className="tg-dentition-toggle">
			<button
				type="button"
				className={`tg-toggle-chip ${dentitionMode === "adult" ? "active" : ""}`}
				onClick={() => onSelectDentition("adult")}
			>
				<span>Взрослый прикус (32 зуба)</span>
			</button>
			<button
				type="button"
				className={`tg-toggle-chip ${dentitionMode === "pediatric" ? "active" : ""}`}
				onClick={() => onSelectDentition("pediatric")}
			>
				<span>Молочные зубы (20 зубов)</span>
			</button>
		</div>

		<div className="flex items-center justify-between px-1 py-1">
			<span className="text-xs font-semibold text-[var(--tg-text)]">
				{dentitionMode === "adult" ? "Формула постоянных зубов (FDI)" : "Формула молочных зубов (FDI)"}
			</span>
			<div className="flex bg-[var(--tg-card-inner)] p-0.5 rounded-lg border border-[var(--tg-border)] text-[11px]">
				<button
					type="button"
					className={`px-2.5 py-1 rounded-md transition-all font-medium ${
						viewMode === "quadrants"
							? "bg-[var(--tg-accent)] text-white font-bold shadow-sm"
							: "text-[var(--tg-text-muted)] hover:text-[var(--tg-text)]"
					}`}
					onClick={() => onSelectViewMode("quadrants")}
				>
					По квадрантам
				</button>
				<button
					type="button"
					className={`px-2.5 py-1 rounded-md transition-all font-medium ${
						viewMode === "arch"
							? "bg-[var(--tg-accent)] text-white font-bold shadow-sm"
							: "text-[var(--tg-text-muted)] hover:text-[var(--tg-text)]"
					}`}
					onClick={() => onSelectViewMode("arch")}
				>
					Вся дуга
				</button>
			</div>
		</div>
	</>
);
