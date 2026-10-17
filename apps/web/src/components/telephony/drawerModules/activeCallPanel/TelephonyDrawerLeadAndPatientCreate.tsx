import { AlertCircle, Check, Sparkles, UserCheck, UserPlus } from "lucide-react";
import React from "react";
import type { IncomingCallPayload } from "../../../../store/telephonyStore";
import type { CallAttribution } from "../../telephonyAttribution";

export interface TelephonyDrawerLeadAndPatientCreateProps {
	currentCall: IncomingCallPayload;
	isKnownPatient: boolean;
	callAttribution: CallAttribution | null;
	isCapturingLead: boolean;
	onCaptureLead: () => void;
	newPatientNameInput: string;
	onNewPatientNameChange: (val: string) => void;
	isCreatingPatient: boolean;
	onQuickCreatePatient: () => void;
}

export function TelephonyDrawerLeadAndPatientCreate({
	currentCall,
	isKnownPatient,
	callAttribution,
	isCapturingLead,
	onCaptureLead,
	newPatientNameInput,
	onNewPatientNameChange,
	isCreatingPatient,
	onQuickCreatePatient,
}: TelephonyDrawerLeadAndPatientCreateProps): React.JSX.Element | null {
	if (isKnownPatient) return null;

	return (
		<>
			{/* Unknown Caller: 1-Click Lead Capture */}
			{callAttribution && (
				<div
					className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--teal-soft)] space-y-2.5 shadow-xs"
					data-testid="telephony-drawer-lead-capture-card"
				>
					<div className="flex items-center justify-between gap-1 flex-wrap">
						<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
							<Sparkles size={14} className="text-amber-500 shrink-0" />
							<span>Захват в CRM-лиды</span>
						</div>
						<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--paper-strong)] border border-[var(--line)]">
							{callAttribution.channelLabel}
						</span>
					</div>
					<button
						type="button"
						onClick={onCaptureLead}
						disabled={isCapturingLead || currentCall.isLeadCaptured}
						className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
						data-testid="drawer-action-capture-lead"
					>
						{currentCall.isLeadCaptured ? <Check size={15} /> : <UserPlus size={15} />}
						<span>
							{currentCall.isLeadCaptured
								? `Лид захвачен (${callAttribution.channelLabel})`
								: isCapturingLead
									? "Сохранение лида..."
									: `Захватить в лиды (${callAttribution.channelLabel})`}
						</span>
					</button>
				</div>
			)}

			{/* Unknown Caller: 5-second Quick Patient Creation */}
			<div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-2">
				<div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
					<AlertCircle size={14} className="text-amber-500" />
					<span>Быстрое создание нового пациента</span>
				</div>
				<div className="space-y-1.5">
					<input
						type="text"
						value={newPatientNameInput}
						onChange={(e) => onNewPatientNameChange(e.target.value)}
						placeholder="ФИО пациента (по умолчанию: Пациент + телефон)"
						className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-xs font-medium text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
						data-testid="drawer-new-patient-name-input"
					/>
					<button
						type="button"
						onClick={onQuickCreatePatient}
						disabled={isCreatingPatient}
						className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-500 active:scale-95 transition-all inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
						data-testid="drawer-quick-create-patient-btn"
					>
						<UserCheck size={15} />
						<span>
							{isCreatingPatient ? "Создание карты..." : "+ Создать пациента за 5 секунд"}
						</span>
					</button>
				</div>
			</div>
		</>
	);
}
