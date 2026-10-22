import { Camera, ChevronDown, Clock, Radio, ShieldAlert, Sparkles, UserPlus } from "lucide-react";
import React from "react";
import { ChairsideAssistantReasonsDropdown } from "./ChairsideAssistantReasonsDropdown";
import { useChairsideIntercomPing } from "./useChairsideIntercomPing";

export interface ChairsideIntercomBarProps {
	cabinetNumber?: string;
	patientId?: string;
	patientName?: string;
	onOpenMessenger?: () => void;
	className?: string;
}

export const ChairsideIntercomBar: React.FC<ChairsideIntercomBarProps> = ({
	cabinetNumber = "1", patientId, patientName, onOpenMessenger, className = "",
}) => {
	const pingState = useChairsideIntercomPing(cabinetNumber, patientId, patientName);

	return (
		<div
			className={`chairside-intercom-hud flex items-center flex-wrap gap-2 p-2 bg-[var(--paper-soft)]/95 backdrop-blur-md border border-[var(--line)] rounded-2xl shadow-sm relative z-20 text-xs w-full max-w-full overflow-x-auto no-scrollbar scrollbar-none select-none ${className}`}
			data-testid="chairside-intercom-bar" role="toolbar" aria-label="Интерком у кресла врача"
		>
			<div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--teal)] font-bold shrink-0">
				<Radio size={15} className="animate-pulse text-[var(--teal)]" />
				<span className="text-xs whitespace-nowrap">Каб. {cabinetNumber}</span>
			</div>

			<div className="relative shrink-0">
				<div className="inline-flex rounded-xl shadow-xs overflow-hidden border border-[var(--teal)]/40 bg-[var(--paper)]">
					<button
						type="button" disabled={pingState.isSending}
						onClick={() => pingState.handlePing("call_assistant", "помощь на приёме")}
						className={`h-11 min-h-[44px] px-3.5 py-2 inline-flex items-center gap-2 font-bold text-xs sm:text-sm transition-all cursor-pointer select-none active:scale-[0.97] ${
							pingState.activePingKey === "call_assistant"
								? "bg-[var(--teal)] text-white"
								: "bg-[var(--teal)]/10 hover:bg-[var(--teal)]/20 text-[var(--teal-dark,#0f766e)] dark:text-[var(--teal-light,#2dd4bf)]"
						}`}
						title="Срочно вызвать ассистента к установке в 1 тап" data-testid="chairside-call-assistant-btn"
					>
						<span className="text-base">🪑</span>
						<span>Нужен ассистент</span>
					</button>
					<button
						type="button" onClick={() => pingState.setShowReasonsDropdown((v) => !v)}
						className="h-11 min-h-[44px] px-2.5 bg-[var(--teal)]/15 hover:bg-[var(--teal)]/25 text-[var(--teal-dark,#0f766e)] dark:text-[var(--teal-light,#2dd4bf)] border-l border-[var(--teal)]/30 transition-all cursor-pointer flex items-center justify-center active:scale-[0.97]"
						title="Выбрать повод вызова ассистента по клинической специальности" aria-label="Выбрать повод вызова ассистента"
					>
						<ChevronDown size={14} />
					</button>
				</div>
				<ChairsideAssistantReasonsDropdown
					isOpen={pingState.showReasonsDropdown} onSelectReason={pingState.handlePing}
				/>
			</div>

			<button
				type="button" disabled={pingState.isSending} onClick={() => pingState.handlePing("invite_next_patient")}
				className="secondary-button h-11 min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong,#cbd5e1)] text-[var(--ink)] transition-all cursor-pointer shadow-xs active:scale-[0.97] shrink-0"
				title="Оповестить ресепшен: приём завершён, пригласите следующего пациента" data-testid="chairside-invite-next-btn"
			>
				<UserPlus size={16} className="text-[var(--primary)] shrink-0" />
				<span>Пригласите следующего</span>
			</button>

			<button
				type="button" disabled={pingState.isSending} onClick={() => pingState.handlePing("doctor_delay_10m")}
				className="secondary-button h-11 min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong,#cbd5e1)] text-[var(--ink)] transition-all cursor-pointer shadow-xs active:scale-[0.97] shrink-0"
				title="Предупредить ресепшен о задержке текущего приёма на 10 минут" data-testid="chairside-delay-btn"
			>
				<Clock size={16} className="text-amber-500 shrink-0" />
				<span>Задержка 10 мин</span>
			</button>

			<button
				type="button" disabled={pingState.isSending} onClick={() => pingState.handlePing("prepare_sterilization")}
				className="secondary-button h-11 min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong,#cbd5e1)] text-[var(--ink)] transition-all cursor-pointer shadow-xs active:scale-[0.97] shrink-0"
				title="Запрос в ЦСО / стерилизационную на подготовку стерильного набора" data-testid="chairside-sterilization-btn"
			>
				<Sparkles size={16} className="text-[var(--primary)] shrink-0" />
				<span>Стерилизация</span>
			</button>

			<button
				type="button" disabled={pingState.isSending} onClick={() => pingState.handlePing("xray_ready")}
				className="secondary-button h-11 min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-all cursor-pointer shadow-xs active:scale-[0.97] shrink-0 hidden md:inline-flex"
				title="Запросить готовность снимка КТ / ОПТГ"
			><Camera size={15} className="text-[var(--muted)] shrink-0" /><span>Снимок КТ</span></button>

			<button
				type="button" disabled={pingState.isSending} onClick={() => pingState.handlePing("lab_work_ready")}
				className="secondary-button h-11 min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-all cursor-pointer shadow-xs active:scale-[0.97] shrink-0 hidden lg:inline-flex"
				title="Уточнить поступление конструкции из зуботехнической лаборатории"
			><span className="text-sm">🦷</span><span>ЗТЛ</span></button>

			<button
				type="button" disabled={pingState.isSending} onClick={() => pingState.handlePing("urgent_doctor_call")}
				className="h-11 min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 transition-all cursor-pointer shadow-xs active:scale-[0.97] shrink-0"
				title="Экстренный вызов дежурного врача в кабинет!" data-testid="chairside-sos-btn"
			><ShieldAlert size={16} className="text-rose-600 dark:text-rose-400 shrink-0" /><span>SOS</span></button>

			{onOpenMessenger && (
				<button
					type="button" onClick={onOpenMessenger}
					className="ml-auto secondary-button h-11 min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold text-[var(--primary)] hover:bg-[var(--paper-soft)] border border-[var(--line)] transition-all cursor-pointer shrink-0"
					title="Перейти в общий мессенджер клиники"
				>
					Открыть чат
				</button>
			)}
		</div>
	);
};

export default ChairsideIntercomBar;
