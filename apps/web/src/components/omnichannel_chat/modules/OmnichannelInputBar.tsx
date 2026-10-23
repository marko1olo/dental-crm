import React, { useId } from "react";
import { Paperclip, Send } from "lucide-react";
import { showToast } from "../../GlobalToast";

export interface OmnichannelInputBarProps {
	draftText: string;
	onDraftChange: (text: string) => void;
	onSend: () => void;
	channelName: string;
	inputRef: React.RefObject<HTMLTextAreaElement | null>;
	isSending?: boolean | undefined;
}

export function OmnichannelInputBar({
	draftText,
	onDraftChange,
	onSend,
	channelName,
	inputRef,
	isSending = false,
}: OmnichannelInputBarProps): React.JSX.Element {
	const fileInputId = useId();

	return (
		<div className="p-2 sm:p-2.5 border-t border-[var(--line)] bg-[var(--paper-card)] flex items-end gap-1.5 shrink-0 pb-[max(8px,env(safe-area-inset-bottom))]">
			<label
				htmlFor={fileInputId}
				className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer shrink-0"
				title="Прикрепить файл (до 16 МБ)"
				data-testid="chat-attachment-btn"
			>
				<Paperclip size={18} />
				<input
					id={fileInputId}
					type="file"
					className="hidden"
					onChange={(e) => {
						if (e.target.files?.[0]) {
							showToast(`Файл прикреплён: ${e.target.files[0].name}`, "info");
						}
					}}
				/>
			</label>

			<textarea
				ref={inputRef}
				value={draftText}
				onChange={(e) => onDraftChange(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
						e.preventDefault();
						onSend();
					}
				}}
				rows={1}
				placeholder={`Написать в ${channelName.toUpperCase()}...`}
				className="flex-1 min-h-[44px] max-h-32 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--ink)] placeholder-[var(--muted)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
				data-testid="chat-message-draft-input"
			/>

			<button
				type="button"
				onClick={onSend}
				className="primary-button min-h-[44px] min-w-[44px] px-3.5 py-2 inline-flex items-center justify-center gap-1.5 shrink-0 text-xs font-bold"
				title="Отправить сообщение"
				data-testid="chat-send-message-btn"
			>
				<Send size={15} />
				<span className="hidden sm:inline">{isSending ? "Отправка..." : "Отправить"}</span>
			</button>
		</div>
	);
}
