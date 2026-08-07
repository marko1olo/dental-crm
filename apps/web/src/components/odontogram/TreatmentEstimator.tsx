import {
	kopecksToNumericString,
	type ServiceCatalogItem,
} from "@dental/shared";
import {
	AlertTriangle,
	Calculator,
	FileText,
	Loader2,
	PenTool,
	Save,
	Trash2,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	denteAdminSecretRequestHeaders,
	money,
	operatorReadableErrorDetail,
} from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import {
	actionFailureToast,
	type PanelSubject,
	panelStateText,
	requestFailureCause,
} from "../../lib/panelStateText";
import { showToast } from "../GlobalToast.js";
import { PanelLoadFailure } from "../PanelLoadFailure";
import { SignaturePad } from "../SignaturePad";
// ToothState отсюда больше не импортируется: это ТИП (ToothChart.tsx:6), а стоял
// он в списке значений и не использовался ни разу — во время сборки такой импорт
// просят у модуля, который его не отдаёт.
import type { ToothData } from "./ToothChart";
import {
	type EstimatorContract,
	estimatorContractFrom,
	estimatorDismissalKeys,
	estimatorIssueMessages,
	estimatorItemForApi,
	estimatorRowMoney,
	estimatorSaveBlock,
	estimatorTotals,
	isDeciduousFdiToothNumber,
	type PlanItem,
	planItemFromServer,
	reconcileAutoSuggestions,
} from "./treatmentEstimatorPricing";

interface EstimatorProps {
	patientId: string;
	currentTeeth: ToothData[];
}

/*
 * Позиция сметы, приведение ответа сервера, подбор услуг и вся денежная
 * арифметика живут в ./treatmentEstimatorPricing.ts.
 *
 * Здесь их нет намеренно: компонент невозможно загрузить в node:test — по
 * цепочке импортов он тянет файл стилей, и запуск падает на
 * ERR_UNKNOWN_FILE_EXTENSION. Деньги обязаны проверяться до отрисовки, поэтому
 * они вынесены в модуль без React, а рядом с ним стоит
 * treatmentEstimatorPricing.test.ts.
 */

interface SavedTreatmentPlan {
	id: string;
	name: string;
	totalPrice: number;
	patientSignature?: string | null;
	items: PlanItem[];
}

/**
 * Сумма к показу.
 *
 * Считается всё целыми копейками (packages/shared/src/utils/money.ts), а
 * печатается общим `money()`: он не дописывает «,00» к круглым суммам, а на
 * экране сметы почти все цены круглые. Перевод идёт через десятичную строку, а
 * не через деление на сто, чтобы в отображение не просочилось плавающее число.
 */
function rub(kopecks: number): string {
	return money(kopecksToNumericString(kopecks));
}

/**
 * Состояние чтения сохранённого плана. «Пусто» отдельным состоянием не нужно:
 * пустота видна по items, но утверждать её можно ТОЛЬКО в phase === "ready".
 *
 * ЧТО БЫЛО СЛОМАНО. Чтение выглядело как `response.ok ? response.json() : null`:
 * отказ сервера превращался в null, latestPlan оставался undefined, и функция
 * молча выходила. При этом эффект автоподбора (ниже) на каждое изменение зубной
 * формулы заполняет items из отмеченных патологий. То есть после отказа врач
 * видел не пустой экран, а ПОЛНУЮ смету с ненулевым «Итого» — внешне нормальный
 * план, где ни одной пометки, что сохранённый план не прочитан. Достаточно
 * нажать «Сохранить»: planId равен null, сервер вставляет ВТОРОЙ план, а подпись
 * пациента остаётся у прежнего, и в списке планов первым идёт свежий
 * неподписанный (loadTreatmentPlansForPatient сортирует по updatedAt).
 */
type PlanLoadState =
	| { readonly phase: "loading" }
	| { readonly phase: "ready" }
	| { readonly phase: "failed"; readonly status: number | null };

