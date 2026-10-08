import type { Dashboard, Patient } from "@dental/shared";
import { AlertTriangle, Ban, Plus } from "lucide-react";
import React from "react";
import type { BlacklistStatus } from "./types";

export interface PatientSearchStepProps {
	dashboard: Dashboard;
	// biome-ignore lint/suspicious/noExplicitAny: draft payload
	newAppointmentDraft: Record<string, any>;
	// biome-ignore lint/suspicious/noExplicitAny: draft updater
	updateNewAppointmentDraft: (key: any, value: any) => void;
	patientSearchQuery: string;
	setPatientSearchQuery: (val: string) => void;
	filteredPatients: Patient[];
	useManualSelects: boolean;
	blacklistStatus: BlacklistStatus | null;
	handleQuickCreatePatientFromQuery: () => Promise<void>;
}

export function PatientSearchStep(props: PatientSearchStepProps) {
	const {
		dashboard,
		newAppointmentDraft,
		updateNewAppointmentDraft,
		patientSearchQuery,
		setPatientSearchQuery,
		filteredPatients,
		useManualSelects,
		blacklistStatus,
		handleQuickCreatePatientFromQuery,
	} = props;

	return (
		<div>
			<div className="flex items-center justify-between mb-1.5">
				<span className="text-xs font-semibold text-[var(--muted)]">
					Пациент (ФИО / Телефон / Д.Р.)
				</span>
				{(dashboard.patients ?? []).length > 6 && (
					<span className="text-xs font-mono text-[var(--muted)]">
						Найдено: {filteredPatients.length}
					</span>
				)}
			</div>

			<div className="mb-2 flex items-center gap-2">
				<input
					type="text"
					data-testid="new-appointment-patient-input"
					value={patientSearchQuery}
					onChange={(e) => setPatientSearchQuery(e.target.value)}
					placeholder="Поиск пациента или ввод ФИО/телефона нового..."
					className="w-full px-2.5 py-1.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs outline-none focus:ring-2 focus:ring-[var(--teal)]"
				/>
				{patientSearchQuery.trim() && (
					<button
						type="button"
						onClick={() => void handleQuickCreatePatientFromQuery()}
						className="shrink-0 min-h-[44px] px-3 py-1.5 rounded-xl bg-[var(--teal)] text-[var(--on-teal,white)] text-xs font-bold hover:bg-[var(--teal-dark)] transition-colors cursor-pointer flex items-center gap-1"
						title="Создать карту пациента на лету"
						data-testid="btn-new-appointment-quick-create-patient"
					>
						<Plus size={14} />
						<span>+ Пациент</span>
					</button>
				)}
			</div>

			{filteredPatients.length === 0 && (
				<div className="p-3 mb-2 rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper-soft)] text-center space-y-2">
					<p className="text-xs text-[var(--muted)] m-0">
						{patientSearchQuery.trim()
							? `Пациент «${patientSearchQuery.trim()}» не найден в картотеке`
							: "В базе клиники пока нет пациентов"}
					</p>
					<button
						type="button"
						onClick={() => void handleQuickCreatePatientFromQuery()}
						className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg bg-[var(--teal)] text-[var(--on-teal,white)] text-xs font-bold hover:bg-[var(--teal-dark)] transition-colors cursor-pointer"
						data-testid="btn-create-first-patient"
					>
						<Plus size={14} />
						<span>Создать «{patientSearchQuery.trim() || "Новый пациент"}» и записать</span>
					</button>
				</div>
			)}

			{useManualSelects || (dashboard.patients ?? []).length > 20 ? (
				<select
					value={newAppointmentDraft.patientId || ""}
					onChange={(e) =>
						updateNewAppointmentDraft("patientId", e.target.value)
					}
					className="w-full p-2 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
				>
					<option value="">-- Выберите пациента --</option>
					{filteredPatients.map((p) => (
						<option key={p.id} value={p.id}>
							{p.fullName} {p.phone ? `(${p.phone})` : ""} {p.birthDate ? `· ${p.birthDate}` : ""}
						</option>
					))}
				</select>
			) : (
				<div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
					{filteredPatients.map((patient) => (
						<button
							key={patient.id}
							type="button"
							className={`quick-chip ${newAppointmentDraft.patientId === patient.id ? "active" : ""}`}
							onClick={() =>
								updateNewAppointmentDraft("patientId", patient.id)
							}
							title={`${patient.fullName}${patient.phone ? ` · Тел: ${patient.phone}` : ""}${patient.birthDate ? ` · Д.Р.: ${patient.birthDate}` : ""}`}
						>
							<span>{patient.fullName}</span>
							{patient.phone && (
								<span className="text-xs opacity-70 font-mono ml-1">
									{patient.phone.slice(-4)}
								</span>
							)}
						</button>
					))}
				</div>
			)}
			{blacklistStatus?.isBlocked ? (
				<div
					className="mt-2 p-2 bg-red-500/10 border border-red-500/40 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold flex items-center gap-1.5"
					role="alert"
				>
					<Ban size={14} className="shrink-0 text-red-600 dark:text-red-400" />
					<span>
						<strong>ЧЁРНЫЙ СПИСОК:</strong>{" "}
						{blacklistStatus.reason ||
							"Пациент внесён в чёрный список (запись ограничена)"}
					</span>
				</div>
			) : blacklistStatus?.checkFailed ? (
				<div
					className="mt-2 p-2 bg-amber-500/10 border border-amber-500/40 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-semibold flex items-center gap-1.5"
					role="alert"
				>
					<AlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
					<span>
						{blacklistStatus.reason ||
							"Не удалось проверить статус пациента в чёрном списке"}
					</span>
				</div>
			) : null}
		</div>
	);
}
