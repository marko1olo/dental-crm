import React from "react";
import { RefreshCw, Send, Shield } from "lucide-react";

export interface OperatorInputBarProps {
	inputText: string;
	isSending: boolean;
	operatorName: string;
	onInputChange: (value: string) => void;
	onOperatorNameChange: (value: string) => void;
	onSendMessage: () => void;
}

export function OperatorInputBar({
	inputText,
	isSending,
	operatorName,
	onInputChange,
	onOperatorNameChange,
	onSendMessage,
}: OperatorInputBarProps) {
	return (
		<div className="p-3 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex flex-col gap-2">
			<div className="flex items-end gap-2">
				<textarea
					rows={2}
					placeholder={`Ответить пациенту от имени ${operatorName}...`}
					value={inputText}
					onChange={(e) => onInputChange(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							onSendMessage();
						}
					}}
					className="flex-1 p-2.5 text-xs rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
					data-testid="operator-message-input"
				/>
				<button
					type="button"
					onClick={onSendMessage}
					disabled={!inputText.trim() || isSending}
					className="min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-xs bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
					data-testid="operator-send-btn"
				>
					{isSending ? (
						<RefreshCw size={15} className="animate-spin" />
					) : (
						<Send size={15} />
					)}
					<span>Отправить</span>
				</button>
			</div>

			<div className="flex items-center justify-between text-[11px] text-[var(--muted,#64748b)] px-1 flex-wrap gap-1">
				<div className="flex items-center gap-1 shrink-0">
					<Shield size={12} className="text-teal-600 shrink-0" />
					<span className="truncate max-w-[210px] sm:max-w-none">152-ФЗ / 323-ФЗ: Защита тайны</span>
				</div>
				<div className="flex items-center gap-1 shrink-0">
					<span>Оператор:</span>
					<input
						type="text"
						value={operatorName}
						onChange={(e) => onOperatorNameChange(e.target.value)}
						className="w-24 sm:w-28 text-[11px] px-1 py-0.5 rounded border border-[var(--line)] bg-transparent font-medium"
						title="Имя оператора для подписи в чате"
					/>
				</div>
			</div>
		</div>
	);
}
