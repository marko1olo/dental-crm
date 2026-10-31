import React from "react";
import { Mic, Paperclip, Send } from "lucide-react";

export interface PhoneSimulatorInputBarProps {
	inputText: string;
	activeTheme: "light" | "dark";
	onInputChange: (text: string) => void;
	onSendMessage: (text?: string) => void;
	onResetToStart: () => void;
	showMiniToast: (text: string) => void;
}

export const PhoneSimulatorInputBar: React.FC<PhoneSimulatorInputBarProps> = ({
	inputText,
	activeTheme,
	onInputChange,
	onSendMessage,
	onResetToStart,
	showMiniToast,
}) => {
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			onSendMessage();
		}
	};

	const hasText = inputText.trim().length > 0;

	return (
		<div
			className="tg-input-bar"
			style={{
				display: "flex",
				alignItems: "center",
				gap: "8px",
				padding: "8px 10px",
				borderTop:
					activeTheme === "dark"
						? "1px solid rgba(255, 255, 255, 0.08)"
						: "1px solid var(--line, rgba(0, 0, 0, 0.08))",
				background:
					activeTheme === "dark"
						? "var(--paper-card, #1e293b)"
						: "var(--paper, #ffffff)",
				zIndex: 10,
			}}
		>
			{/* Menu Pill Shortcut Button */}
			<button
				type="button"
				onClick={onResetToStart}
				className="tg-menu-pill-btn"
				title="Главное меню /start"
				style={{
					minWidth: "44px",
					minHeight: "44px",
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					padding: "0 10px",
					borderRadius: "10px",
					fontSize: "11px",
					fontWeight: 600,
					background: "transparent",
					border: "1px solid var(--line, rgba(148, 163, 184, 0.3))",
					color:
						activeTheme === "dark"
							? "var(--paper-white, #f8fafc)"
							: "var(--ink, #0f172a)",
					cursor: "pointer",
					whiteSpace: "nowrap",
					transition: "all 0.15s ease",
				}}
			>
				Меню
			</button>

			{/* Paperclip Attachment Button */}
			<button
				type="button"
				onClick={() =>
					showMiniToast("Прикрепление снимка или файла (RVG/КТ)")
				}
				className="tg-input-icon-btn"
				title="Прикрепить снимок или направление"
				style={{
					minWidth: "44px",
					minHeight: "44px",
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					background: "transparent",
					border: "1px solid var(--line, rgba(148, 163, 184, 0.3))",
					borderRadius: "10px",
					color: "var(--text-muted, #64748b)",
					cursor: "pointer",
					padding: 0,
					transition: "all 0.15s ease",
				}}
			>
				<Paperclip size={18} />
			</button>

			{/* Message Input Box */}
			<div
				className="tg-input-field-wrapper"
				style={{
					flex: 1,
					display: "flex",
					alignItems: "center",
					background:
						activeTheme === "dark"
							? "rgba(15, 23, 42, 0.6)"
							: "rgba(148, 163, 184, 0.12)",
					borderRadius: "12px",
					padding: "0 10px",
					minHeight: "44px",
					border: "1px solid var(--line, transparent)",
				}}
			>
				<input
					type="text"
					value={inputText}
					onChange={(e) => onInputChange(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Напишите сообщение..."
					className="tg-fake-input"
					style={{
						width: "100%",
						background: "transparent",
						border: "none",
						fontSize: "12px",
						color:
							activeTheme === "dark"
								? "var(--paper-white, #f8fafc)"
								: "var(--ink, #0f172a)",
						outline: "none",
					}}
				/>
			</div>

			{/* Dynamic Primary CTA: Send or Voice Intake */}
			{hasText ? (
				<button
					type="button"
					onClick={() => onSendMessage()}
					className="tg-send-cta-btn"
					title="Отправить сообщение"
					data-testid="tg-sim-send-btn"
					style={{
						minWidth: "44px",
						minHeight: "44px",
						borderRadius: "10px",
						background: "var(--teal, #0d9488)",
						color: "#ffffff",
						border: "none",
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						cursor: "pointer",
						flexShrink: 0,
						boxShadow: "0 2px 6px rgba(13, 148, 136, 0.35)",
						transition: "all 0.15s ease",
					}}
				>
					<Send size={16} />
				</button>
			) : (
				<button
					type="button"
					onClick={() =>
						showMiniToast("Голосовая диктовка: скажите симптом или время")
					}
					className="tg-mic-btn"
					title="Голосовой ввод сообщения"
					style={{
						minWidth: "44px",
						minHeight: "44px",
						borderRadius: "10px",
						background:
							activeTheme === "dark"
								? "rgba(255, 255, 255, 0.08)"
								: "rgba(148, 163, 184, 0.18)",
						color:
							activeTheme === "dark"
								? "var(--paper-white, #f8fafc)"
								: "var(--ink, #0f172a)",
						border: "1px solid var(--line, rgba(148, 163, 184, 0.3))",
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						cursor: "pointer",
						flexShrink: 0,
						transition: "all 0.15s ease",
					}}
				>
					<Mic size={17} />
				</button>
			)}
		</div>
	);
};
