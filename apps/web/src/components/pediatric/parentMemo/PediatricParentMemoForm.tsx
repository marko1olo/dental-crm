import React from "react";
import type { FranklRating } from "../../odontogram/pediatricDentitionEngine";
import { PediatricParentMemoFranklSelect } from "./PediatricParentMemoFranklSelect";

interface PediatricParentMemoFormProps {
	readonly frankl: FranklRating;
	readonly setFrankl: (f: FranklRating) => void;
	readonly hasAnesthesia: boolean;
	readonly setHasAnesthesia: (v: boolean) => void;
	readonly hasPulpotomy: boolean;
	readonly setHasPulpotomy: (v: boolean) => void;
	readonly pulpotomyTooth: number;
	readonly setPulpotomyTooth: (t: number) => void;
	readonly hasFissureSealing: boolean;
	readonly setHasFissureSealing: (v: boolean) => void;
	readonly fissureTeeth: string;
	readonly setFissureTeeth: (s: string) => void;
	readonly hasSilvering: boolean;
	readonly setHasSilvering: (v: boolean) => void;
	readonly silveringTeeth: string;
	readonly setSilveringTeeth: (s: string) => void;
	readonly customNotes: string;
	readonly setCustomNotes: (s: string) => void;
}

export const PediatricParentMemoForm: React.FC<PediatricParentMemoFormProps> = ({
	frankl,
	setFrankl,
	hasAnesthesia,
	setHasAnesthesia,
	hasPulpotomy,
	setHasPulpotomy,
	pulpotomyTooth,
	setPulpotomyTooth,
	hasFissureSealing,
	setHasFissureSealing,
	fissureTeeth,
	setFissureTeeth,
	hasSilvering,
	setHasSilvering,
	silveringTeeth,
	setSilveringTeeth,
	customNotes,
	setCustomNotes,
}) => {
	return (
		<div className="space-y-3">
			<PediatricParentMemoFranklSelect frankl={frankl} setFrankl={setFrankl} />

			<div className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-3 space-y-2">
				<label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[var(--ink,#0f172a)]">
					<input
						type="checkbox"
						checked={hasAnesthesia}
						onChange={(e) => setHasAnesthesia(e.target.checked)}
						className="rounded text-teal-600 focus:ring-teal-500"
						data-testid="memo-checkbox-anesthesia"
					/>
					<span>Проводилась местная анестезия (памятка по защите онемевшей губы)</span>
				</label>
				<label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[var(--ink,#0f172a)]">
					<input
						type="checkbox"
						checked={hasPulpotomy}
						onChange={(e) => setHasPulpotomy(e.target.checked)}
						className="rounded text-teal-600 focus:ring-teal-500"
						data-testid="memo-checkbox-pulpotomy"
					/>
					<span>Пульпотомия / Лечение пульпита (зуб {pulpotomyTooth})</span>
				</label>
				<label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[var(--ink,#0f172a)]">
					<input
						type="checkbox"
						checked={hasFissureSealing}
						onChange={(e) => setHasFissureSealing(e.target.checked)}
						className="rounded text-teal-600 focus:ring-teal-500"
						data-testid="memo-checkbox-fissure"
					/>
					<span>Герметизация фиссур ({fissureTeeth})</span>
				</label>
				<label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[var(--ink,#0f172a)]">
					<input
						type="checkbox"
						checked={hasSilvering}
						onChange={(e) => setHasSilvering(e.target.checked)}
						className="rounded text-teal-600 focus:ring-teal-500"
						data-testid="memo-checkbox-silvering"
					/>
					<span>Серебрение / Фторирование ({silveringTeeth})</span>
				</label>
			</div>

			<div>
				<label htmlFor="memo-custom-notes" className="block text-[11px] font-bold text-[var(--muted,#64748b)] mb-1">
					Дополнительные врачебные рекомендации:
				</label>
				<textarea
					id="memo-custom-notes"
					rows={2}
					value={customNotes}
					onChange={(e) => setCustomNotes(e.target.value)}
					className="w-full p-2 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] focus:border-teal-500 focus:outline-hidden resize-none"
					placeholder="Индивидуальные назначения врача (диета, гигиена, запись на осмотр)..."
				/>
			</div>
		</div>
	);
};
