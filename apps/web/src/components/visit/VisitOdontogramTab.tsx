import React, { useMemo } from "react";
import { calculateAge } from "@dental/shared";
import { FileText, Sparkles } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { EgiszMonitor } from "../EgiszMonitor";
import { OdontogramModule } from "../odontogram/OdontogramModule";
import { VisitDiarySection } from "./VisitDiarySection";
import { realVisitFieldId } from "./visitIdentity";

export interface VisitOdontogramTabPatient {
	id: string;
	fullName?: string | null | undefined;
	name?: string | null | undefined;
	birthDate?: string | null | undefined;
	[key: string]: unknown;
}

export interface VisitOdontogramTabAppointment {
	id?: string | null | undefined;
	[key: string]: unknown;
}

export interface VisitOdontogramTabDashboard {
	activeVisit?: {
		id?: string | null | undefined;
		appointmentId?: string | null | undefined;
		patientId?: string | null | undefined;
		[key: string]: unknown;
	} | null | undefined;
	clinicSettings?: {
		profile?: {
			hasPediatricMode?: boolean | undefined;
			[key: string]: unknown;
		} | undefined;
		[key: string]: unknown;
	} | undefined;
	[key: string]: unknown;
}

export interface VisitOdontogramTabProps {
	readonly activePatient?: VisitOdontogramTabPatient | null | undefined;
	readonly activeAppointment?: VisitOdontogramTabAppointment | null | undefined;
	readonly dashboard?: VisitOdontogramTabDashboard | null | undefined;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveValidVisitUuid(
	openVisitId: string | null,
	openVisitAppointmentId: string | null,
	appointmentId: string | null,
): string | null {
	if (!openVisitId || !UUID_REGEX.test(openVisitId)) {
		return null;
	}
	if (openVisitAppointmentId && appointmentId && openVisitAppointmentId !== appointmentId) {
		return null;
	}
	return openVisitId;
}

export const VisitOdontogramTab: React.FC<VisitOdontogramTabProps> = React.memo(function VisitOdontogramTab(props: VisitOdontogramTabProps = {}) {
	const ctx = useAppLogicContext();
	const activePatient = props?.activePatient ?? ctx?.activePatient;
	const activeAppointment = props?.activeAppointment ?? ctx?.activeAppointment;
	const dashboard = props?.dashboard ?? ctx?.dashboard;
	const workspaceFlags = useWorkspaceProfile();

	/*
	 * ПРИЁМ ≠ ВИЗИТ.
	 *
	 * БЫЛО: visitId={activeAppointment.id} — в VisitDiaryEditor и EgiszMonitor
	 * уходил UUID записи расписания (appointments.id). GET /api/diaries/visit/:id
	 * и CDA/EGISZ ждут visits.id. Дневник не находился (404/empty), подпись и
	 * экспорт CDA били в чужой или несуществующий ключ.
	 *
	 * СТАЛО: только открытый визит из dashboard.activeVisit, и только если он
	 * привязан к выбранному приёму (appointmentId === activeAppointment.id).
	 * Тот же realVisitFieldId, что VisitEmkTab — отсекает NIL_UUID гидратации.
	 */
	const activeVisit =
		dashboard?.activeVisit ?? ctx?.dashboard?.activeVisit ?? null;
	const openVisitId = realVisitFieldId(
		activeVisit && typeof activeVisit === "object"
			? (activeVisit as { id?: unknown }).id
			: null,
	);
	const openVisitAppointmentId = realVisitFieldId(
		activeVisit && typeof activeVisit === "object"
			? (activeVisit as { appointmentId?: unknown }).appointmentId
			: null,
	);
	const appointmentId = realVisitFieldId(activeAppointment?.id);

	// Mandate 8e: Doctor autonomy — diary requires real visit in PostgreSQL, never fake or appointment UUID
	const diaryVisitId = resolveValidVisitUuid(openVisitId, openVisitAppointmentId, appointmentId);
	const diaryPatientId =
		realVisitFieldId(
			activeVisit && typeof activeVisit === "object"
				? (activeVisit as { patientId?: unknown }).patientId
				: null,
		) ?? realVisitFieldId(activePatient?.id);

	const patientAge = useMemo(() => {
		return activePatient?.birthDate ? calculateAge(activePatient.birthDate) : null;
	}, [activePatient?.birthDate]);

	const dentitionPhaseBadge = useMemo(() => {
		if (patientAge === null) return null;
		if (patientAge < 6) {
			return {
				label: "Молочные зубы (временный прикус)",
				hint: `Возраст пациента: ${patientAge} лет • Нотация FDI 51–85`,
			};
		}
		if (patientAge >= 6 && patientAge < 12) {
			return {
				label: "Сменный прикус (6–12 лет)",
				hint: `Возраст пациента: ${patientAge} лет • Сосуществование молочных и постоянных зубов`,
			};
		}
		return {
			label: "Постоянные зубы",
			hint: `Возраст пациента: ${patientAge} лет • Постоянный прикус (FDI 11–48)`,
		};
	}, [patientAge]);

	const smartDentitionMode = useMemo<"adult" | "pediatric" | "mixed">(() => {
		if (patientAge === null) return "adult";
		if (patientAge < 6) return "pediatric";
		if (patientAge < 12) return "mixed";
		return "adult";
	}, [patientAge]);

	const isPediatric = useMemo(() => {
		return smartDentitionMode !== "adult";
	}, [smartDentitionMode]);

	if (!activePatient?.id) {
		return (
			<div className="text-center py-12 px-6 text-slate-500 dark:text-slate-400">
				<Sparkles className="w-8 h-8 text-teal-400 opacity-40 mx-auto mb-2" />
				<h4 className="text-base font-semibold text-slate-900 dark:text-white">
					Пациент не выбран
				</h4>
				<p className="text-sm m-0">
					Выберите пациента, чтобы открыть зубную формулу приёма.
				</p>
			</div>
		);
	}

	return (
		<div
			data-testid="visit-odontogram-tab"
			className="visit-odontogram-tab flex flex-col gap-2 w-full max-w-full my-0 p-0"
		>
			{/* Dentition Status Banner if child or mixed */}
			{dentitionPhaseBadge && smartDentitionMode !== "adult" && (
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 px-3 py-1.5 rounded-lg bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/40 text-xs">
					<div className="flex items-center gap-2">
						<span className="font-bold text-teal-900 dark:text-teal-200">
							Зубная формула:
						</span>
						<span className="font-semibold text-teal-700 dark:text-teal-300">
							{dentitionPhaseBadge.label}
						</span>
					</div>
					<span className="text-slate-500 dark:text-slate-400 text-[11px] leading-tight">
						{dentitionPhaseBadge.hint}
					</span>
				</div>
			)}

			{/* Top Full-Width Section: Odontogram & Treatment Planning */}
			<div className="w-full">
				<OdontogramModule
					patientId={activePatient.id}
					pediatricMode={isPediatric}
					dentitionMode={smartDentitionMode}
				/>
			</div>

			{/* Bottom Section: Visit Diary & Clinical Documentation */}
			<div className="w-full">
				{diaryVisitId && diaryPatientId ? (
					<>
						{/*
							КЛЮЧ ПО ВИЗИТУ — ЧТОБЫ ОКНО ПОДПИСАНИЯ НЕ ПЕРЕЕХАЛО НА ДРУГОГО
							ПАЦИЕНТА.

							БЫЛО: дневник приёма получал appointment.id как visitId без
							перемонтирования (вкладка «Зубная формула» сознательно не
							размонтируется, чтобы не терять набранный текст, — см. VisitView).
							Сам дневник свои поля при смене приёма сбрасывает
							(useVisitDiaryLogic), а вот окно подписания внутри него — нет:
							components/visit/CryptoProSigner.tsx держит в своём состоянии
							открытое окно, введённый ПИН-код, выбранный сертификат и текст
							прошлой ошибки. Врач открывал подписание пациенту А, вводил ПИН,
							отвлекался, переходил к пациенту Б — окно оставалось открытым и
							заряженным, а подписывало уже дневник пациента Б. Одно нажатие
							ставило подпись под записью не того человека, и снять её нельзя:
							правка подписанного идёт только ревизией.

							Ключ по visits.id монтирует дневник заново на новом визите.
							Терять нечего: при смене visitId дневник и так читается с
							сервера с нуля, а внутри одного визита ключ не меняется, поэтому
							набранный текст и автосохранение живут как раньше.
						*/}
						<VisitDiarySection
							key={diaryVisitId}
							visitId={diaryVisitId}
							patientId={diaryPatientId}
						/>
						{workspaceFlags.hasEngineeringStatus && (
							<div style={{ marginTop: "16px" }}>
								<EgiszMonitor
									visitId={diaryVisitId}
									patientId={diaryPatientId}
								/>
							</div>
						)}
					</>
				) : (
					<div className="text-center py-10 px-6 rounded-2xl border border-dashed border-[var(--odontogram-border,#cbd5e1)] bg-[var(--odontogram-surface,#f8fafc)] text-[var(--odontogram-ink-muted,#64748b)]">
						<FileText className="w-8 h-8 text-teal-400 opacity-40 mx-auto mb-2" />
						<h4 className="text-base font-bold text-[var(--odontogram-ink,#0f172a)] m-0">
							{appointmentId
								? "Дневник приёма появится, когда визит откроют"
								: "Дневник приёма появится, когда приём откроют"}
						</h4>
						<p className="text-sm m-0 mt-1">
							Зубную формулу выше можно заполнять уже сейчас: она хранится у
							пациента.
							{appointmentId
								? " Дневник и электронная карта привязаны к открытому визиту — начните приём в разделе «Записи», чтобы появилась запись в медицинской карте."
								: " Дневник записывается в конкретный приём — запишите пациента и начните приём в разделе «Записи»."}
						</p>
					</div>
				)}
			</div>
		</div>
	);
});
VisitOdontogramTab.displayName = "VisitOdontogramTab";
