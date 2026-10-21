import { Megaphone } from "lucide-react";
import React from "react";
import { DENTAL_ADVERTISING_SOURCES } from "../patientFieldRequirementsConfig";

export interface PatientAdvertisingSourceSelectProps {
	readonly advertisingSource: string;
	readonly onAdvertisingSourceChange: (source: string) => void;
	readonly requireAdvertisingSource?: boolean | undefined;
	readonly error?: string | undefined;
}

export function PatientAdvertisingSourceSelect({
	advertisingSource,
	onAdvertisingSourceChange,
	requireAdvertisingSource,
	error,
}: PatientAdvertisingSourceSelectProps) {
	return (
		<div className="create-patient-form-field mt-2">
			<label htmlFor="patient-create-advertising-source" className="create-patient-label flex items-center justify-between">
				<span className="inline-flex items-center gap-1.5">
					<Megaphone size={14} className="text-[var(--teal)]" />
					Рекламный источник{" "}
					{requireAdvertisingSource ? (
						<span className="text-rose-500 font-bold">*</span>
					) : (
						<span className="text-xs text-[var(--muted)] font-normal">(для аналитики)</span>
					)}
				</span>
				{requireAdvertisingSource && (
					<span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
						Обязательно по настройке клиники
					</span>
				)}
			</label>
			<select
				id="patient-create-advertising-source"
				value={advertisingSource}
				onChange={(e) => onAdvertisingSourceChange(e.target.value)}
				className={`create-patient-input ${error ? "border-rose-500" : ""}`}
				aria-invalid={!!error}
				data-testid="patient-create-advertising-source-select"
			>
				<option value="">— Выберите источник обращения —</option>
				<optgroup label="Онлайн-самозапись (Автоматические каналы)">
					{DENTAL_ADVERTISING_SOURCES.filter((s) => s.isOnlineSelfBooking).map((s) => (
						<option key={s.key} value={s.key}>
							{s.label}
						</option>
					))}
				</optgroup>
				<optgroup label="Администратор, Сарафан и Офлайн">
					{DENTAL_ADVERTISING_SOURCES.filter((s) => !s.isOnlineSelfBooking).map((s) => (
						<option key={s.key} value={s.key}>
							{s.label}
						</option>
					))}
				</optgroup>
			</select>
			{error && <span className="text-xs text-rose-500 font-semibold mt-1">{error}</span>}
		</div>
	);
}