/** Названия состояний этой панели. Формулировки общие с панелями карточки пациента. */
const PLAN_SUBJECT: PanelSubject = {
	// Отказ называется целой согласованной строкой: слова «не загружены» больше
	// не дописывает общий модуль, поэтому число и род задаёт тот, кто знает
	// существительное. Здесь не сказано «план не прочитан» — эти слова уже стоят
	// в failureConsequence ниже.
	notLoadedTitle: "Позиции плана лечения не загружены",
	accusative: "план лечения",
	emptyTitle: "План лечения пуст",
	emptyHint:
		"Кликните на любой зуб на схеме слева, выберите патологию, и система автоматически подберет оптимальный набор процедур из прайс-листа",
	failureConsequence:
		"Не считайте, что плана нет: он не прочитан. Сохранение и подписание отключены — иначе рядом с сохранённым планом появится второй, а подпись пациента останется у старого.",
};

/** Объект из тела ответа или null. Массив и скаляр объектом не считаются. */
function jsonObjectOrNull(rawBody: string): Record<string, unknown> | null {
	const trimmed = rawBody.trim();
	if (!trimmed) return null;
	try {
		const parsed: unknown = JSON.parse(trimmed);
		return typeof parsed === "object" &&
			parsed !== null &&
			!Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: null;
	} catch {
		// Текст исключения английский, человеку он не показывается никогда.
		return null;
	}
}

