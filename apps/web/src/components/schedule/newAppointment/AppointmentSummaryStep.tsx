import { AlertTriangle, Zap } from "lucide-react";
import React from "react";
import type { AppointmentCollisionInfo, TextFieldChangeEvent } from "./types";

export interface AppointmentSummaryStepProps {
	// biome-ignore lint/suspicious/noExplicitAny: draft payload
	newAppointmentDraft: Record<string, any>;
	newAppointmentSaveState: string;
	// biome-ignore lint/suspicious/noExplicitAny: draft updater
	updateNewAppointmentDraft: (key: any, value: any) => void;
	resetNewAppointmentDraft: () => void;
	newAppointmentReadyToCreate: boolean;
	criticalMissingSteps: string[];
	collision: AppointmentCollisionInfo;
}

export function AppointmentSummaryStep(props: AppointmentSummaryStepProps) {
	const {
		newAppointmentDraft,
		newAppointmentSaveState,
		updateNewAppointmentDraft,
		resetNewAppointmentDraft,
		newAppointmentReadyToCreate,
		criticalMissingSteps,
		collision,
	} = props;

	return (
		<>
			<label className="form-span-2">
				Комментарий
				<textarea
					value={String(newAppointmentDraft.comment || "")}
					onChange={(event: TextFieldChangeEvent) =>
						updateNewAppointmentDraft("comment", event.target.value)
					}
					rows={2}
				/>
				<div className="flex flex-wrap gap-1.5 mt-1.5">
					{["Первичный", "Боль", "Осмотр", "Консультация", "Снимки"].map(
						(chip) => (
							<button
								key={chip}
								type="button"
								onClick={() => {
									const currentVal = String(
										newAppointmentDraft.comment || "",
									).trim();
									const newVal = currentVal
										? `${currentVal}, ${chip.toLowerCase()}`
										: chip;
									updateNewAppointmentDraft("comment", newVal);
								}}
								className="quick-chip quick-chip--sm"
							>
								+ {chip}
							</button>
						),
					)}
				</div>
			</label>

			{!newAppointmentReadyToCreate ? (
				<div
					className="schedule-create-missing"
					id="new-appointment-create-missing"
					role="status"
					aria-live="polite"
				>
					<strong>Чтобы создать запись, осталось:</strong>
					<ul>
						{criticalMissingSteps.map((step) => (
							<li key={step}>{step}</li>
						))}
					</ul>
				</div>
			) : null}

			{(collision.isCitoOverbooking || collision.hasCollision) && (
				<div
					className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
						collision.isCitoOverbooking
							? "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
							: "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200"
					}`}
					role="alert"
					data-testid={collision.isCitoOverbooking ? "cito-overbooking-alert" : "collision-alert"}
				>
					{collision.isCitoOverbooking ? (
						<Zap size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
					) : (
						<AlertTriangle size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
					)}
					<span>
						{collision.message ||
							(collision.isCitoOverbooking
								? "Запись по острой боли (наложение слота допустимо): наложение на занятый слот разрешено."
								: "Ресурсная коллизия. Разрешена экстренная запись (острая боль / совмещение допустимо).")}
					</span>
				</div>
			)}

			<div className="appointment-editor-actions">
				<button
					className="secondary-button min-h-[44px] px-4 py-2 text-xs font-semibold cursor-pointer"
					type="button"
					onClick={resetNewAppointmentDraft}
					disabled={newAppointmentSaveState === "saving"}
					aria-busy={newAppointmentSaveState === "saving" || undefined}
				>
					Сбросить
				</button>
			</div>
		</>
	);
}
