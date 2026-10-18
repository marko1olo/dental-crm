import { Send } from "lucide-react";
import type React from "react";
import type { StaffChatInputProps, StaffChatPresetsBarProps } from "./types";

export const StaffChatPresetsBar: React.FC<StaffChatPresetsBarProps> = ({
	onIntercomPing,
}) => {
	return (
		<div
			className="px-2 sm:px-4 py-2 bg-[var(--paper-soft)] border-b border-[var(--line)] flex items-center gap-1.5 sm:gap-2 overflow-x-auto whitespace-nowrap no-scrollbar scrollbar-none select-none"
			data-testid="chairside-intercom-pings-bar"
			role="toolbar"
			aria-label="Быстрые сигналы интеркома"
		>
			<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mr-1 shrink-0 hidden sm:inline">
				Сигналы:
			</span>

			{/* 1. Вызов ассистента */}
			<button
				type="button"
				onClick={() => onIntercomPing("call_assistant")}
				className="secondary-button shrink-0 min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong,#cbd5e1)] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.97]"
				data-testid="intercom-btn-call-assistant"
				title="Срочно вызвать ассистента в кабинет"
			>
				<span>🪑</span>
				<span>Нужен ассистент</span>
			</button>

			{/* 2. Пригласите следующего пациента */}
			<button
				type="button"
				onClick={() => onIntercomPing("invite_next_patient")}
				className="secondary-button shrink-0 min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong,#cbd5e1)] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.97]"
				data-testid="intercom-btn-invite-next"
				title="Приём завершён: пригласите следующего пациента"
			>
				<span>🚪</span>
				<span>Пригласите следующего</span>
			</button>

			{/* 3. Задержка приёма на 10 мин */}
			<button
				type="button"
				onClick={() => onIntercomPing("doctor_delay_10m")}
				className="secondary-button shrink-0 min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong,#cbd5e1)] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.97]"
				data-testid="intercom-btn-delay-10m"
				title="Предупредить о задержке приёма на 10 минут"
			>
				<span>⏳</span>
				<span>Задержка 10 мин</span>
			</button>

			{/* 4. Подготовьте стерилизацию */}
			<button
				type="button"
				onClick={() => onIntercomPing("prepare_sterilization")}
				className="secondary-button shrink-0 min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong,#cbd5e1)] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.97]"
				data-testid="intercom-btn-sterilization"
				title="Запрос в стерилизационную на подготовку набора"
			>
				<span>🧼</span>
				<span>Стерилизация</span>
			</button>

			{/* 5. Пациент в холле */}
			<button
				type="button"
				onClick={() => onIntercomPing("patient_arrived")}
				className="secondary-button shrink-0 min-h-[40px] px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.97] hidden md:inline-flex"
				data-testid="intercom-btn-patient-arrived"
				title="Пациент подошел и ожидает в холле"
			>
				<span>🛎️</span>
				<span>В холле</span>
			</button>

			{/* 6. Готов снимок КТ */}
			<button
				type="button"
				onClick={() => onIntercomPing("xray_ready")}
				className="secondary-button shrink-0 min-h-[40px] px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.97] hidden lg:inline-flex"
				data-testid="intercom-btn-xray-ready"
				title="Снимок КТ загружен в систему"
			>
				<span>📷</span>
				<span>Снимок КТ</span>
			</button>

			{/* 7. Работа из ЗТЛ */}
			<button
				type="button"
				onClick={() => onIntercomPing("lab_work_ready")}
				className="secondary-button shrink-0 min-h-[40px] px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.97] hidden lg:inline-flex"
				data-testid="intercom-btn-lab-ready"
				title="Ортопедическая работа поступила из лаборатории"
			>
				<span>🦷</span>
				<span>ЗТЛ</span>
			</button>

			{/* 8. Экстренный вызов SOS */}
			<button
				type="button"
				onClick={() => onIntercomPing("urgent_doctor_call")}
				className="shrink-0 min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.97]"
				data-testid="intercom-btn-urgent-doctor"
				title="Срочный вызов дежурного врача в кабинет!"
			>
				<span>🚨</span>
				<span>SOS</span>
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
			className="p-3 border-t border-[var(--line)] bg-[var(--paper-soft)]/60 flex items-center gap-2 select-none"
		>
			<input
				ref={inputRef}
				type="text"
				value={messageText}
				onChange={(e) => onChangeMessageText(e.target.value)}
				placeholder={`Сообщение в #${activeChannelName || "чат"}... (Enter для отправки)`}
				className="flex-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl px-3 py-2 text-xs text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--primary)] min-h-[44px]"
				data-testid="staff-chat-input"
			/>
			<button
				type="submit"
				disabled={!messageText.trim() || isSending}
				className="primary-button min-h-[44px] px-4 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white font-bold text-xs disabled:opacity-40 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.97]"
				data-testid="staff-chat-send-btn"
			>
				<Send size={15} />
				<span className="hidden sm:inline">Отправить</span>
			</button>
		</form>
	);
};