export const TreatmentEstimator: React.FC<EstimatorProps> = ({
	patientId,
	currentTeeth,
}) => {
	const [items, setItems] = useState<PlanItem[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [planId, setPlanId] = useState<string | null>(null);
	const [showSignModal, setShowSignModal] = useState(false);
	const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
	const [planLoad, setPlanLoad] = useState<PlanLoadState>({ phase: "loading" });
	/**
	 * Договор ДМС не прочитан, и `status` — код ответа (null, если до сервера не
	 * дошли). Отличать это от «договора нет» обязательно: без договора смета
	 * показывает полные цены, и врач с пациентом видят суммы больше тех, которые
	 * пациент реально заплатит. Молча так делать нельзя.
	 */
	const [contractFailure, setContractFailure] = useState<{
		status: number | null;
	} | null>(null);
	/** Счётчик кнопки «Повторить»: меняется — оба запроса идут заново. */
	const [_reloadToken, setReloadToken] = useState(0);
	/**
	 * Что врач снял корзиной. Без этого списка автоподбор возвращал снятую
	 * строку в смету при следующей же отметке любого зуба: подбор идёт от зубной
	 * формулы, а формула про снятие не знает. Корзина выглядела рабочей, а
	 * лечение с ценой возвращалось в документ для подписи пациентом.
	 */
	const [dismissedSuggestions, setDismissedSuggestions] = useState<
		ReadonlySet<string>
	>(() => new Set<string>());

	const { dashboard } = useAppLogicContext();
	/*
	 * Тело ответа лежит здесь НЕразобранным, и тип у него `unknown`, а не `any`.
	 * Было `any | null`: любое поле договора считалось прочитанным, и в смету
	 * попадало «Покрытие ДМС undefined%». Проценты читает
	 * estimatorContractFrom — единственное место, где из этого тела берутся числа.
	 */
	const [activeContract, setActiveContract] = useState<unknown>(null);

	const patient = dashboard?.patients?.find((p: any) => p.id === patientId);
	const insuranceContractId =
		patient?.insuranceContractId ||
		patient?.administrativeProfile?.insuranceContractId;

	useEffect(() => {
		if (!insuranceContractId) {
			setActiveContract(null);
			setContractFailure(null);
			return;
		}
		let active = true;
		setContractFailure(null);

		const loadContract = async () => {
			try {
				const res = await fetch(
					`/api/insurance/contracts/${insuranceContractId}`,
					{
						headers: denteAdminSecretRequestHeaders(),
					},
				);
				const rawBody = await res.text();
				if (!res.ok) {
					// БЫЛО: `res.ok ? res.json() : null` — отказ становился «договора
					// нет», покрытие ДМС молча исчезало из сметы, и пациенту называли
					// полную цену вместо со-оплаты.
					console.error(
						`[insurance contract] ${res.status} ${rawBody.slice(0, 300)}`,
					);
					if (!active) return;
					setActiveContract(null);
					setContractFailure({ status: res.status });
					return;
				}
				const contract = jsonObjectOrNull(rawBody);
				if (!active) return;
				if (!contract) {
					console.error("[insurance contract] тело ответа не разобрано");
					setActiveContract(null);
					setContractFailure({ status: res.status });
					return;
				}
				setActiveContract(contract);
			} catch (err) {
			showToast(actionFailureToast("Ошибка выполнения операции", (err as { status?: number })?.status ?? null), "error");
				console.error("[insurance contract] запрос не выполнен", err);
				if (!active) return;
				setActiveContract(null);
				// До сервера не дошли: кода ответа нет, и придумывать его нельзя.
				setContractFailure({ status: null });
			}
		};

		void loadContract();
		return () => {
			active = false;
		};
	}, [insuranceContractId]);

	/*
	 * Договор ДМС читается в четыре проверенных процента.
	 *
	 * Договор приходит из ответа сервера как `any`, и недостающий процент
	 * печатался в интерфейсе как «Покрытие ДМС undefined%». Непрочитанный
	 * процент теперь означает ноль покрытия, то есть полную цену: пациенту
	 * называют сумму больше той, что он заплатит, а не меньше.
	 */
	const contract: EstimatorContract = useMemo(
		() => estimatorContractFrom(activeContract),
		[activeContract],
	);

	useEffect(() => {
		let active = true;
		setPlanId(null);
		setItems([]);
		setSignatureUrl(null);
		setPlanLoad({ phase: "loading" });
		/*
		 * Снятое у прошлого пациента не переносится на следующего: панель не
		 * размонтируется (PatientsView.tsx монтирует карту без key), и без сброса
		 * снятая у Иванова коронка не предлагалась бы Петрову.
		 *
		 * Окно подписи закрывается по той же причине. Оно оставалось открытым при
		 * смене карточки, и подпись, поставленная за прошлого пациента, ложилась в
		 * план НОВОГО — а «ПОДПИСАНО» на экране выглядело как его подпись.
		 */
		setDismissedSuggestions(new Set<string>());
		setShowSignModal(false);

		const loadPlan = async () => {
			let status: number | null = null;
			try {
				const response = await fetch(
					`/api/patients/${patientId}/treatment-plans`,
					{
						headers: denteAdminSecretRequestHeaders(),
					},
				);
				status = response.status;
				// Тело читается один раз строкой: на пустом теле response.json()
				// бросает исключение, и прежний catch превращал отказ в ту же
				// «пустую» смету.
				const rawBody = await response.text();
				if (!response.ok) {
					console.error(
						`[treatment plan load] ${status} ${rawBody.slice(0, 300)}`,
					);
					if (active) setPlanLoad({ phase: "failed", status });
					return;
				}
				const payload = jsonObjectOrNull(rawBody);
				if (!payload || !Array.isArray(payload.plans)) {
					// Успешный статус без списка планов — испорченный ответ, а не
					// «планов нет»: сервер всегда отдаёт {success, plans: []}.
					console.error(
						`[treatment plan load] ${status}: в ответе нет списка планов`,
					);
					if (active) setPlanLoad({ phase: "failed", status });
					return;
				}
				if (!active) return;
				const latestPlan = payload.plans[0] as SavedTreatmentPlan | undefined;
				// Прочитано успешно — в том числе когда планов у пациента ещё нет.
				setPlanLoad({ phase: "ready" });
				if (!latestPlan) return;
				setPlanId(latestPlan.id);
				setItems(
					Array.isArray(latestPlan.items)
						? latestPlan.items
								.map(planItemFromServer)
								.filter((item): item is PlanItem => item !== null)
						: [],
				);
				setSignatureUrl(latestPlan.patientSignature ?? null);
			} catch (error) {
			showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
				console.error("[treatment plan load] запрос не выполнен", error);
				if (active) setPlanLoad({ phase: "failed", status });
			}
		};

		void loadPlan();

		return () => {
			active = false;
		};
	}, [patientId]);

	/*
	 * Автоподбор услуг по зубной формуле.
	 *
	 * ЧТО ЗДЕСЬ БЫЛО СЛОМАНО. На этом месте стояли ВОСЕМЬ запасных объектов с
	 * выдуманными ценами (4000, 5500, 6000, 12500, 35000, 12000, 5000, 28000 ₽) и
	 * выдуманными идентификаторами услуг ("service_caries_01",
	 * "service_endo_pulpitis", "service_implant_osstem", "service_surgery_guide",
	 * "service_crown_zirconia"). Если подходящей услуги в прайсе клиники не
	 * находилось, эти суммы попадали в смету — документ, который подписывает
	 * пациент, — а идентификаторы уходили на сервер полем `priceId`. Ни одну из
	 * этих цен не назначала ни одна клиника.
	 *
	 * Рядом стоял тот же дефект помягче: «нет совпадения по слову — возьми любую
	 * услугу из раздела». Клиника, у которой раздел «терапия» начинается с
	 * «Консультация», получала на кариозный зуб название и цену консультации.
	 *
	 * ЧТО СТАЛО. Подбор и деньги вынесены в ./treatmentEstimatorPricing.ts и
	 * проверяются node:test без React. Цена приходит только из прайса клиники;
	 * нет услуги — нет цены (null, не ноль), строка с находкой остаётся, а
	 * человеку сказано, чего не хватает и что сделать.
	 */
	useEffect(() => {
		const catalogSource = dashboard?.serviceCatalog;
		/*
		 * Прайс ещё не прочитан — это НЕ «прайс пуст». Пока каталога нет, подбор
		 * молчит: иначе во время загрузки на экране появилось бы «Ваш прайс-лист
		 * пуст», а до правки в этот момент добавлялись строки с выдуманными ценами.
		 */
		if (!Array.isArray(catalogSource)) return;
		const catalog: ServiceCatalogItem[] = catalogSource;
		setItems((prevItems) => {
			const { items: nextItems, changed } = reconcileAutoSuggestions(
				prevItems,
				currentTeeth,
				catalog,
				dismissedSuggestions,
			);
			return changed ? nextItems : prevItems;
		});
	}, [currentTeeth, dashboard?.serviceCatalog, dismissedSuggestions]);

	/*
	 * Итог, объяснения и запрет сохранения считаются от состояния, а не хранятся
	 * во втором состоянии рядом. Прежде итог лежал в useState и обновлялся
	 * эффектом, то есть один кадр показывал сумму от предыдущего набора строк.
	 */
	const totals = useMemo(
		() => estimatorTotals(items, contract),
		[items, contract],
	);
	const issueMessages = useMemo(() => estimatorIssueMessages(items), [items]);
	const saveBlock = useMemo(() => estimatorSaveBlock(items), [items]);

	const savePlan = async () => {
		/*
		 * Сохранять, не прочитав сохранённый план, нельзя: planId равен null, и
		 * сервер вставит ВТОРОЙ план вместо обновления существующего. Кнопка в
		 * этом состоянии выключена, но проверка нужна и здесь — с клавиатуры и из
		 * будущего вызова сюда можно попасть в обход кнопки.
		 */
		if (planLoad.phase !== "ready") {
			showToast(
				planLoad.phase === "loading"
					? "План лечения ещё читается с сервера. Подождите пару секунд и сохраните снова — набранные позиции останутся на месте."
					: `План не сохранён: ${requestFailureCause(planLoad.status)}. Сохранённый план не прочитан, а сохранение поверх непрочитанного создало бы второй план — нажмите «Повторить», а если не поможет, обновите страницу.`,
				planLoad.phase === "loading" ? "info" : "error",
				12000,
			);
			return;
		}
		/*
		 * Строка без услуги прайса не сохраняется — и врач узнаёт, КАКАЯ именно.
		 *
		 * Сервер (apps/api/src/routes/odontogram.ts, treatmentPlanItemSchema)
		 * требует у каждой строки непустой `priceId` и числовую `price`, поэтому
		 * одна строка без цены отклоняет ВЕСЬ план. Раньше на это место
		 * подставлялся выдуманный идентификатор услуги, и план сохранялся с
		 * ценой, которой клиника не назначала. Убрать строку молча тоже нельзя:
		 * человек нажал «Сохранить» и получил бы план без части лечения.
		 */
		if (saveBlock) {
			showToast(saveBlock.message, "error", 15000);
			return;
		}
		const itemsForApi = items
			.map(estimatorItemForApi)
			.filter((item): item is NonNullable<typeof item> => item !== null);
		setIsSaving(true);
		try {
			const res = await fetch(`/api/patients/${patientId}/treatment-plans`, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					id: planId,
					name: "Комплексный план лечения (КТ)",
					patientSignature: signatureUrl,
					items: itemsForApi,
				}),
			});
			// БЫЛО: res.json() до проверки res.ok. У 403 и 500 тело бывает пустым —
			// разбор бросал исключение, и врач видел «Не удалось сохранить план
			// лечения» без причины; у 409 «подписанный план менять нельзя» причина
			// терялась так же.
			const rawBody = await res.text();
			const data = jsonObjectOrNull(rawBody);
			if (!res.ok || data?.success !== true) {
				console.error(
					`[treatment plan save] ${res.status} ${rawBody.slice(0, 300)}`,
				);
				const detail = operatorReadableErrorDetail(
					typeof data?.message === "string" ? data.message : null,
				);
				showToast(
					detail ??
						`${actionFailureToast("План лечения не сохранён", res.status)} Позиции остались на экране.`,
					"error",
					12000,
				);
				return;
			}
			if (typeof data.planId === "string") setPlanId(data.planId);
			const savedPlan =
				data.plan && typeof data.plan === "object"
					? (data.plan as Record<string, unknown>)
					: null;
			// Позиции из ответа проходят ту же нормализацию, что и при чтении:
			// иначе в состояние попадёт строка без цены и разметка снова упадёт.
			if (Array.isArray(savedPlan?.items)) {
				setItems(
					savedPlan.items
						.map(planItemFromServer)
						.filter((item): item is PlanItem => item !== null),
				);
			}
			if (savedPlan && savedPlan.patientSignature !== undefined) {
				setSignatureUrl(
					typeof savedPlan.patientSignature === "string"
						? savedPlan.patientSignature
						: null,
				);
			}
			showToast("План лечения успешно сохранен!", "success");
		} catch (e) {
			console.error("[treatment plan save] запрос не выполнен", e);
			showToast(
				`${actionFailureToast("План лечения не сохранён", null)} Позиции остались на экране.`,
				"error",
				12000,
			);
		} finally {
			setIsSaving(false);
		}
	};

	const removeItem = (idx: number) => {
		const removed = items[idx];
		setItems(items.filter((_, i) => i !== idx));
		/*
		 * Снятие запоминается, иначе автоподбор вернёт строку обратно при
		 * следующей отметке любого зуба — список зубов в этот момент
		 * пересоздаётся, и эффект подбора идёт заново по той же формуле.
		 * Запоминаются только строки, привязанные к зубу: строку, добавленную
		 * руками, подбор и не возвращает.
		 */
		if (!removed) return;
		const keys = estimatorDismissalKeys(removed);
		if (keys.length === 0) return;
		setDismissedSuggestions((prev) => {
			const next = new Set(prev);
			for (const key of keys) next.add(key);
			return next;
		});
	};

	const setPhase = (idx: number, phase: number) => {
		const n = [...items];
		if (n[idx]) n[idx].phase = phase;
		setItems(n);
	};

	const phases = [1, 2, 3];

	/*
	 * Почему сохранение и подпись недоступны — человеческими словами.
	 *
	 * Выключенная кнопка без причины выглядит как поломка, а кнопка, которая не
	 * может сдержать обещание, — как обман. Строка без цены из прайса отклоняется
	 * сервером целиком, поэтому «Сохранить» в этом состоянии обещать нечего, зато
	 * названы оба действия, которые действительно есть: заполнить прайс или снять
	 * строку корзиной.
	 */
	const blockedReason: string | null =
		planLoad.phase === "loading"
			? "План лечения ещё читается с сервера"
			: planLoad.phase === "failed"
				? "Сохранённый план не прочитан — сохранение создало бы второй план"
				: saveBlock
					? "В смете есть лечение без цены из вашего прайса — сервер отклонит весь план. Добавьте услуги в «Настройки → Прайс» или уберите строки корзиной"
					: null;

	return (
		<div className="flex flex-col h-full bg-zinc-50/40 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-xl overflow-hidden text-slate-900 dark:text-zinc-100">
			<div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-100/30 dark:bg-zinc-900/30">
				<h2 className="flex items-center gap-2 text-lg font-bold">
					<FileText
						size={18}
						className="text-indigo-500 dark:text-indigo-400"
					/>
					План лечения
				</h2>
				<div className="flex gap-2">
					{signatureUrl && (
						<span className="px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-100/50 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-full border border-emerald-200/50 dark:border-emerald-500/30 flex items-center">
							ПОДПИСАНО
						</span>
					)}
					{/* Пока план не прочитан, подписывать и сохранять нечего: подпись
					    ляжет на второй, пустой план. То же и со строкой без цены —
					    сервер отклонит план целиком, а подпись пациента окажется
					    потраченной впустую. Подсказка в title объясняет, почему кнопка
					    выключена — выключенная кнопка без причины выглядит как поломка. */}
					<button
						type="button"
						onClick={() => setShowSignModal(true)}
						disabled={blockedReason !== null}
						title={blockedReason ?? "Подписать план у пациента"}
						className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						<PenTool size={14} />
						Подписать
					</button>
					<button
						type="button"
						onClick={savePlan}
						disabled={isSaving || blockedReason !== null}
						title={blockedReason ?? "Сохранить план лечения"}
						className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 border border-indigo-500 rounded-lg shadow-md shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						<Save size={14} />
						{isSaving ? "Сохранение..." : "Сохранить"}
					</button>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
				{/* Отказ чтения — первое, что видно, и он не отменяет уже подобранных
				    позиций: подбор идёт от зубной формулы и остаётся на экране. */}
				{planLoad.phase === "failed" && (
					<PanelLoadFailure
						subject={PLAN_SUBJECT}
						status={planLoad.status}
						onRetry={() => setReloadToken((token) => token + 1)}
						className="mb-3"
					/>
				)}

				{/* Договор ДМС отдельно от плана: без него суммы верные, но полные —
				    пациент заплатит меньше, и это надо сказать, а не показывать
				    молча цену без покрытия. */}
				{contractFailure && (
					<div
						role="alert"
						className="flex flex-wrap items-start gap-x-3 gap-y-2 p-3 mb-3 rounded-lg border text-xs leading-relaxed bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-900"
					>
						<AlertTriangle
							size={14}
							className="mt-0.5 shrink-0"
							aria-hidden="true"
						/>
						<div className="flex-1 min-w-0 break-words">
							<div className="font-semibold">
								{/*
								  Причина берётся из кода ответа, а не задаётся заглушкой.

								  Здесь стояло requestFailureCause(null) — то есть при любом
								  отказе печаталась одна и та же общая причина, хотя код ответа
								  сохранён в состоянии. Отказ доступа и упавший сервер требуют
								  от администратора разных действий.
								*/}
								Договор ДМС не прочитан:{" "}
								{requestFailureCause(contractFailure.status)}.
							</div>
							<div className="mt-0.5">
								Суммы ниже показаны БЕЗ покрытия ДМС — пациент по договору
								заплатит меньше. Не называйте эти суммы пациенту, пока договор
								не прочитан.
							</div>
						</div>
						<button
							type="button"
							onClick={() => setReloadToken((token) => token + 1)}
							className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-100 font-semibold cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors"
						>
							Повторить
						</button>
					</div>
				)}

				{/* Чего не хватает в прайсе, чтобы посчитать смету.
				    Одна фраза на причину, а не на строку: пять кариозных зубов без
				    услуги в прайсе — это одна новость и один список зубов. Клиническая
				    находка при этом остаётся в плане ниже: врач видит зуб и лечение,
				    только без цены, которую клиника не назначала. */}
				{issueMessages.length > 0 && (
					<div
						role="alert"
						className="flex flex-wrap items-start gap-x-3 gap-y-2 p-3 mb-3 rounded-lg border text-xs leading-relaxed bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-900"
					>
						<AlertTriangle
							size={14}
							className="mt-0.5 shrink-0"
							aria-hidden="true"
						/>
						<div className="flex-1 min-w-0 break-words">
							<div className="font-semibold">
								Часть лечения посчитать не удалось — цены нет в вашем прайсе.
							</div>
							<ul className="mt-1 flex flex-col gap-1">
								{issueMessages.map((message) => (
									<li key={message}>{message}</li>
								))}
							</ul>
						</div>
					</div>
				)}

				{/* Загрузка: пока ответа нет, «План лечения пуст» — ложь. */}
				{planLoad.phase === "loading" && items.length === 0 && (
					<div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500 dark:text-zinc-400">
						<Loader2 size={16} className="animate-spin" aria-hidden="true" />
						{panelStateText(PLAN_SUBJECT, { phase: "loading" }).title}
					</div>
				)}

				{planLoad.phase === "ready" && items.length === 0 && (
					<div className="flex flex-col items-center justify-center p-8 mx-2 my-8 rounded-2xl border border-dashed border-zinc-300/50 dark:border-zinc-700/50 bg-zinc-50/30 dark:bg-zinc-900/20 backdrop-blur-sm text-center">
						<div className="p-5 mb-4 rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 shadow-[0_0_30px_5px_rgba(99,102,241,0.1)] dark:shadow-[0_0_30px_5px_rgba(99,102,241,0.1)] border border-indigo-500/10 dark:border-indigo-500/20">
							<Calculator
								size={40}
								className="text-indigo-500 dark:text-indigo-400 opacity-40"
							/>
						</div>
						<h4 className="text-base font-bold text-slate-800 dark:text-zinc-100 mb-2">
							План лечения пуст
						</h4>
						<p className="text-sm leading-relaxed text-slate-500 dark:text-zinc-400 max-w-[320px]">
							Кликните на любой зуб на схеме слева, выберите патологию, и
							система автоматически подберет оптимальный набор процедур из
							прайс-листа
						</p>
					</div>
				)}

				{phases.map((phase) => {
					const phaseItems = items.filter((i) => i.phase === phase);
					if (phaseItems.length === 0) return null;

					return (
						<div key={phase} className="phase-section">
							<h3 className="phase-title">
								{phase === 1 && "I. Терапия (Санация)"}
								{phase === 2 && "II. Хирургия и Имплантация"}
								{phase === 3 && "III. Ортопедия (Протезирование)"}
							</h3>

							<div className="phase-items-list">
								{phaseItems.map((item, _idx) => {
									const globalIdx = items.indexOf(item);
									return (
										<div key={globalIdx} className="plan-item-card">
											<div className="plan-item-row">
												<div className="plan-item-info">
													<div className="plan-item-header">
														{item.toothNumber && (
															// Молочный зуб определяет общее правило FDI, а не порог
															// «> 50», списанный здесь во второй раз: по нему зуб 99
															// (опечатка, а не зуб) считался молочным.
															<span
																className={`tooth-badge ${isDeciduousFdiToothNumber(item.toothNumber) ? "baby" : "adult"}`}
															>
																[{item.toothNumber}]
															</span>
														)}
														<span className="plan-item-name">{item.name}</span>
													</div>
													<div className="plan-item-price-quantity">
														{(() => {
															const rowMoney = estimatorRowMoney(
																item,
																contract,
															);
															/*
															 * Цены нет — и числа не будет. Здесь стояло
															 * money(item.price), а money() печатает «0 ₽» и для
															 * нуля, и для отсутствующего значения: пациент читал
															 * «0 ₽» там, где цена просто не назначена. Ноль
															 * означает «бесплатно», и подставлять его вместо
															 * неизвестной величины запрещено.
															 */
															if (!rowMoney.known) {
																return (
																	<span className="text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1.5 flex-wrap">
																		<span>Цена не назначена</span>
																		{/* Значок называет ПРИЧИНУ, а не одну на всё: строка без
																		    услуги прайса и строка с испорченной суммой требуют от
																		    человека разных действий, и написать «нет в вашем
																		    прайсе» над сохранённой строкой было бы неправдой. */}
																		<span className="text-[10px] font-normal bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
																			{item.issue
																				? "нет в вашем прайсе"
																				: "сумма в плане не читается"}
																		</span>
																	</span>
																);
															}
															if (
																rowMoney.hasContract &&
																rowMoney.coveragePct === 0
															) {
																return (
																	<span className="text-rose-500 font-semibold flex items-center gap-1.5 flex-wrap">
																		<span>{rub(rowMoney.unitKopecks)}</span>
																		<span className="text-[10px] bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/25">
																			Вне покрытия ДМС
																		</span>
																	</span>
																);
															}
															if (
																rowMoney.hasContract &&
																rowMoney.coveragePct < 100
															) {
																return (
																	<span className="flex items-center gap-1.5 flex-wrap">
																		<span className="line-through text-slate-400 dark:text-zinc-500">
																			{rub(rowMoney.unitKopecks)}
																		</span>
																		<span className="text-teal-500 dark:text-teal-400 font-bold">
																			{rub(rowMoney.unitPayableKopecks)}
																		</span>
																		<span className="text-[10px] bg-teal-500/10 text-teal-500 dark:text-teal-400 px-1.5 py-0.5 rounded border border-teal-500/20">
																			Со-оплата {rowMoney.copayPct}%
																		</span>
																	</span>
																);
															}
															if (rowMoney.hasContract) {
																return (
																	<span className="flex items-center gap-1.5 flex-wrap">
																		<span className="line-through text-slate-400 dark:text-zinc-500">
																			{rub(rowMoney.unitKopecks)}
																		</span>
																		<span className="text-teal-500 dark:text-teal-400 font-bold">
																			{rub(rowMoney.unitPayableKopecks)}
																		</span>
																		<span className="text-[10px] bg-teal-500/10 text-teal-500 dark:text-teal-400 px-1.5 py-0.5 rounded border border-teal-500/20">
																			ДМС 100%
																		</span>
																	</span>
																);
															}
															return (
																<span>
																	{rub(rowMoney.unitKopecks)} x {item.quantity}
																</span>
															);
														})()}
													</div>
												</div>
												<button
													type="button"
													onClick={() => removeItem(globalIdx)}
													className="btn-remove-item"
													title="Удалить"
												>
													<Trash2 size={14} />
												</button>
											</div>
											<div className="plan-item-footer">
												<select
													value={item.phase}
													onChange={(e) =>
														setPhase(globalIdx, parseInt(e.target.value, 10))
													}
													className="select-phase"
												>
													<option value={1}>Этап I: Терапия</option>
													<option value={2}>Этап II: Хирургия</option>
													<option value={3}>Этап III: Ортопедия</option>
												</select>
												<span className="plan-item-total-price">
													{(() => {
														/*
														 * Итог строки считается целыми копейками и включает
														 * скидку — как на сервере, max(0, цена × кол-во −
														 * скидка). До правки скидка в строке не вычиталась, и
														 * сумма строк не совпадала с «Итого по плану».
														 */
														const rowMoney = estimatorRowMoney(item, contract);
														return rowMoney.known
															? rub(rowMoney.payableKopecks)
															: "цены нет";
													})()}
												</span>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>

			{/* Итог складывается целыми копейками (packages/shared/utils/money.ts).
			    Строка без цены не считается нулём: она делает итог НЕПОЛНЫМ, и об
			    этом сказано рядом с суммой, а не спрятано. Молча просуммировать
			    известное и выдать это за итог — то же самое, что выдумать цену. */}
			<div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-1 px-6 py-4 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-100/30 dark:bg-zinc-900/30">
				<div className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
					{totals.incompleteRows > 0
						? "Итого, без непосчитанного:"
						: "Итого по плану:"}
				</div>
				<div className="flex flex-col items-end min-w-0">
					{/*
					  Ни одной посчитанной строки — суммы НЕТ, и ноль вместо неё не
					  печатается. Складывать было нечего, а «Итого: 0 ₽» под планом из
					  четырёх процедур читается как «лечение бесплатное». На пустом
					  прайсе это состояние и работает, то есть оно не редкое.
					*/}
					{totals.pricedRows === 0 && totals.incompleteRows > 0 ? (
						<div className="text-xl font-bold text-amber-700 dark:text-amber-300">
							Считать пока нечего
						</div>
					) : (
						<div className="text-xl font-bold text-slate-900 dark:text-zinc-100 flex items-baseline gap-1">
							{rub(totals.payableKopecks)}
						</div>
					)}
					{totals.incompleteRows > 0 && (
						<div className="text-xs font-semibold text-amber-700 dark:text-amber-300 text-right break-words">
							{totals.pricedRows === 0
								? "Ни у одной строки плана нет цены из вашего прайса"
								: "Итог неполный: в плане есть лечение без цены из прайса"}
						</div>
					)}
				</div>
			</div>

			{showSignModal &&
				typeof window !== "undefined" &&
				createPortal(
					<div className="modal-overlay">
						<div className="modal-content" style={{ maxWidth: "800px" }}>
							<SignaturePad
								onSign={(dataUrl) => {
									setSignatureUrl(dataUrl);
									setShowSignModal(false);
									showToast("Подпись добавлена. Нажмите 'Сохранить'.", "info");
								}}
								onCancel={() => setShowSignModal(false)}
							/>
						</div>
					</div>,
					document.body,
				)}
		</div>
	);
};
