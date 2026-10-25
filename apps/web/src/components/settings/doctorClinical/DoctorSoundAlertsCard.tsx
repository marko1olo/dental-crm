import { Volume2, VolumeX } from "lucide-react";
import React from "react";

interface DoctorSoundAlertsCardProps {
	soundNotificationsMuted?: boolean | undefined;
	onToggleSoundMuted?: ((muted: boolean) => void) | undefined;
	onTestOnlineBookingSound?: (() => void) | undefined;
	onTestSlotEndSound?: (() => void) | undefined;
}

export function DoctorSoundAlertsCard({
	soundNotificationsMuted,
	onToggleSoundMuted,
	onTestOnlineBookingSound,
	onTestSlotEndSound,
}: DoctorSoundAlertsCardProps) {
	return (
		<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2.5">
					<div className="w-7 h-7 rounded-lg bg-[var(--paper-card)] border border-[var(--line-subtle)] flex items-center justify-center shrink-0 text-[var(--teal)]">
						{soundNotificationsMuted ? (
							<VolumeX size={15} className="text-[var(--muted)]" />
						) : (
							<Volume2 size={15} className="text-[var(--teal)]" />
						)}
					</div>
					<div>
						<span className="text-xs font-bold text-[var(--ink)] block">
							Звуковые оповещения врача
						</span>
						<span className="text-[11px] text-[var(--muted)]">
							{soundNotificationsMuted
								? "Звуки выключены"
								: "Синтез аудиосигналов Web Audio API активен"}
						</span>
					</div>
				</div>
				<button
					type="button"
					onClick={() => onToggleSoundMuted?.(!soundNotificationsMuted)}
					className={`w-9 h-5 rounded-full transition-colors relative shrink-0 cursor-pointer ${
						!soundNotificationsMuted ? "bg-[var(--teal)]" : "bg-[var(--line-strong)]"
					}`}
					aria-pressed={!soundNotificationsMuted}
					aria-label="Переключить звуковые оповещения"
				>
					<div
						className={`w-4 h-4 rounded-full bg-[var(--switch-thumb)] shadow-xs transition-transform absolute top-0.5 left-0.5 ${
							!soundNotificationsMuted ? "translate-x-4" : "translate-x-0"
						}`}
					/>
				</button>
			</div>

			<div className="flex gap-2 flex-wrap pt-1">
				<button
					type="button"
					onClick={onTestOnlineBookingSound}
					disabled={soundNotificationsMuted}
					className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-card)] hover:border-[var(--line-strong)] text-[var(--ink)] text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
				>
					<Volume2 size={13} />
					<span>Проверить: Онлайн-запись (440→660 Гц)</span>
				</button>
				<button
					type="button"
					onClick={onTestSlotEndSound}
					disabled={soundNotificationsMuted}
					className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-card)] hover:border-[var(--line-strong)] text-[var(--ink)] text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
				>
					<Volume2 size={13} />
					<span>Проверить: 5 мин до конца приёма (880→660 Гц)</span>
				</button>
			</div>
		</div>
	);
}
