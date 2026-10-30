import React from "react";

export interface ConsentCheckboxesProps {
	readonly questionsAnswered: boolean;
	readonly risksUnderstood: boolean;
	readonly withdrawUnderstood: boolean;
	readonly setQuestionsAnswered: (v: boolean) => void;
	readonly setRisksUnderstood: (v: boolean) => void;
	readonly setWithdrawUnderstood: (v: boolean) => void;
}

export function ConsentCheckboxes({
	questionsAnswered,
	risksUnderstood,
	withdrawUnderstood,
	setQuestionsAnswered,
	setRisksUnderstood,
	setWithdrawUnderstood,
}: ConsentCheckboxesProps): React.JSX.Element {
	return (
		<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
			<label className="flex items-start gap-2.5 cursor-pointer text-[12.5px]">
				<input
					type="checkbox"
					checked={questionsAnswered}
					onChange={(e) => setQuestionsAnswered(e.target.checked)}
					className="mt-0.5 rounded text-[var(--teal)] focus:ring-[var(--teal)]"
				/>
				<span>
					На все заданные мной вопросы получены исчерпывающие и понятные ответы
					врача.
				</span>
			</label>

			<label className="flex items-start gap-2.5 cursor-pointer text-[12.5px]">
				<input
					type="checkbox"
					checked={risksUnderstood}
					onChange={(e) => setRisksUnderstood(e.target.checked)}
					className="mt-0.5 rounded text-[var(--teal)] focus:ring-[var(--teal)]"
				/>
				<span>
					Риски и возможные осложнения стоматологического вмешательства
					разъяснены и понятны.
				</span>
			</label>

			<label className="flex items-start gap-2.5 cursor-pointer text-[12.5px]">
				<input
					type="checkbox"
					checked={withdrawUnderstood}
					onChange={(e) => setWithdrawUnderstood(e.target.checked)}
					className="mt-0.5 rounded text-[var(--teal)] focus:ring-[var(--teal)]"
				/>
				<span>
					Право на отзыв согласия разъяснено. С планом лечения согласен.
				</span>
			</label>
		</div>
	);
}
