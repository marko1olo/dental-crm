import React from "react";
import { Plus } from "lucide-react";
import type { TextInputChangeEvent } from "./clinicChairsTypes";

interface ClinicChairQuickCreateBarProps {
	newChairName: string;
	setNewChairName?: ((val: string) => void) | undefined;
	handleAddChair: (name?: string) => void;
	typedChairsCount: number;
	newChairHasXraySensor: boolean;
	setNewChairHasXraySensor: ((val: boolean | ((prev: boolean) => boolean)) => void) | React.Dispatch<React.SetStateAction<boolean>>;
	newChairHasMicroscope: boolean;
	setNewChairHasMicroscope: ((val: boolean | ((prev: boolean) => boolean)) => void) | React.Dispatch<React.SetStateAction<boolean>>;
	newChairHasSurgeryKit: boolean;
	setNewChairHasSurgeryKit: ((val: boolean | ((prev: boolean) => boolean)) => void) | React.Dispatch<React.SetStateAction<boolean>>;
}

export const ClinicChairQuickCreateBar: React.FC<ClinicChairQuickCreateBarProps> = ({
	newChairName,
	setNewChairName,
	handleAddChair,
	typedChairsCount,
	newChairHasXraySensor,
	setNewChairHasXraySensor,
	newChairHasMicroscope,
	setNewChairHasMicroscope,
	newChairHasSurgeryKit,
	setNewChairHasSurgeryKit,
}) => {
	const setPreset = (name: string, xray: boolean, micro: boolean, surg: boolean) => {
		setNewChairName?.(name);
		setNewChairHasXraySensor(xray);
		setNewChairHasMicroscope(micro);
		setNewChairHasSurgeryKit(surg);
	};

	return (
		<div className="space-y-3">
			<div className="quick-create flex items-center gap-2">
				<input
					aria-label="Новое кресло"
					placeholder="Название кресла или кабинета"
					value={newChairName}
					onChange={(e: TextInputChangeEvent) => setNewChairName?.(e.target.value)}
					className="flex-1 h-9 min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
				/>
				<button
					aria-label="Добавить кресло или кабинет"
					className="icon-button h-9 min-h-[36px] w-9 min-w-[36px] flex items-center justify-center rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-strong)] shadow-xs transition-colors cursor-pointer shrink-0"
					style={{ minHeight: "44px", minWidth: "44px" }}
					type="button"
					onClick={() => handleAddChair()}
				>
					<Plus aria-hidden="true" size={18} />
				</button>
			</div>

			<div className="flex items-center gap-1.5 flex-wrap">
				<span className="text-[11px] text-[var(--ink-muted)] font-semibold">1-клик добавление:</span>
				<button
					type="button"
					className="compact-button secondary-button h-9 min-h-[36px] px-3.5 rounded-xl border border-[var(--primary)] bg-[var(--teal-surface)] text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all cursor-pointer inline-flex items-center gap-1.5"
					onClick={() => handleAddChair(`Кресло / Кабинет ${typedChairsCount + 1}`)}
				>
					<Plus size={14} />
					<span>+ Кресло / Кабинет {typedChairsCount + 1}</span>
				</button>
				<button
					type="button"
					className="compact-button secondary-button h-9 min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer inline-flex items-center"
					onClick={() => setPreset(`Кабинет №${typedChairsCount + 1} (Хирургия)`, true, true, true)}
				>
					+ Хирургия (RVG + Микроскоп)
				</button>
				<button
					type="button"
					className="compact-button secondary-button h-9 min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer inline-flex items-center"
					onClick={() => setPreset("Кабинет гигиены и профосмотра", false, false, false)}
				>
					+ Гигиена
				</button>
			</div>

			<div role="toolbar" className="role-picker equipment-picker flex items-center gap-1.5" aria-label="Оборудование кресла">
				<span className="text-[11px] text-[var(--ink-muted)] font-semibold mr-1">Оснащение:</span>
				<button
					className={`h-9 min-h-[36px] px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all inline-flex items-center ${newChairHasXraySensor ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-[var(--paper)] text-[var(--ink-muted)] border-[var(--line)]"}`}
					type="button"
					aria-pressed={newChairHasXraySensor}
					onClick={() => setNewChairHasXraySensor((v: boolean) => !v)}
				>
					RVG визиограф
				</button>
				<button
					className={`h-9 min-h-[36px] px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all inline-flex items-center ${newChairHasMicroscope ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-[var(--paper)] text-[var(--ink-muted)] border-[var(--line)]"}`}
					type="button"
					aria-pressed={newChairHasMicroscope}
					onClick={() => setNewChairHasMicroscope((v: boolean) => !v)}
				>
					Микроскоп
				</button>
				<button
					className={`h-9 min-h-[36px] px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all inline-flex items-center ${newChairHasSurgeryKit ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-[var(--paper)] text-[var(--ink-muted)] border-[var(--line)]"}`}
					type="button"
					aria-pressed={newChairHasSurgeryKit}
					onClick={() => setNewChairHasSurgeryKit((v: boolean) => !v)}
				>
					Хирургия
				</button>
			</div>
		</div>
	);
};
