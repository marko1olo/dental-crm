import React, { useRef } from "react";
import { Paperclip, Send, ShieldCheck } from "lucide-react";
import { DEFAULT_TEMPLATES } from "../omnichannelEngine.js";
import type {
	OmnichannelChannel,
	OmnichannelFooterProps,
	OmnichannelModalFooterProps,
} from "./types.js";

/**
 * OmnichannelFooter — Панель ввода сообщения, выбор канала, шаблона, вложения и отправка.
 */
export const OmnichannelFooter: React.FC<OmnichannelFooterProps> = ({
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

	return (
		<div className="hub-chat-input-area">
			<div className="hub-input-top-bar">
				{/* Выбор канала отправки */}
				<div className="hub-channel-select-wrap">
					<span className="hub-input-bar-label">Канал:</span>
					<select
						className="hub-channel-select"
						value={inputChannel}
						onChange={(e) => setInputChannel(e.target.value as OmnichannelChannel)}
					>
						<option value="whatsapp">WhatsApp (Kapso WABA)</option>
						<option value="telegram">Telegram (@DenteClinicBot)</option>
						<option value="sms">SMS (Резервный канал)</option>
					</select>
				</div>

				{/* Быстрый выбор шаблона */}
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
						<option value="">-- Выберите быстрый шаблон --</option>
						{DEFAULT_TEMPLATES.map((t) => (
							<option key={t.id} value={t.category}>
								{t.name}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Текстовая область */}
			<div className="hub-textarea-container">
				<textarea
					ref={textareaRef}
					className="hub-message-textarea min-h-[110px] pb-14"
					rows={3}
					placeholder={`Введите сообщение для ${selectedContactName} (Ctrl+Enter для отправки)...`}
					value={messageText}
					onChange={(e) => setMessageText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
							e.preventDefault();
							onSendMessage();
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

					<button
						type="button"
						className="hub-btn-send min-h-[44px] min-w-[44px] cursor-pointer"
						style={{ minHeight: "44px", minWidth: "44px" }}
						onClick={onSendMessage}
						disabled={isSending}
						aria-label="Отправить сообщение"
					>
						<Send size={15} /> {isSending ? "Отправка..." : "Отправить"}
					</button>
				</div>
			</div>
		</div>
	);
};

/**
 * OmnichannelModalFooter — Базовый футер модалки со статусом 152-ФЗ и кнопкой закрытия.
 */
export const OmnichannelModalFooter: React.FC<OmnichannelModalFooterProps> = ({ onClose }) => {
	return (
		<footer className="omnichannel-modal-footer">
			<div className="hub-footer-status">
				<ShieldCheck size={16} className="text-ok" />
				<span>Все сообщения шифруются и архивируются в соответствии с 152-ФЗ и СанПиН.</span>
			</div>

			<button
				type="button"
				className="omnichannel-btn-secondary min-h-[44px] px-4 cursor-pointer"
				style={{ minHeight: "44px" }}
				onClick={onClose}
			>
				Закрыть
			</button>
		</footer>
	);
};
