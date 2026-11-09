import React, { useRef } from "react";
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
	fileInputRef?: React.RefObject<HTMLInputElement | null>;
	onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const MessageInputFloatingBar: React.FC<MessageInputFloatingBarProps> = ({
	inputText, setInputText, activeChannel, onToggleChannel, attachedFileName,
	onAttachFile, onRemoveAttachedFile, onSendMessage, isSendingMessage, textareaRef,
	fileInputRef, onFileChange,
}) => {
	const localFileInputRef = useRef<HTMLInputElement | null>(null);
	const resolvedFileInputRef = fileInputRef || localFileInputRef;
	const channelColor = activeChannel === "whatsapp" ? "text-emerald-600" : activeChannel === "telegram" ? "text-sky-600" : "text-blue-600";
	const channelText = activeChannel === "whatsapp" ? "WA" : activeChannel === "telegram" ? "TG" : "SMS";

	const handleDefaultFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (onFileChange) {
			onFileChange(e);
			return;
		}
		e.target.value = "";
	};

	return (
		<>
			<input
				ref={resolvedFileInputRef}
				id="mobile-chat-file-input"
				type="file"
				accept="image/*,.pdf,.dcm,application/dicom"
				className="hidden"
				style={{ display: "none" }}
				aria-hidden="true"
				tabIndex={-1}
				onChange={handleDefaultFileChange}
			/>
			{attachedFileName && (
				<div className="px-4 py-1.5 bg-teal-500/10 border-t border-teal-500/20 flex items-center justify-between text-xs text-teal-700 dark:text-teal-300">
					<span className="flex items-center gap-1.5 truncate">
						<Paperclip size={13} />
						<span>{attachedFileName}</span>
					</span>
					<button type="button" onClick={onRemoveAttachedFile} className="p-1 hover:opacity-75">
						<X size={14} />
					</button>
				</div>
			)}

			<div className="mobile-chat-input-bar">
				<button type="button" className="mobile-touch-btn text-xs font-bold shrink-0" onClick={onToggleChannel} title="Сменить канал отправки">
					<span className={channelColor}>{channelText}</span>
				</button>

				<button type="button" className="mobile-touch-btn shrink-0" onClick={onAttachFile} aria-label="Прикрепить снимок" title="Прикрепить снимок">
					<Paperclip size={18} className="text-[var(--muted)]" />
				</button>

				<textarea
					ref={textareaRef} className="mobile-chat-textarea" placeholder="Сообщение..." rows={1}
					value={inputText} onChange={(e) => setInputText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							void onSendMessage();
						}
					}}
					data-testid="input-mobile-chat-message"
				/>

				<div className="shrink-0">
					<SmartMicrophoneButton
						context="general"
						onResult={(t) => setInputText((prev) => (prev ? `${prev} ${t}` : t))}
						className="mobile-touch-btn"
					/>
				</div>

				<button
					type="button" className="mobile-send-btn" onClick={() => void onSendMessage()}
					disabled={isSendingMessage} aria-label="Отправить сообщение" title="Отправить" data-testid="btn-mobile-chat-send"
				>
					<Send size={18} />
				</button>
			</div>
		</>
	);
};
