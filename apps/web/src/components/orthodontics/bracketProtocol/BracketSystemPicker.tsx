import React from "react";
import { BRACKET_SYSTEMS, type BracketSlot } from "./types";

interface BracketSystemPickerProps {
	readonly bracketSlot: BracketSlot;
	readonly setBracketSlot: (slot: BracketSlot) => void;
	readonly bracketSystem: string;
	readonly onSelectBracketSystem: (systemId: string) => void;
}

export const BracketSystemPicker: React.FC<BracketSystemPickerProps> = ({
	bracketSlot,
	setBracketSlot,
	bracketSystem,
	onSelectBracketSystem,
}) => {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between gap-2">
				<label className="text-xs font-semibold text-[var(--ink)]">Аппаратура / Система:</label>
				<div className="flex items-center gap-1 bg-[var(--paper-soft)] p-0.5 rounded-lg border border-[var(--line)]">
					{(["0.018", "0.022"] as const).map((slot) => (
						<button
							key={slot}
							type="button"
							onClick={() => setBracketSlot(slot)}
							className={`min-h-[32px] px-2 py-0.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
								bracketSlot === slot
									? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							Паз {slot}
						</button>
					))}
				</div>
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
				{BRACKET_SYSTEMS.map((sys) => {
					const isSelected = bracketSystem === sys.id;
					return (
						<button
							key={sys.id}
							type="button"
							onClick={() => onSelectBracketSystem(sys.id)}
							title={sys.desc}
							className={`min-h-[44px] p-2 rounded-xl text-left border transition-all cursor-pointer ${
								isSelected
									? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
									: "bg-[var(--paper)] border-[var(--line)] hover:border-[var(--line-strong,var(--primary))] text-[var(--ink)]"
							}`}
						>
							<div className="text-[12px] font-bold truncate leading-tight">{sys.label}</div>
							<div className={`text-[10.5px] truncate leading-tight ${isSelected ? "text-white/80" : "text-[var(--muted)]"}`}>
								{sys.desc.split("·")[0]}
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
};
