import React from "react";
import { Paperclip, Send, X } from "lucide-react";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";
import type { ChatChannel } from "./types";

export interface MessageInputFloatingBarProps {
	inputText: string;
	setInputText: React.Dispatch<React.SetStateAction<string>>;
	activeChannel: ChatChannel;
	onToggleChannel: () => void;
	attachedFileName: string | null;
	onAttachFile: () => void;
	onRemoveAttachedFile: () => void;
	onSendMessage: () => void | Promise<void>;
	isSendingMessage: boolean;
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export const MessageInputFloatingBar: React.FC<MessageInputFloatingBarProps> = ({
	inputText,
	setInputText,
	activeChannel,
	onToggleChannel,
	attachedFileName,
	onAttachFile,
	onRemoveAttachedFile,
	onSendMessage,
	isSendingMessage,
	textareaRef,
}) => {
	return (
		<>
			{/* Attached File Preview if any */}
			{attachedFileName && (
				<div className="px-4 py-1.5 bg-teal-500/10 border-t border-teal-500/20 flex items-center justify-between text-xs text-teal-700 dark:text-teal-300">
					<span className="flex items-center gap-1.5 truncate">
						<Paperclip size={13} />
						<span>{attachedFileName}</span>
					</span>
					<button
						type="button"
						onClick={onRemoveAttachedFile}
						className="p-1 hover:opacity-75"
					>
						<X size={14} />
					</button>
				</div>
			)}

			{/* ─── Natural Thumb Zone Input Bar ─── */}
			<div className="mobile-chat-input-bar">
				{/* Channel Toggle (WhatsApp / Telegram / SMS) */}
				<button
					type="button"
					className="mobile-touch-btn text-xs font-bold shrink-0"
					onClick={onToggleChannel}
					title="Сменить канал отправки"
				>
					<span
						className={
							activeChannel === "whatsapp"
								? "text-emerald-600"
								: activeChannel === "telegram"
									? "text-sky-600"
									: "text-blue-600"
						}
					>
						{activeChannel === "whatsapp" ? "WA" : activeChannel === "telegram" ? "TG" : "SMS"}
					</span>
				</button>

				{/* Attach File / X-Ray */}
				<button
					type="button"
					className="mobile-touch-btn shrink-0"
					onClick={onAttachFile}
					aria-label="Прикрепить снимок"
					title="Прикрепить снимок"
				>
					<Paperclip size={18} className="text-[var(--muted)]" />
				</button>

				{/* Input Textarea */}
				<textarea
					ref={textareaRef}
					className="mobile-chat-textarea"
					placeholder="Сообщение..."
					rows={1}
					value={inputText}
					onChange={(e) => setInputText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							void onSendMessage();
						}
					}}
					data-testid="input-mobile-chat-message"
				/>

				{/* Smart Speech Dictation */}
				<div className="shrink-0">
					<SmartMicrophoneButton
						context="general"
						onResult={(t) => {
							setInputText((prev) => (prev ? `${prev} ${t}` : t));
						}}
						className="mobile-touch-btn"
					/>
				</div>

				{/* Send Button */}
				<button
					type="button"
					className="mobile-send-btn"
					onClick={() => void onSendMessage()}
					disabled={isSendingMessage}
					aria-label="Отправить сообщение"
					title="Отправить"
					data-testid="btn-mobile-chat-send"
				>
					<Send size={18} />
				</button>
			</div>
		</>
	);
};
