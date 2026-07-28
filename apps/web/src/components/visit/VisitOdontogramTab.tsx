import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { EgiszMonitor } from "../EgiszMonitor";
import { OdontogramModule } from "../odontogram/OdontogramModule";
import { VisitDiaryEditor } from "../VisitDiaryEditor";

export function VisitOdontogramTab(props?: { activePatient?: any; activeAppointment?: any; dashboard?: any }) {
	let ctx: any = null;
	try { ctx = useAppLogicContext(); } catch { /* rendered outside AppLogic provider: fall back to props */ }
	const activePatient = props?.activePatient ?? ctx?.activePatient;
	const activeAppointment = props?.activeAppointment ?? ctx?.activeAppointment;
	const dashboard = props?.dashboard ?? ctx?.dashboard;
	const workspaceFlags = useWorkspaceProfile();

	if (!activePatient?.id) {
		return (
			<div className="text-center py-12 px-6 text-slate-500 dark:text-slate-400">
				<div className="text-4xl mb-3">🦷</div>
				<h4 className="text-base font-semibold text-slate-900 dark:text-white">Пациент не выбран</h4>
				<p className="text-sm m-0">Выберите пациента, чтобы открыть одонтограмму.</p>
			</div>
		);
	}

	return (
		<div
			data-testid="visit-odontogram-tab"
			className="visit-odontogram-tab bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl p-4"
			style={{
				display: "flex",
				flexWrap: "wrap",
				gap: "24px",
				margin: "24px 0",
				width: "100%",
				maxWidth: "100%",
			}}
		>
			<div
				style={{
					flex: "1 1 45%",
					minWidth: "300px",
				}}
			>
				<OdontogramModule
					patientId={activePatient.id}
					pediatricMode={workspaceFlags.hasPediatricMode || (dashboard?.clinicSettings?.profile?.hasPediatricMode ?? false)}
				/>
			</div>
			<div
				style={{
					flex: "1 1 50%",
					minWidth: "300px",
				}}
			>
				{/*
					НАЖАТИЕ НА ВКЛАДКУ «ЗУБНАЯ ФОРМУЛА» РОНЯЛО ВЕСЬ РАЗДЕЛ «ПРИЁМ».
					Здесь стояло `visitId={activeAppointment.id}` без проверки, а
					проверка выше смотрит только на пациента. У клиники без приёмов
					activeAppointment равен undefined — «Cannot read properties of
					undefined (reading 'id')». Экран схлопывался вместе с кнопками
					вкладок: вернуться можно было только перезагрузкой страницы.

					Зубная карта приёма не требует — она принадлежит пациенту и
					показывается всегда. Дневник приёма и мониторинг ЕГИСЗ без
					приёма показывать нечего, поэтому вместо них честное объяснение.
				*/}
				{activeAppointment?.id ? (
					<>
						{/*
							КЛЮЧ ПО ПРИЁМУ — ЧТОБЫ ОКНО ПОДПИСАНИЯ НЕ ПЕРЕЕХАЛО НА ДРУГОГО
							ПАЦИЕНТА.

							БЫЛО: дневник приёма получал новые visitId/patientId без
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

							Ключ по идентификатору приёма монтирует дневник заново на новом
							приёме. Терять нечего: при смене visitId дневник и так читается с
							сервера с нуля, а внутри одного приёма ключ не меняется, поэтому
							набранный текст и автосохранение живут как раньше.
						*/}
						<VisitDiaryEditor
							key={activeAppointment.id}
							visitId={activeAppointment.id}
							patientId={activePatient.id}
						/>
						{workspaceFlags.hasEngineeringStatus && (
							<div style={{ marginTop: "16px" }}>
								<EgiszMonitor
									visitId={activeAppointment.id}
									patientId={activePatient.id}
								/>
							</div>
						)}
					</>
				) : (
					<div className="text-center py-10 px-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400">
						<div className="text-3xl mb-2">📝</div>
						<h4 className="text-base font-semibold text-slate-900 dark:text-white m-0">
							Дневник приёма появится, когда приём откроют
						</h4>
						<p className="text-sm m-0 mt-1">
							Зубную карту слева можно заполнять уже сейчас: она хранится у пациента.
							Дневник записывается в конкретный приём — запишите пациента и начните
							приём в разделе «Записи».
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
