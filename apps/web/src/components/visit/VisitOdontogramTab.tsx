import React, { useMemo } from "react";
import { calculateAge } from "@dental/shared";
import { FileText, Sparkles } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { EgiszMonitor } from "../EgiszMonitor";
import { OdontogramModule } from "../odontogram/OdontogramModule";
import { VisitDiarySection } from "./VisitDiarySection";
import { realVisitFieldId } from "./visitIdentity";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";

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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveValidVisitUuid(
	openVisitId: string | null,
	appointmentId: string | null,
	patientId: string | null | undefined,
): string | null {
	if (openVisitId && UUID_REGEX.test(openVisitId)) {
		return openVisitId;
	}
	if (appointmentId && UUID_REGEX.test(appointmentId)) {
		return appointmentId;
	}
	if (!patientId) return null;
	const cacheKey = `dente_draft_visit_uuid_${patientId}`;
	try {
		const cached = safeLocalStorageGetItem(cacheKey);
		if (cached && UUID_REGEX.test(cached)) {
			return cached;
		}
		const generated =
			typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
				? crypto.randomUUID()
				: "00000000-0000-4000-8000-000000000001";
		safeLocalStorageSetItem(cacheKey, generated);
		return generated;
	} catch {
		return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
			? crypto.randomUUID()
			: "00000000-0000-4000-8000-000000000001";
	}
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

	// Mandate 8e: Doctor autonomy — diary is never blocked for active patient
	// Fastify API requires a valid UUID (z.string().uuid()). Never prepend pseudo-prefixes like `visit-` or `draft-visit-`.
	const diaryVisitId = resolveValidVisitUuid(openVisitId, appointmentId, activePatient?.id);
	const diaryPatientId =
		realVisitFieldId(
			activeVisit && typeof activeVisit === "object"
				? (activeVisit as { patientId?: unknown }).patientId
				: null,
		) ?? realVisitFieldId(activePatient?.id);

	const isPediatric = useMemo(() => {
		return (
			(activePatient?.birthDate ? (calculateAge(activePatient.birthDate) ?? 99) < 12 : false) ||
			Boolean(workspaceFlags.hasPediatricMode) ||
			Boolean(dashboard?.clinicSettings?.profile?.hasPediatricMode)
		);
	}, [activePatient?.birthDate, workspaceFlags.hasPediatricMode, dashboard?.clinicSettings?.profile?.hasPediatricMode]);

	if (!activePatient?.id) {
		return (
			<div className="text-center py-12 px-6 text-slate-500 dark:text-slate-400">
				<Sparkles className="w-8 h-8 text-teal-400 opacity-40 mx-auto mb-2" />
				<h4 className="text-base font-semibold text-slate-900 dark:text-white">
					Пациент не выбран
				</h4>
				<p className="text-sm m-0">
					Выберите пациента, чтобы открыть одонтограмму.
				</p>
			</div>
		);
	}

	return (
		<div
			data-testid="visit-odontogram-tab"
			className="visit-odontogram-tab flex flex-col gap-2 w-full max-w-full my-0 p-0"
		>
			{/* Top Full-Width Section: Odontogram & Treatment Planning */}
			<div className="w-full">
				<OdontogramModule
					patientId={activePatient.id}
					pediatricMode={isPediatric}
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
							Зубную карту выше можно заполнять уже сейчас: она хранится у
							пациента.
							{appointmentId
								? " Дневник и ЕГИСЗ привязаны к открытому визиту — начните приём в разделе «Записи», чтобы появилась запись 043/у."
								: " Дневник записывается в конкретный приём — запишите пациента и начните приём в разделе «Записи»."}
						</p>
					</div>
				)}
			</div>
		</div>
	);
});
VisitOdontogramTab.displayName = "VisitOdontogramTab";
