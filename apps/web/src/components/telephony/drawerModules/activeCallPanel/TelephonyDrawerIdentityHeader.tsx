import { CalendarCheck, ChevronDown, Copy, UserCheck } from "lucide-react";
import React from "react";
import { showToast } from "../../../GlobalToast";
import { CHANNEL_BADGE_COLORS, type CallAttribution } from "../../telephonyAttribution";

export interface TelephonyDrawerIdentityHeaderProps {
	avatarColors: { bg: string; text: string };
	initials: string;
	callerName: string;
	isKnownPatient: boolean;
	callAttribution: CallAttribution | null;
	formattedPhone: string;
	phone: string;
	showQuickBooking: boolean;
	onToggleQuickBooking: () => void;
	onOpenFullPatientView: () => void;
}

export function TelephonyDrawerIdentityHeader({
	avatarColors,
	initials,
	callerName,
	isKnownPatient,
	callAttribution,
	formattedPhone,
	phone,
	showQuickBooking,
	onToggleQuickBooking,
	onOpenFullPatientView,
}: TelephonyDrawerIdentityHeaderProps): React.JSX.Element {
	return (
		<>
			{/* Patient Identity Block */}
			<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center gap-3">
				<div
					className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black shrink-0 shadow-xs border border-[var(--line)]"
					style={{ backgroundColor: avatarColors.bg, color: avatarColors.text }}
				>
					{initials}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-1.5 flex-wrap">
						<h3 className="text-base font-bold text-[var(--ink)] truncate">{callerName}</h3>
						{isKnownPatient ? (
							<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
								Пациент
							</span>
						) : (
							<span
								className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 inline-flex items-center gap-1"
								style={{
									backgroundColor: callAttribution ? CHANNEL_BADGE_COLORS[callAttribution.channelKey].bg : undefined,
									color: callAttribution ? CHANNEL_BADGE_COLORS[callAttribution.channelKey].text : undefined,
									border: callAttribution ? `1px solid ${CHANNEL_BADGE_COLORS[callAttribution.channelKey].border}` : undefined,
								}}
								data-testid="telephony-drawer-marketing-channel-badge"
								title={`Канал рекламы: ${callAttribution?.channelLabel || "ВАТС"}`}
							>
								{callAttribution ? callAttribution.channelLabel : "Новый лид"}
							</span>
						)}
					</div>
					<div className="flex items-center gap-2 mt-0.5 flex-wrap">
						<span className="font-mono font-bold text-xs text-[var(--teal)]">{formattedPhone}</span>
						<button
							type="button"
							onClick={() => {
								navigator.clipboard?.writeText(phone);
								showToast("Номер телефона скопирован", "info");
							}}
							className="text-[10px] text-[var(--muted)] hover:text-[var(--ink)] inline-flex items-center gap-0.5 cursor-pointer underline"
							title="Скопировать номер"
						>
							<Copy size={11} />
							копировать
						</button>
					</div>
				</div>
			</div>

			{/* 2 Primary Direct Action Buttons (Miller's Law) */}
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onToggleQuickBooking}
					className="primary-button dnt-telephony-primary-btn flex-1 min-h-[44px] px-3.5 py-2 rounded-xl text-white text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
					title="Создать запись на приём (быстрые слоты)"
					data-testid="drawer-action-book"
				>
					<CalendarCheck size={15} />
					<span>Создать запись</span>
					<ChevronDown size={14} className={`transition-transform duration-200 ${showQuickBooking ? "rotate-180" : ""}`} />
				</button>

				<button
					type="button"
					onClick={onOpenFullPatientView}
					className="secondary-button flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
					title={isKnownPatient ? "Открыть карту пациента" : "Создать нового пациента"}
					data-testid="drawer-action-open-card"
				>
					<UserCheck size={15} className="text-[var(--teal)]" />
					<span>{isKnownPatient ? "Открыть карту" : "+ Новый пациент"}</span>
				</button>
			</div>
		</>
	);
}
