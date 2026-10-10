import { Send } from "lucide-react";
import type React from "react";
import type { StaffChatInputProps, StaffChatPresetsBarProps } from "./types";

export const StaffChatPresetsBar: React.FC<StaffChatPresetsBarProps> = ({
	onIntercomPing,
}) => {
	return (
		<div
			className="px-2 sm:px-4 py-2 bg-slate-100/70 dark:bg-slate-900/60 border-b border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] flex items-center gap-1.5 sm:gap-2 overflow-x-auto whitespace-nowrap scrollbar-none"
			data-testid="chairside-intercom-pings-bar"
		>
			<span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1 shrink-0 hidden sm:inline">
				Интерком 1-клик:
			</span>

			{/* 1. Вызов ассистента */}
			<button
				type="button"
				onClick={() => onIntercomPing("call_assistant")}
				className="shrink-0 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
				data-testid="intercom-btn-call-assistant"
				title="Срочно вызвать ассистента в кабинет"
			>
				<span>🪑</span>
				<span>Вызов ассистента в каб.</span>
			</button>

			{/* 2. Пациент в холле */}
			<button
				type="button"
				onClick={() => onIntercomPing("patient_arrived")}
				className="shrink-0 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-500/15 border border-teal-500/30 text-teal-800 dark:text-teal-300 hover:bg-teal-500/25 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
				data-testid="intercom-btn-patient-arrived"
				title="Пациент подошел и ожидает"
			>
				<span>🛎️</span>
				<span>Пациент в холле</span>
			</button>

			{/* 3. Готов снимок КТ */}
			<button
				type="button"
				onClick={() => onIntercomPing("xray_ready")}
				className="shrink-0 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-500/15 border border-blue-500/30 text-blue-800 dark:text-blue-300 hover:bg-blue-500/25 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
				data-testid="intercom-btn-xray-ready"
				title="Снимок КТ загружен"
			>
				<span>📷</span>
				<span>Готов снимок КТ</span>
			</button>

			{/* 4. Работа из ЗТЛ */}
			<button
				type="button"
				onClick={() => onIntercomPing("lab_work_ready")}
				className="shrink-0 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/15 border border-indigo-500/30 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-500/25 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
				data-testid="intercom-btn-lab-ready"
				title="Ортопедическая работа поступила"
			>
				<span>🦷</span>
				<span>Работа из ЗТЛ</span>
			</button>

			{/* 5. Экстренный вызов SOS */}
			<button
				type="button"
				onClick={() => onIntercomPing("urgent_doctor_call")}
				className="shrink-0 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 border border-rose-500/40 text-rose-800 dark:text-rose-300 hover:bg-rose-500/30 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
				data-testid="intercom-btn-urgent-doctor"
				title="Срочный вызов дежурного врача"
			>
				<span>🚨</span>
				<span>Срочно врача!</span>
			</button>
		</div>
	);
};

export const StaffChatInput: React.FC<StaffChatInputProps> = ({
	inputRef,
	messageText,
	isSending,
	activeChannelName,
	onChangeMessageText,
	onSendMessage,
}) => {
	return (
		<form
			onSubmit={onSendMessage}
			className="p-3 border-t border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] bg-slate-50/60 dark:bg-slate-900/60 flex items-center gap-2"
		>
			<input
				ref={inputRef}
				type="text"
				value={messageText}
				onChange={(e) => onChangeMessageText(e.target.value)}
				placeholder={`Сообщение в #${activeChannelName || "чат"}... (Enter для отправки)`}
				className="flex-1 bg-white dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 min-h-[44px]"
				data-testid="staff-chat-input"
			/>
			<button
				type="submit"
				disabled={!messageText.trim() || isSending}
				className="min-h-[44px] px-4 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-500 disabled:opacity-40 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
				data-testid="staff-chat-send-btn"
			>
				<Send size={15} />
				<span className="hidden sm:inline">Отправить</span>
			</button>
		</form>
	);
};
