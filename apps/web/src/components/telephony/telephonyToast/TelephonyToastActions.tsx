import { CalendarCheck, PhoneCall, PhoneOff, UserCheck } from "lucide-react";
import React from "react";

export interface TelephonyToastActionsProps {
	isKnownPatient: boolean;
	isAnswered: boolean;
	onOpenPatientCard: () => void;
	onCreateAppointment: () => void;
	onAnswer: () => void;
	onRejectCall: () => void;
	onEndCall: () => void;
}

export function TelephonyToastActions({
	isKnownPatient,
	isAnswered,
	onOpenPatientCard,
	onCreateAppointment,
	onAnswer,
	onRejectCall,
	onEndCall,
}: TelephonyToastActionsProps): React.JSX.Element {
	return (
		<div className="flex flex-col gap-2 pt-0.5">
			<div className="grid grid-cols-2 gap-2">
				<button
					type="button"
					onClick={onOpenPatientCard}
					className="secondary-button min-h-[44px] px-2.5 py-2 text-xs font-bold whitespace-nowrap inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)]"
					title="Открыть карту пациента"
					data-testid="toast-action-open-card"
				>
					<UserCheck size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="truncate">{isKnownPatient ? "Открыть карту" : "+ Создать карту"}</span>
				</button>

				<button
					type="button"
					onClick={onCreateAppointment}
					/* Secondary по закону Single-Focus: единственный Primary карточки
					   входящего звонка — «Ответить». Запись на приём — вторичное действие. */
					className="secondary-button min-h-[44px] px-2.5 py-2 text-xs font-bold whitespace-nowrap inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)]"
					title="Записать на приём"
					data-testid="toast-action-quick-book"
				>
					<CalendarCheck size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="hidden sm:inline">Записать на приём</span>
					<span className="sm:hidden">Записать</span>
				</button>
			</div>

			<div className="grid grid-cols-2 gap-2">
				{!isAnswered ? (
					<>
						<button
							type="button"
							onClick={onAnswer}
							className="min-h-[44px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
							title="Принять звонок"
							data-testid="toast-action-answer"
						>
							<PhoneCall size={16} />
							<span>Ответить</span>
						</button>
						<button
							type="button"
							onClick={onRejectCall}
							className="min-h-[44px] px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95"
							title="Отклонить звонок"
							data-testid="toast-action-reject"
						>
							<PhoneOff size={16} />
							<span>Сбросить</span>
						</button>
					</>
				) : (
					<button
						type="button"
						onClick={onEndCall}
						className="col-span-2 min-h-[44px] px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
						title="Завершить разговор"
						data-testid="toast-action-end"
					>
						<PhoneOff size={16} />
						<span>Завершить разговор</span>
					</button>
				)}
			</div>
		</div>
	);
}
