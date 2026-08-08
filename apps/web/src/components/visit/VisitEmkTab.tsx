import { Check, Download, FileCode, ScanLine, ShieldCheck } from "lucide-react";
import React from "react";
import { visitDraftQualityLabels } from "../../AppConstants";
import {
	visitDraftMissingFieldLabel,
	visitDraftSignalLabel,
	visitNoteFormFromVisit,
	visitSaveReceiptText,
} from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { actionFailureToast } from "../../lib/panelStateText";
import { countLabel } from "../../lib/russianPlural";
import { useVisitStore } from "../../store/visitStore";
import { logger } from "../../utils/logger";
import { specialtyLabels } from "../../workspaceUiLabels";
import { showToast } from "../GlobalToast";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";
import { CompletedServicesChecklist } from "./CompletedServicesChecklist";
import { EgiszMultipleDiagnosesWidget } from "./EgiszMultipleDiagnosesWidget";
import { VisitFlowProgress } from "./VisitFlowProgress";
import {
	forgetVisitFlowResultOwner,
	rememberVisitFlowResultOwner,
	visitFlowOwnerKey,
	visitFlowResultIsForeign,
	visitSaveReceiptBelongsToVisit,
} from "./visitFlowResultOwner";
import {
	commitNoteFormVisit,
	peekNoteFormForeignVisit,
	realVisitFieldId,
} from "./visitIdentity";

/**
 * Дописывает текст к содержимому поля ЭМК так, как это сделал бы врач руками.
 *
 * БЫЛО: разделитель выбирался по `!curr.endsWith(" ")`. Из-за этого текст,
 * заканчивающийся пробелом (а диктовка почти всегда так и заканчивается),
 * склеивался без запятой — «Жалоб нет Острая боль», — а текст, заканчивающийся
 * запятой, получал вторую: «Острая боль, , Коффердам». Смотрим на последний
 * ЗНАЧИМЫЙ символ, а не на пробел.
 */
function appendClinicalText(
	current: string,
	addition: string,
	separator: string,
): string {
	const base = current.replace(/\s+$/, "");
	if (!base) return addition;
	if (/[,;.:-]$/.test(base)) return `${base} ${addition}`;
	return `${base}${separator}${addition}`;
}

