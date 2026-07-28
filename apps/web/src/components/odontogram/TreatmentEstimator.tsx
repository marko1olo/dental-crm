import type { ServiceCatalogItem } from "@dental/shared";
import { AlertTriangle, Calculator, FileText, Loader2, PenTool, Save, Trash2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { denteAdminSecretRequestHeaders, money, operatorReadableErrorDetail } from "../../AppHelpers";
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
import { type ToothData, ToothState } from "./ToothChart";

interface EstimatorProps {
	patientId: string;
	currentTeeth: ToothData[];
}

interface PlanItem {
	id?: string;
	toothNumber?: number;
	priceId: string;
	name: string;
	quantity: number;
	price: number;
	discount: number;
	phase: number;
	isAuto?: boolean;
}

interface SavedTreatmentPlan {
	id: string;
	name: string;
	totalPrice: number;
	patientSignature?: string | null;
	items: PlanItem[];
}

/**
 * Приведение позиции плана, пришедшей с сервера, к обещанному виду.
 *
 * Ответ сохранённого плана раскладывался в состояние как есть: `Array.isArray`
 * — и готово, дальше тип PlanItem утверждал, что price и quantity это числа.
 * В базе лежат планы, сохранённые прежними версиями формы, где цены нет вовсе.
 * Разметка звала item.price.toLocaleString(), и весь раздел «Пациенты» уходил
 * в заглушку «Раздел временно не открылся» — без единой подсказки, что дело в
 * старой строке плана лечения.
 *
 * Проще было поставить `?.` в семи местах вывода, но тогда экран показывал бы
 * «0 ₽» там, где цена просто не сохранилась. Здесь честнее один раз привести
 * данные на входе: чего нет — то ноль, и это видно в смете, а не прячется за
 * необязательным обращением где-то в глубине разметки.
 */
function planItemFromServer(raw: unknown): PlanItem | null {
	if (!raw || typeof raw !== "object") return null;
	const item = raw as Record<string, unknown>;
	const numberOr = (value: unknown, fallback: number) =>
		typeof value === "number" && Number.isFinite(value) ? value : fallback;
	const name = typeof item.name === "string" ? item.name : "";
	// Позиция без названия не показывается: врач не поймёт, за что платит.
	if (!name) return null;
	return {
		...(typeof item.id === "string" ? { id: item.id } : {}),
		...(typeof item.toothNumber === "number" ? { toothNumber: item.toothNumber } : {}),
		priceId: typeof item.priceId === "string" ? item.priceId : "",
		name,
		quantity: Math.max(1, numberOr(item.quantity, 1)),
		price: numberOr(item.price, 0),
		discount: numberOr(item.discount, 0),
		phase: numberOr(item.phase, 1),
		...(typeof item.isAuto === "boolean" ? { isAuto: item.isAuto } : {}),
	};
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
		return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
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
	const [total, setTotal] = useState(0);
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
	const [contractFailure, setContractFailure] = useState<{ status: number | null } | null>(null);
	/** Счётчик кнопки «Повторить»: меняется — оба запроса идут заново. */
	const [reloadToken, setReloadToken] = useState(0);

	const { dashboard } = useAppLogicContext();
	const [activeContract, setActiveContract] = useState<any | null>(null);

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
				const res = await fetch(`/api/insurance/contracts/${insuranceContractId}`, {
					headers: denteAdminSecretRequestHeaders(),
				});
				const rawBody = await res.text();
				if (!res.ok) {
					// БЫЛО: `res.ok ? res.json() : null` — отказ становился «договора
					// нет», покрытие ДМС молча исчезало из сметы, и пациенту называли
					// полную цену вместо со-оплаты.
					console.error(`[insurance contract] ${res.status} ${rawBody.slice(0, 300)}`);
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
	}, [insuranceContractId, reloadToken]);

	const getCoverageInfo = (item: PlanItem) => {
		if (!activeContract) return null;

		let pct = 0;
		const nameLower = item.name.toLowerCase();
		const isHygiene =
			nameLower.includes("гигиен") || nameLower.includes("чистк");

		if (isHygiene) {
			pct = activeContract.coverageHygienePct;
		} else if (item.phase === 1) {
			pct = activeContract.coverageTherapyPct;
		} else if (item.phase === 2) {
			pct = activeContract.coverageSurgeryPct;
		} else if (item.phase === 3) {
			pct = activeContract.coverageOrthoPct;
		}

		if (pct === 0) {
			return {
				covered: false,
				pct: 0,
				label: "Вне покрытия ДМС",
				copayPct: 100,
			};
		}
		return {
			covered: true,
			pct,
			label: `Покрытие ДМС ${pct}%`,
			copayPct: 100 - pct,
		};
	};

	useEffect(() => {
		let active = true;
		setPlanId(null);
		setItems([]);
		setSignatureUrl(null);
		setPlanLoad({ phase: "loading" });

		const loadPlan = async () => {
			let status: number | null = null;
			try {
				const response = await fetch(`/api/patients/${patientId}/treatment-plans`, {
					headers: denteAdminSecretRequestHeaders(),
				});
				status = response.status;
				// Тело читается один раз строкой: на пустом теле response.json()
				// бросает исключение, и прежний catch превращал отказ в ту же
				// «пустую» смету.
				const rawBody = await response.text();
				if (!response.ok) {
					console.error(`[treatment plan load] ${status} ${rawBody.slice(0, 300)}`);
					if (active) setPlanLoad({ phase: "failed", status });
					return;
				}
				const payload = jsonObjectOrNull(rawBody);
				if (!payload || !Array.isArray(payload.plans)) {
					// Успешный статус без списка планов — испорченный ответ, а не
					// «планов нет»: сервер всегда отдаёт {success, plans: []}.
					console.error(`[treatment plan load] ${status}: в ответе нет списка планов`);
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
						? latestPlan.items.map(planItemFromServer).filter((item): item is PlanItem => item !== null)
						: [],
				);
				setSignatureUrl(latestPlan.patientSignature ?? null);
			} catch (error) {
				console.error("[treatment plan load] запрос не выполнен", error);
				if (active) setPlanLoad({ phase: "failed", status });
			}
		};

		void loadPlan();

		return () => {
			active = false;
		};
	}, [patientId, reloadToken]);

	// Auto-suggestions based on currentTeeth - fully synchronized
	useEffect(() => {
		setItems((prevItems) => {
			let newItems = [...prevItems];
			let changed = false;

			/*
			 * Прайс клиники, названный своим типом, а не any.
			 *
			 * ЧТО ЗДЕСЬ БЫЛО СЛОМАНО. Ниже смета читала цену как `svc.priceRub`, а у
			 * позиции прайса такого поля НЕТ: в контракте она называется
			 * `basePriceRub` (packages/shared/src/index.ts, serviceCatalogItemSchema),
			 * и в базе это колонка service_catalog_items.base_price_rub. Компилятор
			 * молчал, потому что каталог приходил из контекста как any, и обращение к
			 * несуществующему полю на any законно.
			 *
			 * ПОСЛЕДСТВИЕ БЫЛО ВЫВЕРНУТЫМ НАИЗНАНКУ. Клиника, которая ЗАПОЛНИЛА свой
			 * прайс, получала undefined в цене — то есть «0 ₽» в смете и отказ при
			 * сохранении плана. Клиника, которая прайс НЕ заполнила, проваливалась в
			 * запасные объекты ниже и получала правдоподобные выдуманные цены. То
			 * есть заполнить свой прайс означало сделать программу хуже.
			 *
			 * Тип здесь стоит не для порядка: он делает этот класс ошибки
			 * невозможным. Обращение к `s.priceRub` на ServiceCatalogItem теперь
			 * ошибка сборки, а не тихий undefined.
			 */
			const catalog: ServiceCatalogItem[] = dashboard?.serviceCatalog ?? [];

			// Helper to find service by category and keywords
			const findService = (
				category: string,
				isBaby: boolean,
				keywords: string[],
			): ServiceCatalogItem | undefined => {
				const candidates = catalog.filter((s) => s.category === category);
				let best = candidates.find((s) =>
					keywords.some((k) => s.title.toLowerCase().includes(k)),
				);
				if (!best && candidates.length > 0) best = candidates[0]; // fallback to any in category
				return best;
			};

			/*
			 * Цена услуги из прайса клиники, либо из запасного объекта.
			 *
			 * Запасные объекты ниже несут захардкоженные `priceRub`, и это отдельный,
			 * НЕ закрытый здесь дефект: восемь выдуманных цен (4000, 5500, 6000,
			 * 12500, 35000, 12000, 5000, 28000) и восемь выдуманных идентификаторов
			 * услуг вида "service_caries_01", которые уходят на сервер при
			 * сохранении. Убрать их нельзя одной правкой: PlanItem.price объявлен
			 * непустым числом, а честное «цены нет» требует нулевого варианта в семи
			 * местах вывода плюс человеческого объяснения по §3 — «Услуги «Коронка из
			 * диоксида циркония» нет в вашем прайсе, добавьте её, чтобы посчитать
			 * план». Это отдельный пакет, и он заявлен долгом, а не спрятан.
			 *
			 * Здесь закрывается ровно та половина, из-за которой ЗАПОЛНЕННЫЙ прайс не
			 * работал. Ноль по умолчанию не подставляется: подстановка выдуманного
			 * нуля вместо неизвестной величины запрещена прямо, и если обе формы
			 * молчат, цена остаётся неопределённой и это видно.
			 */
			const servicePriceRub = (
				service: ServiceCatalogItem | { priceRub: number },
			): number =>
				"basePriceRub" in service ? service.basePriceRub : service.priceRub;

			const cariesServiceBaby = findService("therapy", true, [
				"кариес",
				"молочн",
			]) || {
				id: "service_caries_01",
				title: "Лечение кариеса (молочный зуб)",
				priceRub: 4000,
			};
			const cariesServiceAdult = findService("therapy", false, [
				"кариес",
				"восстановл",
			]) || {
				id: "service_caries_01",
				title: "Лечение кариеса (восстановление)",
				priceRub: 5500,
			};

			const pulpitisServiceBaby = findService("therapy", true, [
				"пульпит",
				"молочн",
				"эндо",
			]) || {
				id: "service_endo_pulpitis",
				title: "Эндодонтическое лечение (молочный зуб)",
				priceRub: 6000,
			};
			const pulpitisServiceAdult = findService("therapy", false, [
				"пульпит",
				"эндо",
			]) || {
				id: "service_endo_pulpitis",
				title: "Эндодонтическое лечение (Пульпит)",
				priceRub: 12500,
			};

			const implantService = findService("surgery", false, [
				"имплант",
				"установка",
			]) || {
				id: "service_implant_osstem",
				title: "Установка имплантата",
				priceRub: 35000,
			};
			const guideService = findService("surgery", false, [
				"шаблон",
				"хирург",
			]) || {
				id: "service_surgery_guide",
				title: "Хирургический шаблон",
				priceRub: 12000,
			};

			const crownBaby = findService("prosthetics", true, [
				"коронка",
				"детск",
				"молочн",
			]) || {
				id: "service_crown_zirconia",
				title: "Коронка детская стандартная",
				priceRub: 5000,
			};
			const crownAdult = findService("prosthetics", false, [
				"коронка",
				"циркон",
				"керамик",
			]) || {
				id: "service_crown_zirconia",
				title: "Коронка из диоксида циркония",
				priceRub: 28000,
			};

			// 1. Remove auto-items for teeth that no longer have that state
			const itemsToRemove: number[] = [];
			newItems.forEach((item, idx) => {
				if (!item.isAuto) return;
				const tooth = currentTeeth.find(
					(t) => t.toothNumber === item.toothNumber,
				);
				if (!tooth) {
					itemsToRemove.push(idx);
					return;
				}
				if (
					(item.priceId === cariesServiceBaby.id ||
						item.priceId === cariesServiceAdult.id) &&
					tooth.state !== "Caries"
				)
					itemsToRemove.push(idx);
				if (
					(item.priceId === implantService.id ||
						item.priceId === guideService.id) &&
					tooth.state !== "Planned_Implant" &&
					tooth.state !== "Implant"
				)
					itemsToRemove.push(idx);
				if (
					(item.priceId === pulpitisServiceBaby.id ||
						item.priceId === pulpitisServiceAdult.id) &&
					tooth.state !== "Pulpitis"
				)
					itemsToRemove.push(idx);
				if (
					(item.priceId === crownBaby.id || item.priceId === crownAdult.id) &&
					tooth.state !== "Crown"
				)
					itemsToRemove.push(idx);
			});

			if (itemsToRemove.length > 0) {
				newItems = newItems.filter((_, i) => !itemsToRemove.includes(i));
				changed = true;
			}

			// 2. Add missing auto-items
			currentTeeth.forEach((t) => {
				const isBaby = t.toothNumber > 50;
				const surfaceSuffix =
					t.surfaces && t.surfaces.length > 0
						? ` (Поверхности: ${t.surfaces.join(", ")})`
						: "";

				if (t.state === "Caries") {
					const svc = isBaby ? cariesServiceBaby : cariesServiceAdult;
					if (
						!newItems.find(
							(i) => i.toothNumber === t.toothNumber && i.priceId === svc.id,
						)
					) {
						newItems.push({
							isAuto: true,
							toothNumber: t.toothNumber,
							priceId: svc.id,
							name: svc.title + surfaceSuffix,
							quantity: 1,
							price: servicePriceRub(svc),
							discount: 0,
							phase: 1,
						});
						changed = true;
					}
				}
				if (t.state === "Planned_Implant" || t.state === "Implant") {
					if (
						!isBaby &&
						!newItems.find(
							(i) =>
								i.toothNumber === t.toothNumber &&
								i.priceId === implantService.id,
						)
					) {
						newItems.push({
							isAuto: true,
							toothNumber: t.toothNumber,
							priceId: implantService.id,
							name: implantService.title,
							quantity: 1,
							price: servicePriceRub(implantService),
							discount: 0,
							phase: 2,
						});
						newItems.push({
							isAuto: true,
							toothNumber: t.toothNumber,
							priceId: guideService.id,
							name: guideService.title,
							quantity: 1,
							price: servicePriceRub(guideService),
							discount: 0,
							phase: 2,
						});
						changed = true;
					}
				}
				if (t.state === "Pulpitis") {
					const svc = isBaby ? pulpitisServiceBaby : pulpitisServiceAdult;
					if (
						!newItems.find(
							(i) => i.toothNumber === t.toothNumber && i.priceId === svc.id,
						)
					) {
						newItems.push({
							isAuto: true,
							toothNumber: t.toothNumber,
							priceId: svc.id,
							name: svc.title + surfaceSuffix,
							quantity: 1,
							price: servicePriceRub(svc),
							discount: 0,
							phase: 1,
						});
						changed = true;
					}
				}
				if (t.state === "Crown") {
					const svc = isBaby ? crownBaby : crownAdult;
					if (
						!newItems.find(
							(i) => i.toothNumber === t.toothNumber && i.priceId === svc.id,
						)
					) {
						newItems.push({
							isAuto: true,
							toothNumber: t.toothNumber,
							priceId: svc.id,
							name: svc.title,
							quantity: 1,
							price: servicePriceRub(svc),
							discount: 0,
							phase: 3,
						});
						changed = true;
					}
				}
			});

			return changed ? newItems : prevItems;
		});
	}, [currentTeeth, dashboard?.serviceCatalog]);

	useEffect(() => {
		const t = items.reduce((acc, curr) => {
			const coverage = getCoverageInfo(curr);
			const price = coverage
				? (curr.price * coverage.copayPct) / 100
				: curr.price;
			return acc + (price * curr.quantity - curr.discount);
		}, 0);
		setTotal(t);
	}, [items, activeContract]);

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
					items: items.map((i) => ({ ...i })),
				}),
			});
			// БЫЛО: res.json() до проверки res.ok. У 403 и 500 тело бывает пустым —
			// разбор бросал исключение, и врач видел «Не удалось сохранить план
			// лечения» без причины; у 409 «подписанный план менять нельзя» причина
			// терялась так же.
			const rawBody = await res.text();
			const data = jsonObjectOrNull(rawBody);
			if (!res.ok || data?.success !== true) {
				console.error(`[treatment plan save] ${res.status} ${rawBody.slice(0, 300)}`);
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
			const savedPlan = data.plan && typeof data.plan === "object" ? (data.plan as Record<string, unknown>) : null;
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
					typeof savedPlan.patientSignature === "string" ? savedPlan.patientSignature : null,
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
		setItems(items.filter((_, i) => i !== idx));
	};

	const setPhase = (idx: number, phase: number) => {
		const n = [...items];
		if (n[idx]) n[idx].phase = phase;
		setItems(n);
	};

	const phases = [1, 2, 3];

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
					    ляжет на второй, пустой план. Подсказка в title объясняет,
					    почему кнопка выключена — выключенная кнопка без причины
					    выглядит как поломка. */}
					<button
						onClick={() => setShowSignModal(true)}
						disabled={planLoad.phase !== "ready"}
						title={
							planLoad.phase === "ready"
								? "Подписать план у пациента"
								: planLoad.phase === "loading"
									? "План лечения ещё читается с сервера"
									: "Сохранённый план не прочитан — подписывать нельзя"
						}
						className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						<PenTool size={14} />
						Подписать
					</button>
					<button
						onClick={savePlan}
						disabled={isSaving || planLoad.phase !== "ready"}
						title={
							planLoad.phase === "ready"
								? "Сохранить план лечения"
								: planLoad.phase === "loading"
									? "План лечения ещё читается с сервера"
									: "Сохранённый план не прочитан — сохранение создало бы второй план"
						}
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
						<AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
						<div className="flex-1 min-w-0 break-words">
							<div className="font-semibold">
								{/*
								  Причина берётся из кода ответа, а не задаётся заглушкой.

								  Здесь стояло requestFailureCause(null) — то есть при любом
								  отказе печаталась одна и та же общая причина, хотя код ответа
								  сохранён в состоянии. Отказ доступа и упавший сервер требуют
								  от администратора разных действий.
								*/}
								Договор ДМС не прочитан: {requestFailureCause(contractFailure.status)}.
							</div>
							<div className="mt-0.5">
								Суммы ниже показаны БЕЗ покрытия ДМС — пациент по договору заплатит
								меньше. Не называйте эти суммы пациенту, пока договор не прочитан.
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
								{phaseItems.map((item, idx) => {
									const globalIdx = items.indexOf(item);
									return (
										<div key={globalIdx} className="plan-item-card">
											<div className="plan-item-row">
												<div className="plan-item-info">
													<div className="plan-item-header">
														{item.toothNumber && (
															<span
																className={`tooth-badge ${item.toothNumber > 50 ? "baby" : "adult"}`}
															>
																[{item.toothNumber}]
															</span>
														)}
														<span className="plan-item-name">{item.name}</span>
													</div>
													<div className="plan-item-price-quantity">
														{(() => {
															const coverage = getCoverageInfo(item);
															if (coverage && !coverage.covered) {
																return (
																	<span className="text-rose-500 font-semibold flex items-center gap-1.5 flex-wrap">
																		<span>
																			{money(item.price)}
																		</span>
																		<span className="text-[10px] bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/25">
																			Вне покрытия ДМС
																		</span>
																	</span>
																);
															}
															if (coverage && coverage.pct < 100) {
																const copayPrice =
																	(item.price * coverage.copayPct) / 100;
																return (
																	<span className="flex items-center gap-1.5 flex-wrap">
																		<span className="line-through text-slate-400 dark:text-zinc-500">
																			{money(item.price)}
																		</span>
																		<span className="text-teal-500 dark:text-teal-400 font-bold">
																			{money(copayPrice)}
																		</span>
																		<span className="text-[10px] bg-teal-500/10 text-teal-500 dark:text-teal-400 px-1.5 py-0.5 rounded border border-teal-500/20">
																			Со-оплата {coverage.copayPct}%
																		</span>
																	</span>
																);
															}
															if (coverage && coverage.pct === 100) {
																return (
																	<span className="flex items-center gap-1.5 flex-wrap">
																		<span className="line-through text-slate-400 dark:text-zinc-500">
																			{money(item.price)}
																		</span>
																		<span className="text-teal-500 dark:text-teal-400 font-bold">
																			0 ₽
																		</span>
																		<span className="text-[10px] bg-teal-500/10 text-teal-500 dark:text-teal-400 px-1.5 py-0.5 rounded border border-teal-500/20">
																			ДМС 100%
																		</span>
																	</span>
																);
															}
															return (
																<span>
																	{money(item.price)} x{" "}
																	{item.quantity}
																</span>
															);
														})()}
													</div>
												</div>
												<button
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
														setPhase(globalIdx, parseInt(e.target.value))
													}
													className="select-phase"
												>
													<option value={1}>Этап I: Терапия</option>
													<option value={2}>Этап II: Хирургия</option>
													<option value={3}>Этап III: Ортопедия</option>
												</select>
												<span className="plan-item-total-price">
													{(() => {
														const coverage = getCoverageInfo(item);
														const price = coverage
															? (item.price * coverage.copayPct) / 100
															: item.price;
														return money(price * item.quantity);
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

			<div className="flex justify-between items-center px-6 py-4 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-100/30 dark:bg-zinc-900/30">
				<div className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
					Итого по плану:
				</div>
				<div className="text-xl font-bold text-slate-900 dark:text-zinc-100 flex items-baseline gap-1">
					{money(total)}
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
