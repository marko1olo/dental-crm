import { multiplyKopecks, parseKopecks, sumKopecks } from "@dental/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { normalizeRubAmountInput } from "../../rubAmountInput";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";

export interface InventoryItem {
	id: string;
	name: string;
	stockQuantity: number;
	criticalThreshold: number;
	unitCostRub: string;
	updatedAt: string;
	sku?: string;
	barcode?: string;
	expirationDate?: string;
	lotNumber?: string;
}

/**
 * Приведение строки склада, пришедшей с сервера, к обещанному виду.
 *
 * Тип InventoryItem объявляет stockQuantity и criticalThreshold числами, а
 * сервер присылает их СТРОКАМИ: колонки объявлены numeric без mode "number", и
 * drizzle гонит значение через String(). Компилятор об этом не знает, потому
 * что ответ раскладывался в состояние без разбора — `Array.isArray(data)`, и
 * готово.
 *
 * Что из этого выходило на экране (видно на снимке склада):
 *   «в дефиците 1» при остатке 10 и минимальном запасе 3. Сравнение
 *     stockQuantity <= criticalThreshold шло по строкам, а "10" < "3"
 *     лексикографически — правда. Склад сообщал о дефиците полного материала;
 *   предпросмотр «Будет: …» в окне прихода складывал строку с числом:
 *     "10" + 5 давало «105» вместо 15;
 *   стоимость позиции считалась как "10" * цена — здесь умножение спасало,
 *     потому что JavaScript приводит строку к числу при умножении, но не при
 *     сложении и не при сравнении. Именно поэтому дефицит врал, а итог нет.
 *
 * Разбор на входе делает объявленный тип правдой: дальше по коду числа можно
 * складывать и сравнивать, не думая о том, что пришло с сервера.
 */
function inventoryItemFromServer(raw: unknown): InventoryItem {
	const row = (raw ?? {}) as Record<string, unknown>;
	const asNumber = (value: unknown) => {
		const parsed = typeof value === "number" ? value : Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	};
	/*
	 * Необязательные поля собираются через локальные строки, а не через функцию,
	 * возвращающую `string | undefined`: при exactOptionalPropertyTypes значение
	 * `undefined` не подходит свойству, объявленному как `sku?: string`.
	 */
	const asText = (value: unknown) =>
		typeof value === "string" ? value.trim() : "";
	const sku = asText(row.sku);
	const barcode = asText(row.barcode);
	const lotNumber = asText(row.lotNumber);
	const expiration = asText(row.expirationDate);
	return {
		id: String(row.id ?? ""),
		name: typeof row.name === "string" ? row.name : "",
		stockQuantity: asNumber(row.stockQuantity),
		criticalThreshold: asNumber(row.criticalThreshold),
		// Цена остаётся строкой: так объявлен тип, и её везде читают через Number().
		unitCostRub:
			row.unitCostRub === null || row.unitCostRub === undefined
				? "0"
				: String(row.unitCostRub),
		updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : "",
		...(sku ? { sku } : {}),
		...(barcode ? { barcode } : {}),
		...(lotNumber ? { lotNumber } : {}),
		/*
		 * Срок годности приводим к «ГГГГ-ММ-ДД» по местному дню.
		 *
		 * Колонка date часового пояса не несёт, но сервер отдаёт её строкой ISO с
		 * временем; взять первые десять знаков напрямую нельзя — при отрицательном
		 * смещении часового пояса дата уехала бы на сутки назад.
		 */
		...(expiration ? { expirationDate: localDayOf(expiration) } : {}),
	};
}

/** Календарный день значения даты по местному времени, в виде «ГГГГ-ММ-ДД». */
function localDayOf(value: string): string {
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
	const month = String(parsed.getMonth() + 1).padStart(2, "0");
	const day = String(parsed.getDate()).padStart(2, "0");
	return `${parsed.getFullYear()}-${month}-${day}`;
}