export function VisitEmkTab() {
	// `|| {}` убран: useAppLogicContext() либо отдаёт контекст, либо бросает
	// исключение (contexts/AppLogicContext.tsx) — пустой объект он больше не
	// выдумывает, и вторая ветка была недостижима.
	const appLogic = useAppLogicContext() as any;
	const {
		visitNoteForm = {},
		updateVisitNoteField,
		isVisitNoteDirty,
		pendingVisitSaveCount,
		lastVisitSaveReceipt,
		dashboard,
		flushPendingVisitSaves,
		isPendingVisitSyncing,
		acceptDraftToVisit,
		visitNoteReadyToAccept,
		isDraftAccepting,
		visitNoteActionLabel,
		visitNoteStatusLabel,
		visitNoteFieldDefinitions = [],
		visitNoteAcceptMissingSteps,
		activePatient,
	} = appLogic;

	/*
	 * БЫЛО: activeEmkTab и setActiveEmkTab брались из useAppLogicContext, а таких
	 * полей в контексте нет вообще (проверено: во всём useAppLogic.tsx этих имён
	 * не существует). Последствия на экране «Прием», вкладка «ЭМК и Диктовка» —
	 * та, что открыта по умолчанию:
	 *   • activeEmkTab === undefined, поэтому сравнение с "all" ложно, а
	 *     фильтр `f.key === undefined` не пропускал НИ ОДНОГО поля: панель
	 *     «ЭМК после диктовки» показывала шапку, полоску вкладок и ничего
	 *     больше. Ни жалоб, ни анамнеза, ни диагноза — записывать приём было
	 *     физически некуда;
	 *   • setActiveEmkTab === undefined, поэтому все шесть кнопок вкладок были
	 *     кнопками-пустышками: клик молча падал с TypeError в консоль.
	 * Состояние вкладки — локальное дело этой панели, в общий контекст его
	 * выносить незачем: держим его здесь.
	 */
	const [activeEmkTab, setActiveEmkTab] = React.useState<string>("all");

	const noteForm = visitNoteForm;
	/*
	 * БЫЛО: appLogic.visitDraft. Черновик лежит в контексте под именем `draft`
	 * (useAppLogic.tsx возвращает именно его), а `visitDraft` не существует.
	 * Из-за опечатки панель никогда не признавала, что черновик собран: шапка
	 * говорила «Структура приема» вместо «Проверьте черновик», блок качества
	 * разбора не показывался, а предупреждения нейро-черновика («проверьте
	 * диагноз», «зуб не указан») не доходили до врача вовсе.
	 */
	const draft = appLogic.draft ?? null;
	/*
	 * БЫЛО: visitFlowResult из контекста, которого там нет — useAppLogic даже не
	 * забирает это поле из useVisitLogic. Панель «Ассистент обработки приема» не
	 * показывалась НИ РАЗУ, хотя сборка нейро-черновика её результат заполняет.
	 * Читаем прямо из хранилища визита — это и есть источник, куда пишет
	 * buildDraft.
	 */
	const visitFlowResult = useVisitStore((state) => state.visitFlowResult);
	const setVisitFlowResult = useVisitStore((state) => state.setVisitFlowResult);

	/*
	 * РАЗБОР ПРЕДЫДУЩЕГО ПАЦИЕНТА БОЛЬШЕ НЕ ВИСИТ НА ЭКРАНЕ ТЕКУЩЕГО.
	 *
	 * visitFlowResult лежит в общем хранилище визита и записывается один раз —
	 * после удачного ответа /api/ai/visit-flow. Обнулять его не умеет НИКТО:
	 * сохранение записи приёма делает setDraft(null) и этого поля не касается,
	 * смена пациента и смена приёма его тоже не трогают. Врач разбирал приём
	 * пациента А, начинал приём пациента Б — и под шапкой ЭМК оставалась панель
	 * «Ассистент обработки приема» с диагнозом ДЛЯ ПАЦИЕНТА, рекомендациями после
	 * процедуры и предложенными документами пациента А. У кресла это читается как
	 * разбор текущего человека.
	 *
	 * Сам ответ сервера пациента не называет (visitFlowResultSchema — четыре шага
	 * и общий статус), поэтому владельца запоминаем на клиенте, вне компонента:
	 * вкладка «ЭМК и Диктовка» размонтируется при уходе на «Зубную формулу», и
	 * привязка в useRef исчезла бы вместе с ней.
	 */
	const visitOwnerKey = visitFlowOwnerKey(
		activePatient?.id,
		dashboard?.activeVisit?.id,
	);
	const visitFlowResultIsOfAnotherVisit = visitFlowResultIsForeign(
		visitFlowResult,
		visitOwnerKey,
	);

	React.useEffect(() => {
		if (!visitFlowResult) return;
		if (visitFlowResultIsOfAnotherVisit) {
			// Чужой разбор убираем из хранилища, иначе он вернётся на экран при
			// следующем переключении вкладок приёма.
			forgetVisitFlowResultOwner();
			setVisitFlowResult(null);
			return;
		}
		rememberVisitFlowResultOwner(visitFlowResult, visitOwnerKey);
	}, [
		visitFlowResult,
		visitOwnerKey,
		visitFlowResultIsOfAnotherVisit,
		setVisitFlowResult,
	]);

	const [isExportingCda, setIsExportingCda] = React.useState(false);
	const [trayBarcode, setTrayBarcode] = React.useState("");
	const [linkedBarcode, setLinkedBarcode] = React.useState<string | null>(null);
	const [isLinkingTray, setIsLinkingTray] = React.useState(false);

	const handleDownloadCdaXml = async () => {
		const visitId = realVisitFieldId(dashboard?.activeVisit?.id);
		if (!visitId) {
			showToast(
				"Сначала выберите или откройте активный визит для экспорта CDA R2",
				"warning",
			);
			return;
		}
		if (isExportingCda) return;
		setIsExportingCda(true);
		try {
			const headers = appLogic.auth?.denteClinicalReadHeaders?.() ?? {};
			const res = await fetch(`/api/egisz/visits/${visitId}/cda`, { headers });
			if (!res.ok) {
				const errJson = await res.json().catch((err: any) => {
					logger.error(err);
					showToast(
						actionFailureToast(
							"Ошибка чтения ответа",
							(err as { status?: number })?.status ?? null,
						),
						"error",
					);
					return null;
				});
				showToast(
					`Ошибка экспорта CDA R2: ${errJson?.message || errJson?.error || res.statusText}`,
					"error",
				);
				return;
			}
			const xmlText = await res.text();
			const blob = new Blob([xmlText], { type: "application/xml" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `cda_visit_${visitId.slice(0, 8)}.xml`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			showToast("Документ CDA R2 (XML) успешно скачан", "success");
		} catch (err: any) {
			showToast(
				`Не удалось скачать CDA R2: ${err?.message || "Ошибка сети"}`,
				"error",
			);
		} finally {
			setIsExportingCda(false);
		}
	};

	const handleLinkSterilizationTray = async (e: React.FormEvent) => {
		e.preventDefault();
		const visitId = realVisitFieldId(dashboard?.activeVisit?.id);
		if (!visitId) {
			showToast(
				"Сначала выберите или откройте активный визит для привязки лотка",
				"warning",
			);
			return;
		}
		if (!trayBarcode.trim()) {
			showToast("Укажите штрихкод простерилизованного лотка", "warning");
			return;
		}
		if (isLinkingTray) return;
		setIsLinkingTray(true);
		try {
			/*
			 * POST /api/sterilization/link — klinicheskaya mutaciya visit_diaries.
			 * BYLO: denteClinicalReadHeaders (read-secret). Pri requireClinicalMutation
			 * na API read-secret ne prohodit mutation gate → 403 u zakazchika.
			 * STALO: denteClinicalMutationHeaders, kak diary draft/lock.
			 */
			const headers = appLogic.auth?.denteClinicalMutationHeaders?.({
				"Content-Type": "application/json",
			}) ?? { "Content-Type": "application/json" };
			const res = await fetch("/api/sterilization/link", {
				method: "POST",
				headers,
				body: JSON.stringify({ visitId, barcode: trayBarcode.trim() }),
			});
			if (!res.ok) {
				const errData = await res.json().catch((err: any) => {
					logger.error(err);
					showToast(
						actionFailureToast(
							"Ошибка чтения ответа",
							(err as { status?: number })?.status ?? null,
						),
						"error",
					);
					return null;
				});
				showToast(
					errData?.message ||
						errData?.error ||
						"Лоток не прошёл стерилизацию или не найден в журнале",
					"error",
				);
				return;
			}
			setLinkedBarcode(trayBarcode.trim());
			setTrayBarcode("");
			showToast(
				`Лоток ${trayBarcode.trim()} успешно привязан к дневнику приема`,
				"success",
			);
		} catch (err: any) {
			showToast(
				`Ошибка привязки лотка: ${err?.message || "Ошибка сети"}`,
				"error",
			);
		} finally {
			setIsLinkingTray(false);
		}
	};

	const emkTabs = [
		{ id: "all", label: "Все поля" },
		{ id: "complaint", label: "Жалобы" },
		{ id: "anamnesis", label: "Анамнез" },
		{ id: "objectiveStatus", label: "Объективно" },
		{ id: "diagnosis", label: "Диагноз" },
		{ id: "treatmentPlan", label: "Лечение" },
	];

	const allFields = Array.isArray(visitNoteFieldDefinitions)
		? visitNoteFieldDefinitions
		: [];
	const visibleFields =
		activeEmkTab === "all"
			? allFields
			: allFields.filter((f: any) => f.key === activeEmkTab);
	/*
	 * Поля приходят из контекста. Если их нет (карта приёма ещё не загрузилась
	 * или загрузка не удалась), врач должен видеть причину, а не молча пустое
	 * место: пустой экран и отказ сервера выглядят одинаково, и врач начинает
	 * искать, куда пропала запись.
	 */
	const fieldsUnavailable = allFields.length === 0;

	/*
	 * БЫЛО: под щитом печаталось `(draft.warnings ?? []).join(" ")`. Когда разбор
	 * возвращает черновик без предупреждений, это пустая строка: врач видел
	 * иконку и пустое место рядом — панель молчала о том, собран ли черновик и
	 * что делать дальше. Ровно этот же дефект уже правили у последней ветки
	 * (пустой doctorSummary), а у первой он остался.
	 */
	const draftWarningsText = (draft?.warnings ?? [])
		.filter(
			(warning: unknown): warning is string =>
				typeof warning === "string" && warning.trim().length > 0,
		)
		.join(" ");
	const draftNoteText =
		draftWarningsText ||
		"Нейро-черновик собран, замечаний к нему нет. Проверьте поля выше и сохраните запись приёма.";

	/*
	 * Сколько записей ждут отправки — счётное слово склоняется общим countLabel,
	 * иначе выходит «1 записей». Раньше строка не называла ни числа, ни того, что
	 * записи уже целы: врач читал «серверная синхронизация ожидает» и не понимал,
	 * потеряна работа или нет.
	 */
	const pendingSavesText = `Ждут отправки на сервер клиники: ${countLabel(Number(pendingVisitSaveCount) || 0, "запись приёма", "записи приёма", "записей приёма")}. Всё сохранено на этом компьютере, ничего не потеряно — как только связь появится, отправка пойдёт сама. Ждать не обязательно: нажмите «Отправить сейчас».`;

	/*
	 * РАСПИСКА О СОХРАНЕНИИ — ТОЛЬКО ОТ ЭТОГО ПРИЁМА.
	 *
	 * БЫЛО: печаталась последняя расписка, какая была в хранилище. А она пишется
	 * один раз (после удачного /draft/accept) и не обнуляется ничем. Врач
	 * сохранял приём пациента А, открывал ПУСТУЮ запись пациента Б — и читал
	 * «Сервер подтвердил сохранение 14:32, версия карты 3». Пустая запись
	 * отчитывалась как сохранённая, чужим временем и чужой версией карты, а
	 * настоящая подсказка «Запись приёма пока пустая. Продиктуйте или впишите
	 * жалобы…» до врача не доходила: она стоит последней в той же цепочке.
	 *
	 * Расписка несёт visitId — сверяем с открытым приёмом. Чужую не показываем и
	 * не выбрасываем: вернётся врач к тому приёму — расписка снова на месте.
	 */
	const saveReceiptOfThisVisit = visitSaveReceiptBelongsToVisit(
		lastVisitSaveReceipt,
		dashboard?.activeVisit?.id,
	)
		? lastVisitSaveReceipt
		: null;

	/*
	 * НЕЗАПИСАННЫЙ ТЕКСТ ПРЕДЫДУЩЕГО ПРИЁМА БОЛЬШЕ НЕ УХОДИТ В ЧУЖУЮ КАРТУ.
	 *
	 * Форма записи приёма лежит в общем хранилище визита и при смене приёма НЕ
	 * перечитывается: во всём дереве нет ни одного места, где visitNoteForm
	 * заново собиралась бы из нового dashboard.activeVisit. Врач набрал жалобы,
	 * осмотр и диагноз пациента А, не сохранил, открылся приём пациента Б — поля
	 * остались с текстом А, признак «есть правки» стал истинным, панель показала
	 * «Проверьте правки» и кнопку «Сохранить». Одно нажатие писало жалобы и
	 * диагноз пациента А в медицинскую карту пациента Б.
	 *
	 * Признак «есть правки» сам по себе не отличает это от честной правки
	 * текущего приёма, поэтому память о том, к какому приёму относится текст,
	 * держится в visitIdentity.ts — вне компонента, потому что вкладка
	 * размонтируется при уходе на «Зубную формулу».
	 */
	const openVisitId = realVisitFieldId(dashboard?.activeVisit?.id);
	const noteTextOfAnotherVisit = peekNoteFormForeignVisit(
		openVisitId,
		Boolean(isVisitNoteDirty),
	);

	React.useEffect(() => {
		commitNoteFormVisit(openVisitId, Boolean(isVisitNoteDirty));
	}, [openVisitId, isVisitNoteDirty]);

	const setVisitNoteForm = useVisitStore((state) => state.setVisitNoteForm);
	const showRecordOfOpenVisit = () => {
		setVisitNoteForm(visitNoteFormFromVisit(dashboard?.activeVisit ?? null));
	};

	return (
		<section
			data-testid="visit-emk-tab"
			className="visit-note-panel bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-4"
			aria-label="Черновик электронной медицинской карты"
		>
			<div className="visit-note-head">
				<div>
					<p className="eyebrow">ЭМК после диктовки</p>
					<h3>
						{draft
							? "Проверьте черновик"
							: isVisitNoteDirty
								? "Проверьте правки"
								: "Структура приема"}
					</h3>
				</div>
				<span className={draft || isVisitNoteDirty ? "ready" : ""}>
					{visitNoteStatusLabel}
				</span>
			</div>
			{noteTextOfAnotherVisit ? (
				<div
					role="alert"
					aria-live="assertive"
					id="visit-note-foreign-text"
					data-testid="visit-note-foreign-text"
					className="mt-3 mb-3 p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-sm text-rose-900 dark:text-rose-200"
				>
					<strong className="block mb-1">
						В полях остался текст предыдущего приёма
					</strong>
					<p className="m-0">
						Открыт другой приём
						{activePatient?.fullName ? ` — ${activePatient.fullName}` : ""}, а в
						полях лежит незаписанный текст прошлого приёма. Сохранять его отсюда
						нельзя: жалобы и диагноз уйдут в карту не того человека, а снять
						такую запись можно только ревизией. Что нужно перенести — скопируйте
						из полей себе, а затем нажмите кнопку ниже: поля покажут запись
						открытого приёма.
					</p>
					<button
						type="button"
						className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors"
						onClick={showRecordOfOpenVisit}
					>
						Показать запись открытого приёма
					</button>
				</div>
			) : null}
			{visitFlowResult && !visitFlowResultIsOfAnotherVisit ? (
				<VisitFlowProgress result={visitFlowResult} />
			) : null}

			{/* Красивые вкладки (EMK Tabs) для уменьшения перегруженности */}
			<div className="emk-tabs-container" role="tablist">
				{emkTabs.map((tab) => {
					const isFilled =
						tab.id !== "all" &&
						String(noteForm[tab.id] ?? "").trim().length > 0;
					return (
						<button
							key={tab.id}
							type="button"
							role="tab"
							aria-selected={activeEmkTab === tab.id}
							className={`emk-tab-button ${activeEmkTab === tab.id ? "active" : ""}`}
							onClick={() => setActiveEmkTab(tab.id)}
						>
							{tab.label}
							{isFilled && <span className="emk-tab-dot" title="Заполнено" />}
						</button>
					);
				})}
			</div>

			<div
				className={`visit-fields ${activeEmkTab !== "all" ? "single-tab-mode" : ""}`}
			>
				{fieldsUnavailable ? (
					<div
						className="p-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300"
						role="status"
						aria-live="polite"
					>
						<strong className="block mb-1 text-slate-900 dark:text-white">
							Поля приёма пока не открылись
						</strong>
						Карта приёма ещё загружается. Если через несколько секунд поля не
						появились — обновите страницу; набранный текст сохраняется на этом
						компьютере и не потеряется.
					</div>
				) : null}
				{visibleFields.map((field) => {
					const QUICK_CHIPS: Record<string, string[]> = {
						complaint: [
							"Жалоб нет",
							"Ноющие боли",
							"Острая боль",
							"Боль при накусывании",
							"Реакция на холод/горячее",
							"Застревание пищи",
							"Эстетический дефект",
							"Проф. осмотр",
						],
						anamnesis: [
							"Ранее лечен по поводу неосложненного кариеса",
							"Травма зуба",
							"Хрон. заболевания отрицает",
							"Аллергоанамнез не отягощен",
							"Аллергия на лидокаин",
						],
						objectiveStatus: [
							"Зондирование безболезненно",
							"Перкуссия безболезненна",
							"Слизистая оболочка бледно-розового цвета",
							"Глубокая кариозная полость",
							"Сообщается с полостью зуба",
						],
						diagnosis: [
							"K02.1 Кариес дентина",
							"K04.0 Острый пульпит",
							"K04.5 Хронический апикальный периодонтит",
							"K05.0 Острый гингивит",
							"K08.1 Потеря зубов",
						],
						treatmentPlan: [
							"Анестезия аппликационная",
							"Анестезия инфильтрационная",
							"Коффердам",
							"Мех/Мед обработка",
							"Реставрация композитом светового отверждения",
							"Шлифовка, полировка",
							"Удаление зуба",
						],
					};
					const chips = QUICK_CHIPS[field.key] || [];
					return (
						<div
							key={field.key}
							className="emk-field-container"
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "0.4rem",
							}}
						>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									width: "100%",
								}}
							>
								<strong style={{ fontSize: "0.85rem", color: "#475569" }}>
									{field.label}
								</strong>
								<SmartMicrophoneButton
									context="visit"
									sterileMode={false}
									onResult={(text) => {
										if (!updateVisitNoteField) return;
										const curr = visitNoteForm[field.key] || "";
										updateVisitNoteField(
											field.key,
											appendClinicalText(curr, text, " "),
										);
									}}
									style={{ padding: "2px" }}
								/>
							</div>
							{chips.length > 0 && (
								<div
									style={{
										display: "flex",
										flexWrap: "wrap",
										gap: "0.3rem",
									}}
								>
									{chips.map((chip) => (
										<button
											key={chip}
											type="button"
											onClick={() => {
												if (!updateVisitNoteField) return;
												const curr = visitNoteForm[field.key] || "";
												updateVisitNoteField(
													field.key,
													appendClinicalText(curr, chip, ", "),
												);
											}}
											className="quick-chip"
										>
											+ {chip}
										</button>
									))}
								</div>
							)}
							<textarea
								aria-label={field.label}
								value={visitNoteForm[field.key] ?? ""}
								onChange={(event) =>
									updateVisitNoteField?.(field.key, event.target.value)
								}
								className="min-h-[80px] rounded-lg p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-y w-full outline-none focus:border-sky-500"
							/>
						</div>
					);
				})}
				<CompletedServicesChecklist />
			</div>

			{draft?.quality ? (
				<div className={`visit-draft-quality quality-${draft.quality.level}`}>
					<div>
						<strong>
							{visitDraftQualityLabels?.[draft.quality.level] ||
								draft.quality.level}
						</strong>
						<span>
							{Math.round(draft.quality.confidence * 100)}% ·{" "}
							{specialtyLabels?.[draft.quality.specialty] ||
								draft.quality.specialty}
						</span>
					</div>
					<p>{draft.quality.nextAction}</p>
					<div className="visit-draft-signal-row">
						{/* Было «FDI 36»: в записи приёма понятнее «зуб 36». */}
						{(draft.quality.detectedToothCodes ?? [])
							.slice(0, 6)
							.map((toothCode) => (
								<span key={`tooth-${toothCode}`}>зуб {toothCode}</span>
							))}
						{(draft.quality.signals ?? []).slice(0, 7).map((signal) => (
							<span key={signal}>{visitDraftSignalLabel(signal)}</span>
						))}
						{(draft.quality.missingCriticalFields ?? [])
							.slice(0, 5)
							.map((field) => (
								<small key={field}>
									проверить: {visitDraftMissingFieldLabel(field)}
								</small>
							))}
					</div>
				</div>
			) : null}

			<div className="ai-draft">
				<ShieldCheck aria-hidden="true" />
				{/*
								Последняя ветка раньше подставляла doctorSummary без запаса: у
								нового приёма его нет, и врач видел щит-иконку с пустой строкой
								рядом — то есть панель молчала о том, записано ли что-нибудь.
								Пустота теперь объясняет себя сама.
							*/}
				<p>
					{noteTextOfAnotherVisit
						? "Сохранение заперто: в полях текст другого приёма. Разберите предупреждение выше."
						: draft
							? draftNoteText
							: isVisitNoteDirty
								? "Правки будут сохранены в ЭМК. Подпись приема остается отдельным действием."
								: pendingVisitSaveCount
									? pendingSavesText
									: saveReceiptOfThisVisit
										? visitSaveReceiptText(saveReceiptOfThisVisit)
										: dashboard?.activeVisit?.doctorSummary ||
											"Запись приёма пока пустая. Продиктуйте или впишите жалобы, осмотр и диагноз — кнопка сохранения появится сразу после первой правки."}
				</p>
				{pendingVisitSaveCount ? (
					<button
						className="secondary-button"
						type="button"
						onClick={() => void flushPendingVisitSaves({ silent: false })}
						disabled={isPendingVisitSyncing}
					>
						{/* «Синхронизировать» — не то слово для врача у кресла: кнопка
									    отправляет отложенные записи на сервер клиники. */}
						{isPendingVisitSyncing ? "Отправляю" : "Отправить сейчас"}
					</button>
				) : null}
				{draft || isVisitNoteDirty ? (
					<button
						className="primary-button"
						type="button"
						onClick={acceptDraftToVisit}
						disabled={
							!visitNoteReadyToAccept ||
							isDraftAccepting ||
							Boolean(noteTextOfAnotherVisit)
						}
						aria-describedby={
							noteTextOfAnotherVisit
								? "visit-note-foreign-text"
								: !visitNoteReadyToAccept
									? "visit-note-missing"
									: undefined
						}
					>
						<Check aria-hidden="true" /> {visitNoteActionLabel}
					</button>
				) : null}
				{(draft || isVisitNoteDirty) && !visitNoteReadyToAccept ? (
					<div
						className="visit-note-missing mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60"
						id="visit-note-missing"
						role="status"
						aria-live="polite"
					>
						<strong className="block mb-2 text-amber-900 dark:text-amber-200 text-xs font-semibold">
							Чтобы сохранить запись приема, осталось:
						</strong>
						<ul className="m-0 pl-5 text-xs text-amber-800 dark:text-amber-300 space-y-1">
							{(visitNoteAcceptMissingSteps ?? []).map((step) => (
								<li key={step}>{step}</li>
							))}
						</ul>
					</div>
				) : null}
			</div>

			{/* ── ЕГИСЗ CDA R2 и Инструменты Стерилизации ── */}
			<div
				className="visit-compliance-panel mt-6 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
				data-testid="visit-compliance-panel"
			>
				<div className="flex items-center justify-between gap-4 flex-wrap mb-3">
					<div>
						<h4 className="m-0 text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
							<FileCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
							Минздрав & ЕГИСЗ РЭМД (CDA R2)
						</h4>
						<p className="m-0 text-xs text-slate-500 dark:text-slate-400">
							Экспорт готового медицинского документа в формате CDA R2 XML
						</p>
					</div>
					<button
						className="secondary-button flex items-center gap-2 text-xs py-1.5 px-3"
						type="button"
						onClick={handleDownloadCdaXml}
						disabled={isExportingCda}
						data-testid="btn-download-cda-xml"
					>
						<Download className="w-3.5 h-3.5" />
						{isExportingCda ? "Формирование XML…" : "Скачать CDA R2 (XML)"}
					</button>
				</div>

				<div className="mb-3">
					<EgiszMultipleDiagnosesWidget />
				</div>

				<hr className="my-3 border-t border-slate-200 dark:border-slate-800" />

				<form
					onSubmit={handleLinkSterilizationTray}
					className="flex flex-col gap-2"
				>
					<div className="flex items-center justify-between gap-2">
						<label
							htmlFor="visit-tray-barcode-input"
							className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
						>
							<ScanLine className="w-4 h-4 text-slate-500" />
							Привязка простерилизованного лотка
						</label>
						{linkedBarcode ? (
							<span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800">
								✓ Лоток {linkedBarcode} привязан
							</span>
						) : null}
					</div>

					<div className="flex items-center gap-2">
						<input
							id="visit-tray-barcode-input"
							type="text"
							className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
							placeholder="Отсканируйте или введите штрихкод лотка (напр. TRAY-2026-001)"
							value={trayBarcode}
							onChange={(e) => setTrayBarcode(e.target.value)}
							disabled={isLinkingTray}
							data-testid="input-tray-barcode"
						/>
						<button
							className="secondary-button text-xs py-1.5 px-3"
							type="submit"
							disabled={isLinkingTray || !trayBarcode.trim()}
							data-testid="btn-link-tray-barcode"
						>
							{isLinkingTray ? "Проверка…" : "Привязать лоток"}
						</button>
					</div>
				</form>
			</div>
		</section>
	);
}
