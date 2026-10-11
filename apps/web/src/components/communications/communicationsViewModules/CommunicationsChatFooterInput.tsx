import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";
import { COMMUNICATION_NOTE_QUICK_CHIPS } from "./communicationsConstants";
import type { CommunicationsChatFooterInputProps } from "./types";

export function CommunicationsChatFooterInput({
	communicationNote,
	onCommunicationNoteChange,
	closingNoteArmed,
	communicationNoteInputId,
	communicationNoteDescriptionId,
}: CommunicationsChatFooterInputProps) {
	return (
		<div className="communication-note-row bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] rounded-xl p-4 mb-5">
			<div className="flex justify-between items-center mb-3">
				<div>
					<label
						htmlFor={communicationNoteInputId}
						className="text-sm font-semibold text-[var(--ink)] block"
					>
						Что сказал пациент
					</label>
					<span
						id={communicationNoteDescriptionId}
						className="text-xs text-[var(--muted)]"
					>
						Запись приложится к той задаче, которую вы закроете ниже, и
						останется в журнале клиники. Если поле пустое, в журнал уйдёт «Задача
						связи закрыта.»
					</span>
				</div>
				<SmartMicrophoneButton
					context="general"
					onResult={(t) => {
						const prev = communicationNote || "";
						onCommunicationNoteChange(prev ? `${prev}, ${t}` : t);
					}}
					className="inline-flex gap-1.5 items-center px-3 py-1.5 text-[var(--teal-dark,#0f766e)] bg-[var(--teal-soft,#ccfbf1)] border-none rounded-lg font-semibold text-xs hover:opacity-80 transition-opacity"
				/>
			</div>
			<textarea
				id={communicationNoteInputId}
				value={communicationNote}
				onChange={(event) => onCommunicationNoteChange(event.target.value)}
				aria-describedby={communicationNoteDescriptionId}
				placeholder="Нажмите для ввода или надиктуйте результат связи..."
				rows={2}
				className="w-full p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm resize-y mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]"
			/>
			{closingNoteArmed ? (
				<div className="flex flex-wrap items-center justify-between gap-2 mb-3">
					<span className="text-xs font-semibold text-[var(--bad-fg,#b42318)]">
						Заметка заполнена и приложится к следующей закрытой задаче — даже
						если она уже про другого пациента.
					</span>
					<button
						type="button"
						className="secondary-button text-xs"
						onClick={() => onCommunicationNoteChange("")}
					>
						Очистить заметку
					</button>
				</div>
			) : null}
			<div className="quick-chips-row flex-wrap gap-2">
				<span className="text-xs text-[var(--muted)] self-center mr-1">
					Шаблоны:
				</span>
				{COMMUNICATION_NOTE_QUICK_CHIPS.map((chip) => (
					<button
						key={chip}
						type="button"
						className="quick-chip focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all hover:scale-[1.02]"
						onClick={() => {
							const prev = communicationNote || "";
							onCommunicationNoteChange(
								prev ? `${prev}, ${chip.toLowerCase()}` : chip,
							);
						}}
					>
						+ {chip}
					</button>
				))}
			</div>
		</div>
	);
}
