import type React from "react";
import { Send } from "lucide-react";

export interface WhatsAppInputBarProps {
	inputText: string;
	isSending: boolean;
	onChangeText: (text: string) => void;
	onSendMessage: () => void;
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

/**
 * WhatsApp Message Composer Input Bar.
 * Strict Mandate 8e: Send button is NEVER permanently disabled on empty text;
 * triggers instant clinical reminder template guidance instead.
 */
export function WhatsAppInputBar({
	inputText,
	isSending,
	onChangeText,
	onSendMessage,
	textareaRef,
}: WhatsAppInputBarProps) {
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			onSendMessage();
		}
	};

	return (
		<div className="p-3 bg-[var(--paper,#0f172a)] border-t border-[var(--line,#334155)] flex flex-col gap-2">
			<div className="flex items-end gap-2">
				<div className="flex-1 min-w-0 rounded-xl bg-[var(--paper-soft,rgba(30,41,59,0.5))] border border-[var(--line,#334155)] focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all p-2 flex flex-col">
					<textarea
						ref={textareaRef}
						value={inputText}
						onChange={(e) => onChangeText(e.target.value)}
						onKeyDown={handleKeyDown}
						rows={Math.min(5, Math.max(1, inputText.split("\n").length))}
						placeholder="Введите текст сообщения (Enter для отправки)..."
						className="w-full bg-transparent text-xs sm:text-sm text-[var(--ink,#f8fafc)] focus:outline-none resize-none leading-relaxed min-w-0 break-words"
					/>
				</div>

				{/* Send Button >= 44x44px (Mandate 8e: disabled ONLY while sending) */}
				<button
					type="button"
					onClick={onSendMessage}
					disabled={isSending}
					className="min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all inline-flex items-center justify-center gap-1.5 shadow-md shadow-teal-950/40"
					aria-label="Отправить сообщение"
				>
					<Send size={16} className={isSending ? "animate-pulse" : ""} />
					<span className="hidden sm:inline">{isSending ? "Отправка..." : "Отправить"}</span>
				</button>
			</div>
		</div>
	);
}