export function useInventoryLogic(organizationId: string) {
	const [items, setItems] = useState<InventoryItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const dashboard = appLogic?.dashboard;

	const getHeaders = useCallback(
		(extra?: Record<string, string>) => {
			const headers =
				auth && typeof auth.denteClinicalReadHeaders === "function"
					? auth.denteClinicalReadHeaders(extra)
					: extra || {};
			// Обязательно добавляем id организации к запросу, бэкенд не пустит без него.
			// Если id пусто, значит пользователь не прошел проверку в settingsTab — вернет
			// 401, а не подставить чужую организацию.
			return headers;
		},
		[auth],
	);

	// Barcode Scanner State
	const [scannedBarcode, setScannedBarcode] = useState<string>("");
	const [isScannerActive, setIsScannerActive] = useState(false);

	const [activeSubTab, setActiveSubTab] = useState<"inventory" | "rules">(
		"inventory",
	);
	const [selectedServiceId, setSelectedServiceId] = useState<string>("");
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const [rulesList, setRulesList] = useState<any[]>([]);
	const [isLoadingRules, setIsLoadingRules] = useState(false);
	const [selectedInventoryItemId, setSelectedInventoryItemId] =
		useState<string>("");
	const [quantityToDeduct, setQuantityToDeduct] = useState<string>("1");

	/*
	 * Выбор услуги очищает форму под ней.
	 *
	 * БЫЛО: смена услуги в верхнем списке меняла только саму услугу. Материал и
	 * количество, набранные для предыдущей, оставались в форме заряженными — а
	 * форма стоит прямо под этим списком и выглядит как настройки уже НОВОЙ
	 * услуги. Администратор выбирал «Анестетик, 3 шт.» для одной услуги, не
	 * сохранял, переключался на другую и нажимал «Добавить»: правило уходило на
	 * чужую услугу. Дальше анестетик молча списывается на приёмах, где его не
	 * используют, а там, где используют, не списывается вовсе.
	 */
	const selectService = (serviceId: string) => {
		setSelectedServiceId(serviceId);
		setSelectedInventoryItemId("");
		setQuantityToDeduct("1");
	};

	/*
	 * Отказ при загрузке правил списания надо помнить отдельно от пустоты.
	 *
	 * БЫЛО: на упавший запрос показывался toast, а список правил оставался
	 * пустым — и панель писала «Для этой услуги пока не настроено автоматическое
	 * списание материалов. При завершении приёма материалы списываться не будут.»
	 * Это утверждение о том, чего экран не знает, и оно опасно в обе стороны:
	 * администратор верит, что списания нет, и заводит правило заново — второе
	 * такое же правило спишет материал дважды за каждый приём; либо наоборот
	 * закупает материал вручную, считая, что склад его не тронет.
	 */
	const [rulesError, setRulesError] = useState<string | null>(null);

	const fetchRules = useCallback(
		async (serviceId: string) => {
			if (!serviceId) {
				setRulesList([]);
				setRulesError(null);
				return;
			}
			try {
				setIsLoadingRules(true);
				const res = await fetch(
					`/api/inventory/${organizationId}/rules/${serviceId}`,
					{
						headers: getHeaders(),
					},
				);
				if (res.ok) {
					const data = await res.json();
					setRulesList(Array.isArray(data) ? data : []);
					setRulesError(null);
				} else {
					/*
					 * Список обнуляем и здесь: показывать правила от прошлой услуги, пока
					 * рядом стоит выбор другой, — значит подсунуть чужие расходники.
					 */
					setRulesList([]);
					setRulesError(
						res.status === 401 || res.status === 403
							? "Правила списания не показаны: доступ не подтверждён. Войдите в кабинет заново."
							: "Правила списания не загрузились. Неизвестно, списываются материалы по этой услуге или нет — нажмите «Повторить».",
					);
					showToast("Ошибка загрузки правил", "error");
				}
			} catch (e) {
				logger.error(e);
				setRulesList([]);
				setRulesError(
					"Нет связи с сервером: правила списания не загрузились. Неизвестно, списываются материалы по этой услуге или нет — проверьте интернет и нажмите «Повторить».",
				);
				showToast("Ошибка загрузки правил", "error");
			} finally {
				setIsLoadingRules(false);
			}
		},
		[organizationId, getHeaders],
	);

	useEffect(() => {
		if (activeSubTab === "rules" && selectedServiceId) {
			fetchRules(selectedServiceId);
		}
	}, [activeSubTab, selectedServiceId, fetchRules]);

	/*
	 * Замок на кнопку «Добавить материал в расходники».
	 *
	 * БЫЛО: кнопка оставалась живой на время запроса, а правило создаётся через
	 * POST. Второе нажатие давало ВТОРОЕ такое же правило на ту же услугу, и
	 * автоматическое списание при приёме срабатывало по каждому — материал уходил
	 * со склада в двойном количестве при каждом приёме, пока правило не заметят.
	 */
	const isSavingRuleRef = useRef(false);
	const [isSavingRule, setIsSavingRule] = useState(false);

	const handleAddRule = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedServiceId || !selectedInventoryItemId || !quantityToDeduct)
			return;

		const qty = parseInt(quantityToDeduct, 10);
		if (Number.isNaN(qty) || qty <= 0) {
			showToast("Введите корректное количество", "error");
			return;
		}
		if (isSavingRuleRef.current) return;
		isSavingRuleRef.current = true;
		setIsSavingRule(true);

		try {
			const res = await fetch(`/api/inventory/${organizationId}/rules`, {
				method: "POST",
				headers: getHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					serviceId: selectedServiceId,
					inventoryItemId: selectedInventoryItemId,
					quantityToDeduct: qty,
				}),
			});

			if (res.ok) {
				showToast("Правило списания сохранено", "success");
				setSelectedInventoryItemId("");
				setQuantityToDeduct("1");
				fetchRules(selectedServiceId);
			} else {
				showToast("Ошибка сохранения правила", "error");
			}
		} catch (e) {
			logger.error(e);
			showToast("Системная ошибка", "error");
		} finally {
			// Снимаем в любом исходе: после отказа правило должно быть можно завести снова.
			isSavingRuleRef.current = false;
			setIsSavingRule(false);
		}
	};

	const handleDeleteRule = async (ruleId: string) => {
		setConfirmDialog({
			isOpen: true,
			title: "Удалить правило?",
			message: "Удалить это правило списания? Это действие необратимо.",
			onConfirm: async () => {
				setConfirmDialog(null);
				try {
					const res = await fetch(
						`/api/inventory/${organizationId}/rules/${ruleId}`,
						{
							method: "DELETE",
							headers: getHeaders(),
						},
					);

					if (res.ok) {
						showToast("Правило списания удалено", "success");
						fetchRules(selectedServiceId);
					} else {
						showToast("Ошибка удаления правила", "error");
					}
				} catch (e) {
					logger.error(e);
					showToast("Системная ошибка", "error");
				}
			},
		});
	};

	const [searchQuery, setSearchQuery] = useState("");

	// Add/Edit Modal
	const [showModal, setShowModal] = useState(false);
	const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
	/*
	 * Форма материала открывается пустой.
	 *
	 * Здесь стояли порог «5» и цена «0» как уже введённые значения. Не тронув
	 * поля, кладовщик заносил в базу выдуманный минимальный остаток и нулевую
	 * цену — а отличить подставленное от набранного руками в заполненном поле
	 * нельзя. Ноль в цене особенно тих: материал бесплатный, себестоимость
	 * лечения занижена, и никто не спохватится.
	 *
	 * Прежние числа остались подсказками в пустых полях.
	 */
	const [formData, setFormData] = useState({
		name: "",
		threshold: "",
		unitCostRub: "",
		sku: "",
		barcode: "",
		lotNumber: "",
		expirationDate: "",
	});

	// Confirm Dialog State
	const [confirmDialog, setConfirmDialog] = useState<{
		isOpen: boolean;
		title: string;
		message: string;
		onConfirm: () => void;
	} | null>(null);

	// Adjust Modal
	const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(
		null,
	);
	const [adjustAmount, setAdjustAmount] = useState("");
	const [adjustType, setAdjustType] = useState<"in" | "out">("in");
	/*
	 * Замок на повторное движение остатка.
	 *
	 * БЫЛО: кнопка «Списать» ничем не запиралась и на время запроса выглядела
	 * живой. Сервер на PATCH .../stock прибавляет adjustment к остатку, а не
	 * ставит итог, поэтому два нажатия подряд — а по медленной сети кладовщик
	 * жмёт второй раз всегда — уходили двумя запросами и списывали материал
	 * ДВАЖДЫ. На экране это выглядело как одно списание: «Остаток изменён»
	 * показывался один раз, список перечитывался после второго ответа, и разницу
	 * замечали только при инвентаризации.
	 *
	 * Признак держим в ref, а не только в состоянии: два клика успевают попасть в
	 * один такт до перерисовки, и обработчик второго увидел бы прежнее значение
	 * состояния. Состояние рядом нужно, чтобы кнопка погасла и сменила надпись.
	 */
	const isAdjustingStockRef = useRef(false);
	const [isAdjustingStock, setIsAdjustingStock] = useState(false);
	/*
	 * Такой же замок на карточку материала.
	 *
	 * БЫЛО: кнопка «Сохранить» оставалась живой, пока сервер отвечал. Новый
	 * материал создаётся через POST — повтор не переписывает запись, а добавляет
	 * вторую: на полке одна позиция, а в списке две одинаковые. Остаток дальше
	 * ведут по одной из них, а списывают со второй, и склад расходится с полкой
	 * навсегда. Замок в ref по той же причине, что и у остатка: два клика
	 * успевают попасть в один такт до перерисовки.
	 */
	const isSavingItemRef = useRef(false);
	const [isSavingItem, setIsSavingItem] = useState(false);

	/*
	 * --- Слушатель сканера штрихкодов (эмуляция «клавиатурного» сканера) ---
	 *
	 * Объявлен ЗДЕСЬ, ниже состояний окон, а не выше вместе с остальными
	 * эффектами: ему нужны showModal, adjustingItem и confirmDialog в списке
	 * зависимостей, а список зависимостей вычисляется при отрисовке — не потом, в
	 * теле обработчика. Стой этот useEffect до объявления тех состояний, отрисовка
	 * падала бы с ReferenceError по временной мёртвой зоне.
	 */
	useEffect(() => {
		let barcodeBuffer = "";
		let lastKeyTime = 0;

		const handleKeyDown = (e: KeyboardEvent) => {
			// Ignore if user is typing in an input or textarea
			const target = e.target as HTMLElement;
			if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

			const currentTime = Date.now();
			// Barcode scanners type very fast (usually < 30ms per character).
			// If more than 100ms passed since last key, reset the buffer.
			if (currentTime - lastKeyTime > 100) {
				barcodeBuffer = "";
			}
			lastKeyTime = currentTime;

			if (e.key === "Enter") {
				if (barcodeBuffer.length > 3) {
					// Likely a barcode scan
					setScannedBarcode(barcodeBuffer);
					setIsScannerActive(true);
					showToast(`Отсканирован код: ${barcodeBuffer}`, "success");

					/*
					 * Сканирование при открытом окне не сбрасывает начатую работу.
					 *
					 * БЫЛО: обработчик всегда шёл по ветке «неизвестный товар» —
					 * setFormData с ПУСТЫМИ полями, setEditingItem(null),
					 * setShowModal(true). Ранний выход спасал только при фокусе внутри
					 * поля ввода, а поле штрихкода прямо приглашает «или отсканируйте
					 * сканером»: сканер жмут, не наведя курсор в поле.
					 * Последствия при открытой карточке материала:
					 *   набранные наименование, цена, партия и срок исчезали молча —
					 *     форма выглядела свежеоткрытой;
					 *   правка существующего материала превращалась в создание нового
					 *     (editingItem обнулялся). Кладовщик открывал перчатки на
					 *     правку, сканировал их же штрихкод, нажимал «Сохранить» — и на
					 *     складе появлялась ВТОРАЯ позиция «перчатки» вместо
					 *     исправленной первой.
					 * Теперь при открытой карточке код просто ложится в поле штрихкода,
					 * как и обещает подсказка, а остальные поля остаются на месте.
					 */
					if (showModal) {
						setFormData((prev) => ({ ...prev, barcode: barcodeBuffer }));
						barcodeBuffer = "";
						return;
					}
					/*
					 * При открытом окне остатка или подтверждении удаления сканирование
					 * не делает ничего: подменять человеку окно, пока он подтверждает
					 * списание или удаление, нельзя — подтвердит он уже не то, что читал.
					 */
					if (adjustingItem || confirmDialog?.isOpen) {
						barcodeBuffer = "";
						return;
					}

					// Optional: Auto-filter the list or open the "Add" modal for this item
					const found = items.find(
						(i) => i.barcode === barcodeBuffer || i.sku === barcodeBuffer,
					);
					if (found) {
						showToast(`Найден товар: ${found.name}`, "info");
						setSearchQuery(barcodeBuffer);
					} else {
						showToast("Неизвестный товар. Добавьте его в базу.", "warning");
						setFormData({
							name: "",
							threshold: "",
							unitCostRub: "",
							sku: "",
							barcode: barcodeBuffer,
							lotNumber: "",
							expirationDate: "",
						});
						setEditingItem(null);
						setShowModal(true);
					}
				}
				barcodeBuffer = "";
			} else if (e.key.length === 1) {
				barcodeBuffer += e.key;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [items, showModal, adjustingItem, confirmDialog]);

	/*
	 * Отказ сервера надо помнить, а не только мигнуть уведомлением.
	 *
	 * БЫЛО: при неудачном запросе остатков показывался toast и всё. Список
	 * оставался пустым, признак загрузки снимался — и экран рисовал «Склад пуст.
	 * Добавьте первый материал.» Уведомление гаснет через секунды, а ложь на
	 * экране остаётся: кладовщик читал «пусто» при живом складе и заносил
	 * материалы заново поверх настоящих остатков, удваивая позиции.
	 *
	 * Текст храним готовым к показу, человеческим, с подсказкой что делать.
	 */
	const [loadError, setLoadError] = useState<string | null>(null);

	const fetchItems = useCallback(async () => {
		try {
			setIsLoading(true);
			const res = await fetch(`/api/inventory/${organizationId}`, {
				headers: getHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				setItems(Array.isArray(data) ? data.map(inventoryItemFromServer) : []);
				setLoadError(null);
			} else {
				/*
				 * Просроченный вход и молчащий сервер лечатся по-разному, поэтому
				 * разделены: в первом случае помогает только новый вход, во втором —
				 * повтор запроса.
				 */
				setLoadError(
					res.status === 401 || res.status === 403
						? "Склад не показан: доступ к остаткам не подтверждён. Войдите в кабинет заново."
						: "Склад не отвечает, остатки не загружены. Нажмите «Повторить»; если не поможет — сообщите администратору.",
				);
				showToast("Ошибка загрузки склада", "error");
			}
		} catch (err: unknown) {
			setLoadError(
				err instanceof Error
					? err.message
					: "Не удалось загрузить остатки со склада",
			);
			setItems([]);
			setIsLoading(false);
		} finally {
			setIsLoading(false);
		}
	}, [organizationId, getHeaders]);

	/*
	 * Без организации склад не грузится — и это надо показать, а не крутить.
	 *
	 * Экран получает organizationId из профиля клиники через `?? ""`. Пока
	 * профиль не пришёл, строка пустая, запрос не уходит, а isLoading остаётся
	 * true навсегда: «Загрузка склада...» до конца сеанса, без ошибки и без
	 * единой кнопки. Снимаем признак загрузки — тогда экран покажет своё пустое
	 * состояние вместо вечной крутилки.
	 */
	useEffect(() => {
		if (organizationId) {
			fetchItems();
			return;
		}
		setIsLoading(false);
	}, [organizationId, fetchItems]);

	const openAddModal = () => {
		setEditingItem(null);
		setFormData({
			name: "",
			threshold: "",
			unitCostRub: "",
			sku: "",
			barcode: "",
			lotNumber: "",
			expirationDate: "",
		});
		setShowModal(true);
	};

	const openEditModal = (item: InventoryItem) => {
		setEditingItem(item);
		setFormData({
			name: item.name,
			threshold: String(item.criticalThreshold),
			/*
			 * Цена и порог берутся как есть, без подстановки нуля вместо пустоты.
			 *
			 * Стояло `item.unitCostRub || "0"`: у материала без цены форма
			 * открывалась с нулём, выглядящим введённым, и при сохранении ноль
			 * уходил в базу как настоящая цена.
			 */
			unitCostRub: item.unitCostRub ?? "",
			sku: item.sku || "",
			barcode: item.barcode || "",
			lotNumber: item.lotNumber || "",
			expirationDate: item.expirationDate || "",
		});
		setShowModal(true);
	};

	const handleSaveItem = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.name.trim()) return;
		/*
		 * Цена читается общей normalizeRubAmountInput, и мусор больше не становится нулём.
		 *
		 * БЫЛО: `parseFloat(formData.unitCostRub) || 0`. Поле цены объявлено
		 * type="number", а подсказка в нём предлагала ввести «12,50» — с запятой,
		 * как пишут цену по-русски. Для type="number" запятая делает содержимое
		 * недопустимым, и браузер отдаёт из value ПУСТУЮ строку, хотя набранное
		 * человек в поле видит. Дальше parseFloat("") давал NaN, `|| 0` тихо
		 * превращал его в ноль — материал сохранялся бесплатным. Ноль в цене
		 * никто не замечает: себестоимость лечения занижена, стоимость склада
		 * занижена, жалоб нет.
		 *
		 * Пустая цена по-прежнему значит «цену не задавали» и уходит нулём. А вот
		 * набранное, но неразобранное значение — это отказ с объяснением, а не
		 * молчаливый ноль: терять введённую цену нельзя.
		 */
		const typedCost = formData.unitCostRub.trim();
		const parsedCost = typedCost ? normalizeRubAmountInput(typedCost) : 0;
		if (parsedCost === null) {
			showToast("Цену укажите цифрами, копейки после запятой: 12,50", "error");
			return;
		}
		const unitCost = parsedCost;
		/*
		 * Пустой порог — это ноль, а не пятёрка.
		 *
		 * Стояло `|| 5`: не заполнив поле, кладовщик получал в базе выдуманный
		 * минимальный остаток, и склад начинал сигналить о дефиците материала,
		 * для которого порога никто не задавал. Ноль означает «следить не просили».
		 */
		const threshold = Math.max(0, parseInt(formData.threshold, 10) || 0);
		if (isSavingItemRef.current) return;
		isSavingItemRef.current = true;
		setIsSavingItem(true);
		try {
			if (editingItem) {
				const res = await fetch(
					`/api/inventory/${organizationId}/${editingItem.id}`,
					{
						method: "PUT",
						headers: getHeaders({
							"Content-Type": "application/json",
						}),
						body: JSON.stringify({
							name: formData.name.trim(),
							criticalThreshold: threshold,
							unitCostRub: unitCost,
							sku: formData.sku.trim() || null,
							barcode: formData.barcode.trim() || null,
							lotNumber: formData.lotNumber.trim() || null,
							expirationDate: formData.expirationDate.trim() || null,
						}),
					},
				);
				if (res.ok) {
					showToast("Материал обновлён", "success");
					setShowModal(false);
					fetchItems();
				} else {
					showToast("Ошибка изменения", "error");
				}
			} else {
				const res = await fetch(`/api/inventory/${organizationId}`, {
					method: "POST",
					headers: getHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						name: formData.name.trim(),
						criticalThreshold: threshold,
						unitCostRub: unitCost,
						stockQuantity: 0,
						sku: formData.sku.trim() || null,
						barcode: formData.barcode.trim() || null,
						lotNumber: formData.lotNumber.trim() || null,
						expirationDate: formData.expirationDate.trim() || null,
					}),
				});
				if (res.ok) {
					showToast("Материал добавлен", "success");
					setShowModal(false);
					fetchItems();
				} else {
					showToast("Ошибка добавления", "error");
				}
			}
		} catch (e) {
			logger.error(e);
			showToast("Системная ошибка", "error");
		} finally {
			// Снимаем в любом исходе: после отказа сохранение должно быть можно повторить.
			isSavingItemRef.current = false;
			setIsSavingItem(false);
		}
	};

	const handleDeleteItem = async (itemId: string, name: string) => {
		setConfirmDialog({
			isOpen: true,
			title: "Удалить материал?",
			message: `Удалить «${name}» со склада? Это действие необратимо.`,
			onConfirm: async () => {
				setConfirmDialog(null);
				try {
					const res = await fetch(
						`/api/inventory/${organizationId}/${itemId}`,
						{
							method: "DELETE",
							headers: getHeaders(),
						},
					);
					if (res.ok) {
						showToast("Материал удалён со склада", "success");
						fetchItems();
					} else {
						showToast("Ошибка удаления", "error");
					}
				} catch (e) {
					logger.error(e);
					showToast("Системная ошибка", "error");
				}
			},
		});
	};

	const handleAdjustStock = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!adjustingItem || !adjustAmount) return;

		const amount = parseInt(adjustAmount, 10);
		if (Number.isNaN(amount) || amount <= 0) return;
		/*
		 * Списать больше, чем лежит на полке, нельзя.
		 *
		 * Проверено по apps/api/src/routes/inventory.ts (PATCH .../stock): сервер
		 * берёт Math.max(-currentStock, adjustment), то есть ТИХО урезает списание
		 * до остатка и отвечает успехом. Минуса в базе не будет — но и отказа не
		 * будет: списание 50 при остатке 10 проходило как «Остаток изменён», а 40
		 * штук просто исчезали из операции. Человек уверен, что списал 50, отчёт
		 * говорит 10, и никто об этом не спорит.
		 *
		 * Погашенной кнопки мало: нажатие Enter в поле количества отправляет форму
		 * мимо кнопки. Проверка стоит здесь, потому что это единственная дорога к
		 * запросу. Отказ объясняем словами — беззвучный `return` выглядел бы как
		 * сломанная кнопка.
		 */
		if (adjustType === "out" && amount > adjustingItem.stockQuantity) {
			showToast(
				`Нельзя списать ${amount} шт.: на складе ${adjustingItem.stockQuantity} шт. Исправьте количество или оприходуйте поступление.`,
				"error",
			);
			return;
		}
		// Второе нажатие по тому же остатку игнорируем: первый запрос ещё в пути.
		if (isAdjustingStockRef.current) return;
		isAdjustingStockRef.current = true;
		setIsAdjustingStock(true);

		const adjustment = adjustType === "in" ? amount : -amount;

		try {
			const res = await fetch(
				`/api/inventory/${organizationId}/${adjustingItem.id}/stock`,
				{
					method: "PATCH",
					headers: getHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({ adjustment }),
				},
			);
			if (res.ok) {
				setAdjustingItem(null);
				setAdjustAmount("");
				showToast("Остаток изменён", "success");
				fetchItems();
			} else {
				showToast("Ошибка изменения остатка", "error");
			}
		} catch (e) {
			logger.error(e);
			showToast("Системная ошибка", "error");
		} finally {
			/*
			 * Замок снимаем в любом исходе: после отказа сервера кладовщик обязан
			 * иметь возможность повторить списание, иначе окно останется мёртвым.
			 */
			isAdjustingStockRef.current = false;
			setIsAdjustingStock(false);
		}
	};

	const filteredItems = useMemo(() => {
		if (!searchQuery.trim()) return items;
		const q = searchQuery.toLowerCase();
		return items.filter(
			(i) =>
				i.name.toLowerCase().includes(q) ||
				i.sku?.toLowerCase().includes(q) ||
				i.barcode?.toLowerCase().includes(q),
		);
	}, [items, searchQuery]);

	const criticalItemsCount = useMemo(() => {
		return items.filter((i) => i.stockQuantity <= i.criticalThreshold).length;
	}, [items]);

	const totalValue = useMemo(() => {
		const totalKopecks = sumKopecks(
			items.map((item) => {
				const unitCostKopecks = parseKopecks(item.unitCostRub || "0");
				const quantity = Math.max(
					0,
					Math.round(Number(item.stockQuantity) || 0),
				);
				return multiplyKopecks(unitCostKopecks, quantity);
			}),
		);
		return totalKopecks / 100;
	}, [items]);

	return {
		items,
		filteredItems,
		isLoading,
		loadError,
		auth,
		dashboard,
		searchQuery,
		setSearchQuery,
		showModal,
		setShowModal,
		editingItem,
		setEditingItem,
		formData,
		setFormData,
		fetchItems,
		fetchRules,
		openAddModal,
		openEditModal,
		handleSaveItem,
		handleDeleteItem,
		adjustingItem,
		setAdjustingItem,
		adjustAmount,
		setAdjustAmount,
		adjustType,
		setAdjustType,
		handleAdjustStock,
		isAdjustingStock,
		isSavingItem,
		isSavingRule,
		criticalItemsCount,
		lowStockCount: criticalItemsCount,
		totalValue,
		totalItems: items.length,
		confirmDialog,
		setConfirmDialog,
		scannedBarcode,
		isScannerActive,
		setIsScannerActive,
		activeSubTab,
		setActiveSubTab,
		selectedServiceId,
		setSelectedServiceId,
		selectService,
		rulesList,
		isLoadingRules,
		rulesError,
		selectedInventoryItemId,
		setSelectedInventoryItemId,
		quantityToDeduct,
		setQuantityToDeduct,
		handleAddRule,
		handleDeleteRule,
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		servicesList: (dashboard as any)?.prices || dashboard?.serviceCatalog || [],
	};
}
