import {
	DYNAMIC_MESSAGE_MACROS,
	type MessageTemplate,
	type MessageTemplateChannel,
	type MessageTemplateScenario,
} from "@dental/shared";
import { Save, X } from "lucide-react";
import React from "react";
import { CHANNEL_BADGES, SCENARIO_LABELS } from "./templateConstants";
import { useMessageTemplateEditor } from "./useMessageTemplateEditor";

interface Props {
	template?: MessageTemplate | null;
	isOpen: boolean;
	onClose: () => void;
	onSaved: () => void;
}

export const MessageTemplateEditorModal: React.FC<Props> = ({ template, isOpen, onClose, onSaved }) => {
	const { title, setTitle, channel, setChannel, scenario, setScenario, text, setText, isSaving, handleInsertMacro, handleSave } =
		useMessageTemplateEditor(template, onSaved, onClose);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
			<div className="bg-[var(--paper-card)] border border-[var(--line)] rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-4">
				<div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
					<h3 className="m-0 text-base font-bold text-[var(--ink)]">
						{template ? "Редактировать шаблон" : "Новый шаблон сообщения"}
					</h3>
					<button type="button" onClick={onClose} className="p-1 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer">
						<X size={18} />
					</button>
				</div>
				<form onSubmit={handleSave} className="space-y-3">
					<input
						type="text"
						placeholder="Название шаблона (напр.: Напоминание за сутки)"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						required
						className="w-full h-9 px-3 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
					/>
					<div className="grid grid-cols-2 gap-2">
						<select
							value={channel}
							onChange={(e) => setChannel(e.target.value as MessageTemplateChannel)}
							className="h-9 px-3 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
						>
							{Object.entries(CHANNEL_BADGES).map(([k, v]) => (
								<option key={k} value={k}>{v.label}</option>
							))}
						</select>
						<select
							value={scenario}
							onChange={(e) => setScenario(e.target.value as MessageTemplateScenario)}
							className="h-9 px-3 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
						>
							{Object.entries(SCENARIO_LABELS).map(([k, v]) => (
								<option key={k} value={k}>{v}</option>
							))}
						</select>
					</div>
					<div>
						<span className="block text-[11px] text-[var(--muted)] mb-1">Макросы (клик для вставки):</span>
						<div className="flex flex-wrap gap-1">
							{DYNAMIC_MESSAGE_MACROS.slice(0, 5).map((m) => (
								<button
									key={m.key}
									type="button"
									onClick={() => handleInsertMacro(m.key)}
									className="px-2 py-0.5 text-[10px] rounded-md border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--teal-soft)] cursor-pointer"
								>
									{`{${m.key}}`}
								</button>
							))}
						</div>
					</div>
					<textarea
						rows={4}
						placeholder="Здравствуйте, {patient_name}! Напоминаем о визите..."
						value={text}
						onChange={(e) => setText(e.target.value)}
						required
						className="w-full p-2.5 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] resize-none"
					/>
					<div className="flex justify-end gap-2 pt-2">
						<button type="button" onClick={onClose} className="h-9 min-h-[44px] px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs cursor-pointer">
							Отмена
						</button>
						<button type="submit" disabled={isSaving} className="h-9 min-h-[44px] px-4 rounded-xl bg-[var(--teal)] text-[var(--on-teal)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
							<Save size={14} /> <span>{isSaving ? "Сохранение..." : "Сохранить"}</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
