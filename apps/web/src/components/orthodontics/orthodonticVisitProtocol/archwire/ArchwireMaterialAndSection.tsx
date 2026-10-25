import React from "react";
import type { ArchwireMaterial, ArchwireSection } from "../types";
import { ARCHWIRE_MATERIALS, ROUND_SECTIONS, RECT_SECTIONS } from "./archwireConstants";

export interface ArchwireMaterialAndSectionProps {
	readonly archwireMaterial: ArchwireMaterial;
	readonly setArchwireMaterial: (m: ArchwireMaterial) => void;
	readonly archwireSection: ArchwireSection;
	readonly setArchwireSection: (s: ArchwireSection) => void;
}

export const ArchwireMaterialAndSection: React.FC<ArchwireMaterialAndSectionProps> = ({
	archwireMaterial,
	setArchwireMaterial,
	archwireSection,
	setArchwireSection,
}) => {
	return (
		<div className="space-y-4">
			<div>
				<span className="block text-xs font-black uppercase tracking-wider text-[var(--muted)] mb-1.5">
					Материал дуги
				</span>
				<div className="bg-[var(--paper-soft)] p-1 rounded-xl border border-[var(--line)] grid grid-cols-2 sm:grid-cols-4 gap-1">
					{ARCHWIRE_MATERIALS.map((mat) => {
						const isSelected = archwireMaterial === mat.id;
						return (
							<button
								key={mat.id}
								type="button"
								onClick={() => setArchwireMaterial(mat.id)}
								className={`h-9 px-2.5 py-1 rounded-xl text-xs font-medium border flex flex-col items-center justify-center transition-all cursor-pointer ${
									isSelected
										? "bg-[var(--paper)] border-[var(--primary)] text-[var(--primary)] font-bold shadow-xs"
										: "bg-transparent border-transparent text-[var(--ink)] hover:bg-[var(--paper)]"
								}`}
							>
								<span className="text-[12.5px] font-bold leading-tight">{mat.badge}</span>
								<span className={`text-[11.5px] truncate w-full text-center leading-tight ${isSelected ? "text-[var(--primary)]" : "text-[var(--muted)]"}`}>
									{mat.id === "NiTi" ? "Нивелирование" : mat.id === "CuNiTi" ? "Термо" : mat.id === "SS" ? "Сталь" : "Бета-титан"}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			<div>
				<div className="flex items-center justify-between mb-1.5">
					<span className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">
						Сечение дуги
					</span>
					<span className="text-[12px] font-bold text-[var(--primary)]">
						Выбрано: {archwireSection}"
					</span>
				</div>

				<div className="flex flex-col gap-2">
					<div className="bg-[var(--paper-soft)] p-1 rounded-xl border border-[var(--line)] flex items-center gap-1 flex-wrap">
						<span className="text-[12px] font-bold text-[var(--muted)] px-2 shrink-0">Круглые:</span>
						{ROUND_SECTIONS.map((sec) => (
							<button
								key={sec}
								type="button"
								onClick={() => setArchwireSection(sec)}
								className={`h-7 px-2.5 rounded-lg text-[12.5px] font-medium transition-all cursor-pointer ${
									archwireSection === sec
										? "bg-[var(--primary)] text-white font-semibold shadow-xs"
										: "bg-transparent text-[var(--ink)] hover:bg-[var(--paper)]"
								}`}
							>
								{sec}"
							</button>
						))}
					</div>

					<div className="bg-[var(--paper-soft)] p-1 rounded-xl border border-[var(--line)] flex items-center gap-1 flex-wrap">
						<span className="text-[12px] font-bold text-[var(--muted)] px-2 shrink-0">Прямоуг.:</span>
						{RECT_SECTIONS.map((sec) => (
							<button
								key={sec}
								type="button"
								onClick={() => setArchwireSection(sec)}
								className={`h-7 px-2 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
									archwireSection === sec
										? "bg-[var(--primary)] text-white font-semibold shadow-xs"
										: "bg-transparent text-[var(--ink)] hover:bg-[var(--paper)]"
								}`}
							>
								{sec}"
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};
