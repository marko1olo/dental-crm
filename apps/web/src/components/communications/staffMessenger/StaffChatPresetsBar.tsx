import type React from "react";
import { AlertTriangle, Bell, Camera, Clock, DoorOpen, Sparkles, Stethoscope, User } from "lucide-react";
import type { StaffChatPresetsBarProps } from "./types";

export const StaffChatPresetsBar: React.FC<StaffChatPresetsBarProps> = ({ onIntercomPing }) => {
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

			<button
				type="button" onClick={() => onIntercomPing("call_assistant")}
				className="secondary-button shrink-0 min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong,#cbd5e1)] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.97]"
				data-testid="intercom-btn-call-assistant" title="Срочно вызвать ассистента в кабинет"
			>
				<User size={15} className="text-[var(--teal)] shrink-0" /><span>Нужен ассистент</span>
			</button>

			<button
				type="button" onClick={() => onIntercomPing("invite_next_patient")}
				className="secondary-button shrink-0 min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong,#cbd5e1)] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.97]"
				data-testid="intercom-btn-invite-next" title="Приём завершён: пригласите следующего пациента"
			>
				<DoorOpen size={15} className="text-[var(--primary)] shrink-0" /><span>Пригласите следующего</span>
			</button>

			<button
				type="button" onClick={() => onIntercomPing("doctor_delay_10m")}
				className="secondary-button shrink-0 min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong,#cbd5e1)] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.97]"
				data-testid="intercom-btn-delay-10m" title="Предупредить о задержке приёма на 10 минут"
			>
				<Clock size={15} className="text-amber-500 shrink-0" /><span>Задержка 10 мин</span>
			</button>

			<button
				type="button" onClick={() => onIntercomPing("prepare_sterilization")}
				className="secondary-button shrink-0 min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong,#cbd5e1)] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.97]"
				data-testid="intercom-btn-sterilization" title="Запрос в стерилизационную на подготовку набора"
			>
				<Sparkles size={15} className="text-[var(--primary)] shrink-0" /><span>Стерилизация</span>
			</button>

			<button
				type="button" onClick={() => onIntercomPing("patient_arrived")}
				className="secondary-button shrink-0 min-h-[40px] px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.97] hidden md:inline-flex"
				data-testid="intercom-btn-patient-arrived" title="Пациент подошел и ожидает в холле"
			>
				<Bell size={15} className="text-[var(--muted)] shrink-0" /><span>В холле</span>
			</button>

			<button
				type="button" onClick={() => onIntercomPing("xray_ready")}
				className="secondary-button shrink-0 min-h-[40px] px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.97] hidden lg:inline-flex"
				data-testid="intercom-btn-xray-ready" title="Снимок КТ загружен в систему"
			>
				<Camera size={15} className="text-[var(--muted)] shrink-0" /><span>Снимок КТ</span>
			</button>

			<button
				type="button" onClick={() => onIntercomPing("lab_work_ready")}
				className="secondary-button shrink-0 min-h-[40px] px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.97] hidden lg:inline-flex"
				data-testid="intercom-btn-lab-ready" title="Ортопедическая работа поступила из лаборатории"
			>
				<Stethoscope size={15} className="text-[var(--muted)] shrink-0" /><span>ЗТЛ</span>
			</button>

			<button
				type="button" onClick={() => onIntercomPing("urgent_doctor_call")}
				className="shrink-0 min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.97]"
				data-testid="intercom-btn-urgent-doctor" title="Срочный вызов дежурного врача в кабинет!"
			>
				<AlertTriangle size={15} className="text-rose-600 dark:text-rose-400 shrink-0" /><span>SOS</span>
			</button>
		</div>
	);
};
