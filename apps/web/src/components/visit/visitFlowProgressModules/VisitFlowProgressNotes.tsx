import React from "react";
import { type FlowStepItem, stepStatusWord } from "./visitFlowProgressHelpers";

export interface VisitFlowProgressNotesProps {
	readonly stepNotes: readonly FlowStepItem[];
}

export function VisitFlowProgressNotes({ stepNotes }: VisitFlowProgressNotesProps) {
	if (stepNotes.length === 0) return null;

	return (
		<div className="vfp-step-notes" role="status" aria-live="polite">
			<strong>Что сообщил разбор</strong>
			<ul>
				{stepNotes.map((step) => (
					<li key={`note-${step.key}`}>
						{step.label} — {stepStatusWord(step.status)}: {step.msg}
					</li>
				))}
			</ul>
			<p>
				Разбор — помощник, записи приёма он не заменяет: продиктованный
				текст и поля ЭМК остались на месте. Шаг, выключенный в настройках,
				включают в настройках клиники; если шаг отказал — нажмите «Собрать
				нейро-черновик» ещё раз или заполните поля руками.
			</p>
		</div>
	);
}
