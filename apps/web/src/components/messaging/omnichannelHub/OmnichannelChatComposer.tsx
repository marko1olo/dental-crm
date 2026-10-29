/**
 * OmnichannelChatComposer.tsx — Панель ввода сообщения, выбор канала, шаблона, вложения и отправка.
 * Без disabled на кнопке отправки по Мандату 8e. Touch target >= 44x44px.
 * Строго <= 120 строк по Мандату 8b.
 */

import React, { useRef } from "react";
import { Paperclip, Send } from "lucide-react";
import { DEFAULT_TEMPLATES } from "../omnichannelEngine.js";
import type { OmnichannelChannel, OmnichannelFooterProps } from "./types.js";

export const OmnichannelChatComposer: React.FC<OmnichannelFooterProps> = ({
	inputChannel,
	setInputChannel,
	messageText,
	setMessageText,
	selectedTemplateCategory,
	setSelectedTemplateCategory,
	isSending,
	selectedContactName,
	onSendMessage,
	onAttachFile,
	onApplyTemplate,
}) => {
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const attachmentInputRef = useRef<HTMLInputElement | null>(null);

	const handleSendClick = () => {
		if (isSending) return;
		onSendMessage();
	};

	return (
		<div className="hub-chat-input-area">
			<div className="hub-input-top-bar">
				<div className="hub-channel-select-wrap">
					<span className="hub-input-bar-label">Канал:</span>
					<select
						className="hub-channel-select"
						value={inputChannel}
						onChange={(e) => setInputChannel(e.target.value as OmnichannelChannel)}
					>
						<option value="whatsapp">WhatsApp (WABA)</option>
						<option value="telegram">Telegram</option>
						<option value="sms">SMS</option>
					</select>
				</div>

				<div className="hub-template-quick-select-wrap">
					<span className="hub-input-bar-label">Шаблон:</span>
					<select
						className="hub-template-select"
						value={selectedTemplateCategory}
						onChange={(e) => {
							const cat = e.target.value;
							setSelectedTemplateCategory(cat);
							const tpl = DEFAULT_TEMPLATES.find((t) => t.category === cat);
							if (tpl) onApplyTemplate(tpl);
						}}
					>
						<option value="">-- Быстрый клинический шаблон --</option>
						{DEFAULT_TEMPLATES.map((t) => (
							<option key={t.id} value={t.category}>
								{t.name}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="hub-textarea-container">
				<textarea
					ref={textareaRef}
					className="hub-message-textarea min-h-[100px] pb-14"
					rows={3}
					placeholder={`Сообщение для ${selectedContactName} (Ctrl+Enter для отправки)...`}
					value={messageText}
					onChange={(e) => setMessageText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
							e.preventDefault();
							handleSendClick();
						}
					}}
				/>

				<div className="hub-textarea-actions">
					<input
						type="file"
						ref={attachmentInputRef}
						style={{ display: "none" }}
						aria-hidden="true"
						tabIndex={-1}
						onChange={onAttachFile}
					/>
					<button
						type="button"
						className="hub-icon-action-btn min-h-[44px] min-w-[44px] inline-flex items-center justify-center cursor-pointer"
						style={{ minHeight: "44px", minWidth: "44px" }}
						title="Прикрепить файл или план лечения"
						aria-label="Прикрепить файл или план лечения"
						onClick={() => attachmentInputRef.current?.click()}
					>
						<Paperclip size={16} />
					</button>

					{/* Primary CTA кнопка отправки без disabled (Мандаты 8e, 8am) */}
					<button
						type="button"
						className="hub-btn-send min-h-[44px] min-w-[44px] px-4 cursor-pointer inline-flex items-center gap-1.5"
						style={{ minHeight: "44px", minWidth: "44px" }}
						onClick={handleSendClick}
						aria-label="Отправить сообщение"
					>
						<Send size={15} />
						<span>{isSending ? "Отправка..." : "Отправить"}</span>
					</button>
				</div>
			</div>
		</div>
	);
};
