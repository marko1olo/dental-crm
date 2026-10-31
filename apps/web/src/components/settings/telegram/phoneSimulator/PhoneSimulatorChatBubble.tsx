import React from "react";
import { CheckCheck, ExternalLink, Sparkles } from "lucide-react";
import type { BotChannelType, ChatMessage } from "./types";

export interface PhoneSimulatorChatBubbleProps {
	message: ChatMessage;
	channel: BotChannelType;
	activeTheme: "light" | "dark";
	customPrimaryActionLabel?: string;
	onButtonClick?: (action: string, isWebApp?: boolean, url?: string) => void;
}

export const PhoneSimulatorChatBubble: React.FC<PhoneSimulatorChatBubbleProps> = ({
	message,
	channel,
	activeTheme,
	customPrimaryActionLabel,
	onButtonClick,
}) => {
	const isUser = message.sender === "user";
	const paragraphs = message.text.split("\n");

	if (isUser) {
		return (
			<div
				className="tg-user-bubble-container"
				style={{
					display: "flex",
					justifyContent: "flex-end",
					width: "100%",
					margin: "2px 0",
				}}
			>
				<div
					className="tg-user-bubble"
					style={{
						maxWidth: "82%",
						padding: "8px 12px",
						borderRadius: "14px 14px 2px 14px",
						background:
							activeTheme === "dark"
								? "var(--teal-dark, #0f766e)"
								: "var(--teal, #0d9488)",
						color: "#ffffff",
						boxShadow: "0 1px 3px rgba(0, 0, 0, 0.15)",
					}}
				>
					<p
						className="tg-user-text"
						style={{
							margin: 0,
							fontSize: "12px",
							lineHeight: 1.4,
							wordBreak: "break-word",
						}}
					>
						{paragraphs.map((p, idx) => (
							<React.Fragment key={`user-p-${idx}`}>
								{p}
								{idx < paragraphs.length - 1 && <br />}
							</React.Fragment>
						))}
					</p>
					<div
						className="tg-user-meta"
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "flex-end",
							gap: "4px",
							marginTop: "2px",
							fontSize: "10px",
							opacity: 0.85,
						}}
					>
						<span>{message.time}</span>
						<CheckCheck size={13} aria-hidden="true" />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className="tg-bot-bubble-wrapper"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "6px",
				maxWidth: "92%",
				alignSelf: "flex-start",
			}}
		>
			<div
				className={`tg-message-card bubble-${channel}`}
				style={{
					borderRadius: "14px",
					overflow: "hidden",
					boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12)",
					background:
						activeTheme === "dark"
							? "var(--paper-card, #1e293b)"
							: "var(--paper, #ffffff)",
					color:
						activeTheme === "dark"
							? "var(--paper-white, #f8fafc)"
							: "var(--ink, #0f172a)",
				}}
			>
				{message.bannerUrl && (
					<div
						className="tg-message-banner"
						style={{
							width: "100%",
							height: "120px",
							position: "relative",
							overflow: "hidden",
						}}
					>
						<img
							src={message.bannerUrl}
							alt="Визуальная обложка"
							loading="lazy"
							style={{ width: "100%", height: "100%", objectFit: "cover" }}
						/>
						<div
							className="tg-banner-overlay-tag"
							style={{
								position: "absolute",
								bottom: "6px",
								left: "6px",
								background: "rgba(15, 23, 42, 0.75)",
								color: "#ffffff",
								fontSize: "10px",
								fontWeight: 600,
								padding: "2px 6px",
								borderRadius: "6px",
								display: "flex",
								alignItems: "center",
								gap: "4px",
								backdropFilter: "blur(4px)",
							}}
						>
							<Sparkles size={11} /> <span>DENTE Bot</span>
						</div>
					</div>
				)}

				<div
					className="tg-message-body"
					style={{ padding: "10px 12px 6px 12px", position: "relative" }}
				>
					<p
						className="tg-message-text"
						style={{
							fontSize: "12px",
							lineHeight: 1.45,
							margin: 0,
							whiteSpace: "pre-wrap",
							wordBreak: "break-word",
						}}
					>
						{paragraphs.map((p, idx) => (
							<React.Fragment key={`bot-p-${idx}`}>
								{p}
								{idx < paragraphs.length - 1 && <br />}
							</React.Fragment>
						))}
					</p>

					<div
						className="tg-message-meta"
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "flex-end",
							gap: "4px",
							marginTop: "4px",
							fontSize: "10px",
							color: "var(--text-muted, #94a3b8)",
						}}
					>
						<span className="tg-message-time">{message.time}</span>
						<CheckCheck
							size={14}
							className="tg-read-check text-sky-500"
							aria-hidden="true"
						/>
					</div>
				</div>
			</div>

			{/* Inline Keyboard Buttons */}
			{message.buttons && message.buttons.length > 0 && (
				<div
					className={`tg-inline-keyboard kb-${channel}`}
					role="group"
					aria-label="Кнопки бота"
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "4px",
						width: "100%",
					}}
				>
					{message.buttons.map((row, rowIndex) => (
						<div
							className="tg-inline-row"
							key={`sim-row-${rowIndex}`}
							style={{ display: "flex", gap: "4px", width: "100%" }}
						>
							{row.map((btn, btnIndex) => {
								const displayLabel =
									btn.isPrimary && customPrimaryActionLabel?.trim()
										? customPrimaryActionLabel
										: btn.text;

								let btnClass = "tg-inline-btn";
								if (btn.isPrimary) btnClass += " tg-btn-primary";
								if (btn.isDanger) btnClass += " tg-btn-danger";

								return (
									<button
										key={`sim-btn-${rowIndex}-${btnIndex}`}
										type="button"
										className={btnClass}
										onClick={() =>
											onButtonClick?.(btn.action, btn.webApp, btn.url)
										}
										style={{
											flex: 1,
											minHeight: "44px",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											gap: "6px",
											padding: "8px 10px",
											borderRadius: "8px",
											fontSize: "11px",
											fontWeight: 600,
											cursor: "pointer",
											border: btn.isPrimary
												? "none"
												: "1px solid var(--line, rgba(148, 163, 184, 0.3))",
											background: btn.isPrimary
												? "var(--teal, #0d9488)"
												: activeTheme === "dark"
													? "var(--card-bg, #1e293b)"
													: "var(--paper, #ffffff)",
											color: btn.isPrimary
												? "#ffffff"
												: activeTheme === "dark"
													? "var(--paper-white, #f8fafc)"
													: "var(--ink, #0f172a)",
											transition: "all 0.15s ease",
										}}
									>
										<span>{displayLabel}</span>
										{btn.url && (
											<ExternalLink size={12} className="tg-link-icon" />
										)}
									</button>
								);
							})}
						</div>
					))}
				</div>
			)}
		</div>
	);
};
