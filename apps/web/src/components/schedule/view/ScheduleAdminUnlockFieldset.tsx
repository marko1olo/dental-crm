import { ShieldCheck } from "lucide-react";
import type React from "react";
import type { KeyboardEvent } from "react";
import type { TextFieldChangeEvent } from "./scheduleViewTypes";

export interface ScheduleAdminUnlockFieldsetProps {
	scheduleAdminSecretNeeded: boolean;
	scheduleAdminSecretSession: string;
	scheduleAdminSecretDraft: string;
	setScheduleAdminSecretDraft: (val: string) => void;
	scheduleAdminSecretReason: string;
	adminSecretReady: boolean;
	unlockScheduleAdminSession: () => void;
	lockScheduleAdminSession: () => void;
	showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function ScheduleAdminUnlockFieldset({
	scheduleAdminSecretNeeded,
	scheduleAdminSecretSession,
	scheduleAdminSecretDraft,
	setScheduleAdminSecretDraft,
	scheduleAdminSecretReason,
	adminSecretReady,
	unlockScheduleAdminSession,
	lockScheduleAdminSession,
	showToast,
}: ScheduleAdminUnlockFieldsetProps) {
	if (!scheduleAdminSecretNeeded) return null;

	return (
		<fieldset
			className="appointment-editor schedule-admin-unlock min-w-0"
			aria-label="Секрет администратора для сохранения расписания"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "12px",
				padding: "16px",
				borderRadius: "10px",
				background: "var(--paper-soft)",
				marginTop: "8px",
				minWidth: 0,
			}}
		>
			{!scheduleAdminSecretSession ? (
				<>
					<p
						className="admin-unlock-guidance form-span-2 break-words"
						id="schedule-admin-unlock-guidance"
						role="status"
						aria-live="polite"
						style={{ margin: 0, fontWeight: 600 }}
					>
						{scheduleAdminSecretReason}
					</p>
					<label className="form-span-2 min-w-0">
						Секрет администратора клиники
						<input
							type="password"
							autoComplete="current-password"
							value={scheduleAdminSecretDraft}
							onChange={(event: TextFieldChangeEvent) =>
								setScheduleAdminSecretDraft(event.target.value)
							}
							onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
								if (event.key === "Enter") {
									event.preventDefault();
									if (!adminSecretReady) {
										showToast(
											"Введите мастер-пароль администратора",
											"warning",
										);
										return;
									}
									unlockScheduleAdminSession();
								}
							}}
							placeholder="введите секрет администратора"
							aria-describedby="schedule-admin-unlock-guidance"
						/>
					</label>
					<div className="appointment-editor-actions flex flex-wrap items-center justify-between gap-3 min-w-0">
						<span className="save-state save-state-idle break-words">
							Секрет хранится только до перезагрузки страницы и относится
							только к расписанию.
						</span>
						<button
							className="secondary-button shrink-0 h-8 px-3.5"
							type="button"
							onClick={unlockScheduleAdminSession}
							aria-describedby={!adminSecretReady ? "schedule-admin-unlock-guidance" : undefined}
							disabled={!adminSecretReady}
						>
							<ShieldCheck aria-hidden="true" /> Запомнить и повторить
							сохранение
						</button>
					</div>
				</>
			) : (
				<div className="appointment-editor-actions flex flex-wrap items-center justify-between gap-3 min-w-0">
					<span className="save-state save-state-idle break-words">
						Секрет запомнен до перезагрузки страницы. Он подставляется при
						сохранении записи — верен он или нет, покажет само сохранение.
					</span>
					<button
						className="secondary-button shrink-0"
						type="button"
						onClick={lockScheduleAdminSession}
					>
						Забыть секрет
					</button>
				</div>
			)}
		</fieldset>
	);
}
