import {
	CalendarCheck,
	Clock,
	Headphones,
	PhoneIncoming,
	PhoneMissed,
	PhoneOutgoing,
	UserCheck,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import {
	type CallHistoryItem,
	type PatientRecord,
	formatDurationTimer,
	formatPhoneDisplay,
	isUnhandledMissedCall,
	resolvePatientFromPhone,
} from "../../../store/telephonyStore";
import { CallAudioPlayer } from "../CallAudioPlayer";
import {
	type TelephonyCallLogFilter,
	resolveCallKind,
	resolveCallbackSlaStatus,
} from "./telephonyDrawerTypes";

export interface TelephonyCallLogListProps {
	callHistory: CallHistoryItem[];
	activeFilter: TelephonyCallLogFilter;
	patients?: PatientRecord[] | undefined;
	onQuickBookFromLog: (item: CallHistoryItem, matchedPatient: PatientRecord | null) => void;
	onCallbackFromLog: (item: CallHistoryItem, matchedPatient: PatientRecord | null) => void;
	onOpenPatientFromLog?: (item: CallHistoryItem, matchedPatient: PatientRecord | null) => void;
}

export function TelephonyCallLogList({
	callHistory,
	activeFilter,
	patients,
	onQuickBookFromLog,
	onCallbackFromLog,
	onOpenPatientFromLog,
}: TelephonyCallLogListProps): React.JSX.Element {
	const [expandedAudioId, setExpandedAudioId] = useState<string | null>(null);

	const filteredItems = useMemo(() => {
		if (activeFilter === "missed_unhandled") {
			return callHistory.filter(isUnhandledMissedCall);
		}
		if (activeFilter === "recorded") {
			return callHistory.filter((c) => Boolean(c.recordingUrl));
		}
		return callHistory;
	}, [callHistory, activeFilter]);

	if (filteredItems.length === 0) {
		return (
			<div
				className="p-6 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-center space-y-1.5"
				data-testid="telephony-call-log-empty"
			>
				<div className="text-xs font-bold text-[var(--ink)]">
					{activeFilter === "missed_unhandled"
						? "Необработанных пропущенных вызовов нет"
						: activeFilter === "recorded"
							? "Записей разговоров по фильтру не найдено"
							: "Журнал вызовов за смену пуст"}
				</div>
				<div className="text-[11px] text-[var(--muted)]">
					Все новые входящие и исходящие звонки ВАТС отображаются здесь в реальном времени
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-2.5" data-testid="telephony-call-log-list">
			{filteredItems.map((item, idx) => {
				const matchedPatient =
					(item.patientId && patients?.find((p) => p.id === item.patientId)) ||
					resolvePatientFromPhone(patients, item.phone) ||
					null;
				const displayName =
					matchedPatient?.fullName ||
					(item.patientName && item.patientName !== "Неизвестный номер"
						? item.patientName
						: "Неизвестный абонент");
				const isKnown = Boolean(
					matchedPatient ||
						(item.patientId && item.patientName !== "Неизвестный номер"),
				);
				const kind = resolveCallKind(item);
				const sla = resolveCallbackSlaStatus(item);
				const itemKey = item.id || item.callId || `${item.phone}-${idx}`;
				const isAudioOpen = expandedAudioId === itemKey || idx === 0;
				const timeStr = item.callStartedAt
					? new Date(item.callStartedAt).toLocaleTimeString("ru-RU", {
							hour: "2-digit",
							minute: "2-digit",
						})
					: "Сейчас";

				return (
					<article
						key={itemKey}
						className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5 transition-colors"
						data-testid="telephony-call-log-item"
					>
						{/* Top Row: Caller Identity & Status */}
						<div className="flex items-start justify-between gap-2">
							<div className="flex items-start gap-2.5 min-w-0">
								<div
									className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${
										kind === "missed"
											? "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400"
											: "bg-[var(--paper-strong)] border-[var(--line)] text-[var(--teal)]"
									}`}
								>
									{kind === "missed" ? (
										<PhoneMissed size={14} />
									) : kind === "outgoing" ? (
										<PhoneOutgoing size={14} />
									) : (
										<PhoneIncoming size={14} />
									)}
								</div>
								<div className="min-w-0">
									<div className="flex items-center gap-1.5 flex-wrap">
										<button
											type="button"
											onClick={() => onOpenPatientFromLog?.(item, matchedPatient)}
											className="text-xs font-bold text-[var(--ink)] hover:text-[var(--teal)] truncate text-left cursor-pointer"
										>
											{displayName}
										</button>
										<span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--muted)] shrink-0">
											{isKnown ? "В базе" : "Новый номер"}
										</span>
									</div>
									<div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--muted)] flex-wrap">
										<span className="font-mono font-semibold text-[var(--ink)]">
											{formatPhoneDisplay(item.phone)}
										</span>
										<span>•</span>
										<span>{timeStr}</span>
										{typeof item.durationSeconds === "number" &&
											item.durationSeconds > 0 && (
												<>
													<span>•</span>
													<span className="font-mono">
														{formatDurationTimer(item.durationSeconds)}
													</span>
												</>
											)}
									</div>
								</div>
							</div>

							{/* Right Status / SLA Pill */}
							{kind === "missed" && sla.status !== "not_required" ? (
								<span
									className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 border ${
										sla.status === "overdue_sla"
											? "bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300"
											: sla.status === "pending_within_sla"
												? "bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300"
												: "bg-[var(--paper-strong)] border-[var(--line)] text-[var(--muted)]"
									}`}
									data-testid="call-log-sla-badge"
								>
									<Clock size={10} />
									<span className="font-mono">
										{sla.status === "pending_within_sla"
											? `SLA ${sla.formattedCountdown}`
											: sla.formattedCountdown}
									</span>
								</span>
							) : (
								<span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--muted)]">
									{kind === "outgoing" ? "Исходящий" : "Принят"}
								</span>
							)}
						</div>

						{item.outcomeNote && (
							<div className="text-[11px] text-[var(--muted)] bg-[var(--paper-strong)] px-2.5 py-1.5 rounded-lg border border-[var(--line)]">
								{item.outcomeNote}
							</div>
						)}

						{/* Audio Recording Player (when recordingUrl is present) */}
						{item.recordingUrl && isAudioOpen && (
							<div
								className="pt-1"
								data-testid="call-log-audio-player-container"
							>
								<CallAudioPlayer
									recordingUrl={item.recordingUrl}
									durationSeconds={item.durationSeconds || 42}
									seed={itemKey}
									transcript={item.transcript}
								/>
							</div>
						)}

						{/* Strictly <= 2 Direct Action Buttons per Card (Miller's Law) */}
						<div className="flex items-center gap-2 pt-0.5">
							<button
								type="button"
								onClick={() => onQuickBookFromLog(item, matchedPatient)}
								className="dnt-telephony-primary-btn flex-1 min-h-[36px] px-3 py-1.5 rounded-lg text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
								data-testid="call-log-quick-book-btn"
								title="Быстрая запись на приём в 1 клик"
							>
								<CalendarCheck size={13} />
								<span>Записать в 1 клик</span>
							</button>

							{item.recordingUrl && !isAudioOpen ? (
								<button
									type="button"
									onClick={() => setExpandedAudioId(itemKey)}
									className="flex-1 min-h-[36px] px-3 py-1.5 rounded-lg bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
									data-testid="call-log-toggle-audio-btn"
								>
									<Headphones size={13} className="text-[var(--teal)]" />
									<span>Прослушать запись</span>
								</button>
							) : kind === "missed" ? (
								<button
									type="button"
									onClick={() => onCallbackFromLog(item, matchedPatient)}
									className="flex-1 min-h-[36px] px-3 py-1.5 rounded-lg bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
									data-testid="call-log-callback-btn"
								>
									<PhoneOutgoing size={13} className="text-[var(--teal)]" />
									<span>Перезвонить</span>
								</button>
							) : (
								<button
									type="button"
									onClick={() =>
										onOpenPatientFromLog
											? onOpenPatientFromLog(item, matchedPatient)
											: onCallbackFromLog(item, matchedPatient)
									}
									className="flex-1 min-h-[36px] px-3 py-1.5 rounded-lg bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
									data-testid="call-log-open-patient-btn"
								>
									<UserCheck size={13} className="text-[var(--teal)]" />
									<span>{isKnown ? "Открыть карту" : "Перезвонить"}</span>
								</button>
							)}
						</div>
					</article>
				);
			})}
		</div>
	);
}
