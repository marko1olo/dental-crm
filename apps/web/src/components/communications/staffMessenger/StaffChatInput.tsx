import { Send } from "lucide-react";
import type React from "react";
import { StaffChatPresetsBar } from "./StaffChatPresetsBar";
import type { StaffChatInputProps } from "./types";

export { StaffChatPresetsBar };

export const StaffChatInput: React.FC<StaffChatInputProps> = ({
	inputRef,
	messageText,
	isSending,
	activeChannelName,
	onChangeMessageText,
	onSendMessage,
}) => {
	return (
		<form
			onSubmit={onSendMessage}
			className="p-3 border-t border-[var(--line)] bg-[var(--paper-soft)]/60 flex items-center gap-2 select-none"
		>
			<input
				ref={inputRef}
				type="text"
				value={messageText}
				onChange={(e) => onChangeMessageText(e.target.value)}
				placeholder={`Сообщение в #${activeChannelName || "чат"}... (Enter для отправки)`}
				className="flex-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl px-3 py-2 text-xs text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--primary)] min-h-[44px]"
				data-testid="staff-chat-input"
			/>
			<button
				type="submit"
				disabled={!messageText.trim() || isSending}
				className="primary-button min-h-[44px] px-4 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white font-bold text-xs disabled:opacity-40 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.97]"
				data-testid="staff-chat-send-btn"
			>
				<Send size={15} />
				<span className="hidden sm:inline">Отправить</span>
			</button>
		</form>
	);
};
