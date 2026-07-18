import React from "react";
import { Paperclip, Send } from "lucide-react";

export function InboxInputArea({
	inputText,
	setInputText,
	handleSend,
	fileInputRef,
	pendingAttachments,
	setPendingAttachments,
}: {
	inputText: string;
	setInputText: (v: string) => void;
	handleSend: (e: React.FormEvent) => void;
	fileInputRef: React.RefObject<any>;
	pendingAttachments: File[];
	setPendingAttachments: (files: File[]) => void;
}) {
	return (
		<div
			style={{
				background: "var(--paper)",
				padding: "12px 20px",
				borderTop: "1px solid var(--line)",
			}}
		>
			<form onSubmit={handleSend} style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
				<button
					type="button"
					title="Прикрепить файл"
					style={{
						background: "none",
						border: "none",
						color: "var(--muted)",
						cursor: "pointer",
						padding: 6,
					}}
					onClick={() => fileInputRef.current?.click()}
				>
					<Paperclip size={20} />
				</button>
				<input
					type="file"
					ref={fileInputRef}
					style={{ display: "none" }}
					multiple
					onChange={(e) => {
						if (e.target.files) {
							setPendingAttachments([...pendingAttachments, ...Array.from(e.target.files)]);
							e.target.value = "";
						}
					}}
				/>
				<textarea
					placeholder="Введите сообщение (Enter для отправки)..."
					value={inputText}
					onChange={(e) => setInputText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							handleSend(e);
						}
					}}
					style={{
						flex: 1,
						padding: "10px 14px",
						borderRadius: 10,
						border: "1px solid var(--line)",
						background: "var(--paper-soft)",
						color: "var(--ink)",
						outline: "none",
						resize: "none",
						minHeight: 42,
						maxHeight: 120,
						fontSize: 14,
						fontFamily: "inherit",
					}}
					rows={1}
				/>
				<button
					type="submit"
					disabled={!inputText.trim() && pendingAttachments.length === 0}
					title="Отправить"
					style={{
						background:
							inputText.trim() || pendingAttachments.length > 0
								? "var(--teal)"
								: "var(--line)",
						color: "#fff",
						border: "none",
						width: 42,
						height: 42,
						borderRadius: "50%",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						cursor:
							inputText.trim() || pendingAttachments.length > 0
								? "pointer"
								: "default",
						transition: "background 0.2s",
						flexShrink: 0,
					}}
				>
					<Send size={17} style={{ transform: "translateX(-1px) translateY(1px)" }} />
				</button>
			</form>
		</div>
	);
}
