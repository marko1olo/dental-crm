import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { usePatientStore } from "../../store/patientStore";
import { VisiographAnalyzer } from "../imaging/VisiographAnalyzer";
import { LabOrdersPanel } from "../schedule/LabOrdersPanel";
import { imagingWriteTarget, realVisitFieldId } from "./visitIdentity";

/*
  СНИМОК И ЗАКЛЮЧЕНИЕ МОГЛИ ЛЕЧЬ В КАРТУ ДРУГОГО ПАЦИЕНТА, И ЭКРАН ОБ ЭТОМ
  МОЛЧАЛ.

  На этой вкладке стоят две панели, привязанные к РАЗНЫМ пациентам:
    • разбор снимка (components/imaging/VisiographAnalyzer.tsx) пишет снимок,
      текст заключения и найденные ИИ состояния зубов в карту
      patientStore.selectedPatientId — то есть того, кто открыт в разделе
      «Пациенты». Пропсов он не принимает и пациента приёма не знает;
    • наряды в лабораторию получают идентификатор пациента приёма пропсом.

  Выбор в разделе «Пациенты» переживает уход из своего раздела, приём его не
  сбрасывает, а PatientsView вдобавок сам переставляет выбор на первую строку
  отфильтрованного списка. Врач заглянул перед приёмом в карточку другого
  человека — и снимок пациента приёма ушёл в чужую карту: и файл, и заключение,
  и отметки зубов. На экране при этом ни слова о том, чья это карта.

  ТЕПЕРЬ вкладка называет карту вслух и, когда карта чужая, предупреждает ДО
  загрузки снимка и даёт исправить выбор одной кнопкой — той же операцией, какой
  приложение выбирает пациента при быстром приёме.

  ДОЛГ ВЕДУЩЕМУ (за пределами вкладки): правильное лечение — принимать
  идентификатор пациента пропсом в VisiographAnalyzer, как это делает
  LabOrdersPanel, и передавать ему пациента приёма. Тогда расхождение станет
  невозможным, а не объяснённым. Файл components/imaging/VisiographAnalyzer.tsx
  в эту территорию не входит.
*/
export function VisitDiagnosticsTab(props?: { activePatient?: any }) {
	const ctx = useAppLogicContext();
	const activePatient = props?.activePatient ?? ctx?.activePatient;
	const workspaceFlags = useWorkspaceProfile();

	const selectedPatientId = usePatientStore((state) => state.selectedPatientId);
	const setSelectedPatientId = usePatientStore(
		(state) => state.setSelectedPatientId,
	);

	const dashboard = ctx?.dashboard;
	const visitPatientId = realVisitFieldId(dashboard?.activeVisit?.patientId);
	const patients: any[] = Array.isArray(dashboard?.patients)
		? dashboard.patients
		: [];
	const nameOf = (patientId: string | null): string | null => {
		if (!patientId) return null;
		const found = patients.find((patient) => patient?.id === patientId);
		const fullName =
			typeof found?.fullName === "string" ? found.fullName.trim() : "";
		return fullName || null;
	};
	const visitPatientName =
		nameOf(visitPatientId) ??
		(typeof activePatient?.fullName === "string"
			? activePatient.fullName
			: null);
	const selectedPatientName = nameOf(realVisitFieldId(selectedPatientId));

	const target = imagingWriteTarget(selectedPatientId, visitPatientId);

	return (
		<div
			data-testid="visit-diagnostics-tab"
			className="visit-diagnostics-tab bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-4 flex flex-col gap-6"
		>
			{target === "another-patient" ? (
				<div
					role="alert"
					aria-live="assertive"
					data-testid="visit-imaging-target-warning"
					className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-sm text-rose-900 dark:text-rose-200"
				>
					<strong className="block mb-1">
						Снимок сохранится в карту другого пациента
					</strong>
					<p className="m-0">
						Приём идёт у {visitPatientName ?? "пациента этого приёма"}, а
						открыта карта {selectedPatientName ?? "другого пациента"}. Снимок,
						заключение и отметки зубов лягут в открытую карту — не в карту
						приёма. Нажмите кнопку ниже, прежде чем загружать снимок.
					</p>
					<button
						type="button"
						onClick={() =>
							visitPatientId && setSelectedPatientId(visitPatientId)
						}
						className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors"
					>
						Писать в карту {visitPatientName ?? "пациента приёма"}
					</button>
				</div>
			) : null}

			{target === "nobody" ? (
				<div
					role="status"
					aria-live="polite"
					className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900/60 text-sm text-amber-900 dark:text-amber-200"
				>
					<strong className="block mb-1">Карта пациента не открыта</strong>
					<p className="m-0">
						Снимок разберётся и заключение вы увидите, но в карту оно НЕ попадёт
						и после перезагрузки страницы потеряется. Откройте карту пациента
						приёма кнопкой ниже, и только потом загружайте снимок.
					</p>
					<button
						type="button"
						onClick={() =>
							visitPatientId && setSelectedPatientId(visitPatientId)
						}
						className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors"
					>
						Открыть карту {visitPatientName ?? "пациента приёма"}
					</button>
				</div>
			) : null}

			{target === "visit-patient" ? (
				<p
					className="m-0 text-xs text-slate-500 dark:text-slate-400"
					data-testid="visit-imaging-target-ok"
				>
					Снимок и заключение сохранятся в карту{" "}
					{visitPatientName ?? "пациента приёма"}.
				</p>
			) : null}

			{target === "no-visit" ? (
				<div
					role="status"
					aria-live="polite"
					className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300"
				>
					<strong className="block mb-1 text-slate-900 dark:text-white">
						Приём не открыт
					</strong>
					<p className="m-0">
						{selectedPatientName
							? `Снимок и заключение сохранятся в открытую карту — ${selectedPatientName}. Проверьте, что это нужный человек: приём сейчас ни на кого не открыт.`
							: "Карта пациента тоже не открыта, поэтому заключение никуда не сохранится. Откройте карту пациента в разделе «Пациенты» или начните приём в разделе «Записи»."}
					</p>
				</div>
			) : null}

			<VisiographAnalyzer />

			{/*
				Наряды в лабораторию читаются по пациенту приёма. Без пациента панель
				не показываем: она запрашивала бы наряды в пустоту — но и молчать об
				этом нельзя, иначе отсутствие панели читается как «нарядов нет».
			*/}
			{workspaceFlags.hasDentalLab ? (
				activePatient?.id ? (
					<LabOrdersPanel patientId={activePatient.id} />
				) : (
					<div
						role="status"
						aria-live="polite"
						className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300"
					>
						<strong className="block mb-1 text-slate-900 dark:text-white">
							Наряды в лабораторию пока не показать
						</strong>
						Пациент не выбран, а наряды читаются по конкретному человеку.
						Выберите пациента в разделе «Пациенты» или начните приём — список
						появится здесь.
					</div>
				)
			) : null}
		</div>
	);
}
