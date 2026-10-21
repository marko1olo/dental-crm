import type React from "react";
import { useRef } from "react";
import { Paperclip, Send } from "lucide-react";
import { showToast } from "../GlobalToast";

export interface WhatsAppInputBarProps {
	inputText: string;
	isSending: boolean;
	onChangeText: (text: string) => void;
	onSendMessage: () => void;
	onAttachFile?: (file: File) => void;
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

/**
 * WhatsApp Message Composer Input Bar.
 * Strict Mandate 8e: Send button is NEVER permanently disabled on empty text;
 * triggers instant clinical reminder template guidance instead.
 * Apple HIG: Touch targets >= 44x44px for both Send and Attachment buttons.
 */
export function WhatsAppInputBar({
	inputText,
	isSending,
	onChangeText,
	onSendMessage,
	onAttachFile,
	textareaRef,
}: WhatsAppInputBarProps) {
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			onSendMessage();
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;
		const file = files[0];
		if (!file) return;
		if (file.size > 16 * 1024 * 1024) {
			showToast("Максимальный размер вложения — 16 МБ", "error");
			e.target.value = "";
			return;
		}

		if (onAttachFile) {
			onAttachFile(file);
		} else {
			onChangeText(inputText ? `${inputText}\n[Вложение: ${file.name}]` : `[Вложение: ${file.name}]`);
			showToast(`Файл «${file.name}» прикреплен к сообщению`, "info");
		}
		e.target.value = "";
	};

	return (
		<div className="p-3 bg-[var(--paper,#0f172a)] border-t border-[var(--line,#334155)] flex flex-col gap-2">
			<div className="flex items-end gap-2">
				{/* Hidden file input */}
				<input
					type="file"
					ref={fileInputRef}
					className="hidden"
					aria-hidden="true"
					tabIndex={-1}
					accept="image/png,image/jpeg,image/webp,application/pdf"
					onChange={handleFileChange}
				/>

				{/* Attachment Paperclip Button >= 44x44px */}
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-[var(--line,#334155)] bg-[var(--paper-soft,rgba(30,41,59,0.5))] hover:bg-slate-700/60 active:scale-95 text-[var(--muted,#94a3b8)] hover:text-white transition-all inline-flex items-center justify-center cursor-pointer"
					title="Прикрепить план лечения, рентген-снимок или документ (до 16 МБ)"
					aria-label="Прикрепить файл"
					data-testid="whatsapp-attach-file-btn"
				>
					<Paperclip size={18} />
				</button>

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
					className="min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all inline-flex items-center justify-center gap-1.5 shadow-md shadow-teal-950/40 cursor-pointer"
					aria-label="Отправить сообщение"
				>
					<Send size={16} className={isSending ? "animate-pulse" : ""} />
					<span className="hidden sm:inline">{isSending ? "Отправка..." : "Отправить"}</span>
				</button>
			</div>
		</div>
	);
}
