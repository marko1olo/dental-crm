import { Calendar, FlaskConical, Link, Trash2 } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { denteAdminSecretRequestHeaders, money } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { actionFailureToast } from "../../lib/panelStateText";
import { normalizeRubAmountInput } from "../../rubAmountInput";
import { useAppStore } from "../../store/appStore";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";

interface LabOrder {
	id: string;
	patientId: string;
	patientName: string;
	doctorId: string | null;
	doctorName: string | null;
	secureToken: string;
	toothFdi: string | null;
	material: string | null;
	colorVita: string | null;
	status:
		| "draft"
		| "sent"
		| "in_progress"
		| "shipped"
		| "received"
		| "refitting"
		| "completed";
	dueDate: string | null;
	clinicalNotes: string | null;
	labComments: string | null;
	attachedImageUrl: string | null;
	priceRub: number | null;
	createdAt: string;
}

export function LabOrdersPanel({ patientId }: { patientId: string }) {
	const { auth, dashboard } = useAppLogicContext();

	/*
	 * ЗАКАЗЫ В ЛАБОРАТОРИЮ МОЛЧА НЕ ЗАГРУЖАЛИСЬ. Панель стоит на вкладке
	 * «Рентгены и Диагностика» экрана «Приём», а этот экран отрисован ВЫШЕ
	 * AppLogicProvider — контекст здесь пуст, и `auth` равен undefined. Запрос
	 * падал на `auth.denteClinicalReadHeaders()` внутри catch, список
	 * оставался пустым, и врач видел «заказов нет» вместо настоящих заказов.
	 *
	 * denteAdminSecretRequestHeaders — тот же построитель заголовков, только
	 * без секрета клинической зоны: токены клиники и сотрудника он берёт сам.
	 * Когда контекст есть, работает прежний путь с секретом.
	 */
	const readHeaders = useCallback(
		(extra: Record<string, string> = {}) =>
			auth?.denteClinicalReadHeaders
				? auth.denteClinicalReadHeaders(extra)
				: denteAdminSecretRequestHeaders(extra),
		[auth],
	);
	const liveStatus = useAppStore(
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		(state) => (state as any).labOrderStatuses?.[patientId],
	);
	const [orders, setOrders] = useState<LabOrder[]>([]);
	/*
		Первая отрисовка — уже загрузка, а не пустота: запрос уходит сразу после
		неё. Раньше кадр между ними успевал показать «Нет активных заказов ЗТЛ».
	*/
	const [isLoading, setIsLoading] = useState(Boolean(patientId));
	/*
		ОТКАЗ СЕРВЕРА ПОКАЗЫВАЛСЯ КАК «НЕТ ЗАКАЗОВ».

		ЧТО БЫЛО СЛОМАНО. Загрузка списка проверяла `if (res.ok)` и на любом другом
		ответе не делала НИЧЕГО: ни сообщения, ни следа. Ошибка сети попадала в
		catch и уходила в logger.error — туда врач не смотрит. Список при этом
		оставался пустым, и экран говорил «Нет активных заказов ЗТЛ».

		ЧТО ВИДЕЛ ВРАЧ. Коронка заказана и делается в лаборатории, но сервер
		ответил отказом (истёк доступ, упала база, нет сети) — на экране ровно то
		же, что у пациента без заказов. Дальше врач либо заказывает ту же коронку
		ВТОРОЙ раз, либо говорит пациенту «ничего не заказано». Отсюда и деньги, и
		сорванный приём под установку.

		ЧТО СТАЛО. Три раздельных состояния: идёт загрузка; отказ — человеческим
		текстом, с прямым предупреждением не заказывать повторно и кнопкой
		повторить; честная пустота — с указанием, откуда здесь берутся наряды.
	*/
	const [loadError, setLoadError] = useState<string | null>(null);
	const [isCreating, setIsCreating] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	// Form state for new ZTL order
	const [toothFdi, setToothFdi] = useState("");
	const [material, setMaterial] = useState("zirconia");
	const [colorVita, setColorVita] = useState("A3");
	const [dueDate, setDueDate] = useState("");
	const [clinicalNotes, setClinicalNotes] = useState("");
	const [priceRub, setPriceRub] = useState("");
	const [doctorId, setDoctorId] = useState("");

	const staff = dashboard?.clinicSettings?.staff || [];
	const doctors = staff.filter(
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		(s: any) => s.role === "doctor" || s.role === "Врач" || s.role === "admin",
	);

	useEffect(() => {
		if (doctors.length > 0 && !doctorId) {
			setDoctorId(doctors[0]?.id || "");
		}
	}, [doctors, doctorId]);

	/*
		Чей список мы показываем прямо сейчас. Нужен потому, что ответ сервера по
		ПРОШЛОМУ пациенту приходит уже после переключения карточки: без этой
		отметки он спокойно затирал список нового пациента чужими нарядами.
	*/
	const shownPatientIdRef = useRef(patientId);

	/** Отказ сервера словами, которые понятны без обучения. Кода состояния мало. */
	const loadFailureText = useCallback((status: number): string => {
		if (status === 401 || status === 403)
			return "Нет прав смотреть заказы в лабораторию: доступ к карте закрыт или истёк вход.";
		if (status === 404) return "Раздел заказов в лабораторию не отвечает.";
		if (status >= 500)
			return "Программа не смогла получить список заказов: сбой на сервере клиники.";
		return `Программа не смогла получить список заказов (ответ ${status}).`;
	}, []);

	const fetchOrders = useCallback(async () => {
		const requestedPatientId = patientId;
		try {
			setIsLoading(true);
			const res = await fetch(
				`/api/clinical/lab-orders?patientId=${requestedPatientId}`,
				{
					headers: readHeaders(),
				},
			);
			// Пока ждали ответ, врач ушёл в другую карту — этот ответ уже не про неё.
			if (shownPatientIdRef.current !== requestedPatientId) return;
			if (res.ok) {
				const data = await res.json();
				setOrders(Array.isArray(data) ? data : []);
				setLoadError(null);
			} else {
				setLoadError(loadFailureText(res.status));
			}
		} catch (e) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(e as { status?: number })?.status ?? null,
				),
				"error",
			);
			logger.error("Failed to load lab orders", e);
			if (shownPatientIdRef.current !== requestedPatientId) return;
			setLoadError(
				"Программа не смогла связаться с сервером клиники, чтобы получить список заказов.",
			);
		} finally {
			if (shownPatientIdRef.current === requestedPatientId) {
				setIsLoading(false);
			}
		}
	}, [patientId, readHeaders, loadFailureText]);

	/*
		ПАНЕЛЬ НЕ ПЕРЕСОЗДАЁТСЯ ПРИ СМЕНЕ ПАЦИЕНТА, И ЭТО СТОИЛО БЫ ЧУЖОГО НАРЯДА.

		ЧТО БЫЛО СЛОМАНО. Панель стоит в карточке приёма (VisitDiagnosticsTab) как
		<LabOrdersPanel patientId={activePatient.id} /> — без key. React такой
		компонент не пересоздаёт, он лишь отдаёт ему новый patientId, а всё
		внутреннее состояние остаётся от ПРЕДЫДУЩЕГО пациента: и поля наряда, и
		уже загруженный список.

		ЧТО ВИДЕЛ ВРАЧ. Набрал по Петрову «зуб 16, цирконий, 25 000, уступ
		пришеечный», не отправил, перешёл в карту Сидорова — и увидел на экране
		Сидорова заполненный наряд Петрова. Кнопка «Создать наряд ЗТЛ» отправляет
		patientId Сидорова: зуб, цена и примечание уезжают в лабораторию под чужим
		именем. Список ниже врал так же — под именем Сидорова висели наряды
		Петрова, и «удалить» со сменой статуса в этих строках работали по
		настоящим, то есть по чужим, заказам.

		ЧТО СТАЛО. Смена пациента чистит и список, и поля наряда. Пустой список
		честнее заряженного чужим. «Лечащий врач» намеренно не сбрасывается: это
		выбор смены, а не свойство пациента, и он всё равно тут же вернулся бы к
		первому врачу из списка.
	*/
	useEffect(() => {
		shownPatientIdRef.current = patientId;
		setOrders([]);
		// Отказ по прошлому пациенту к новому не относится.
		setLoadError(null);
		setToothFdi("");
		setDueDate("");
		setClinicalNotes("");
		setPriceRub("");
		setMaterial("zirconia");
		setColorVita("A3");
		if (patientId) {
			void fetchOrders();
		}
	}, [patientId, fetchOrders]);

	// A technician changing an order from the guest portal broadcasts over WS
	// into the app store; refetch so the clinic view reflects it live instead of
	// only on remount.
	useEffect(() => {
		if (patientId && liveStatus) {
			fetchOrders();
		}
	}, [liveStatus, patientId, fetchOrders]);

	const handleCreateOrder = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isCreating) return;
		/*
			ЦЕНА РАБОТЫ СЧИТАЛАСЬ ЦЕЛЫМИ РУБЛЯМИ И МОЛЧА ТЕРЯЛАСЬ.

			ЧТО БЫЛО СЛОМАНО. Сумма уходила на сервер как parseInt(priceRub):
			«12500,50» превращалось в 12500 (parseInt читает до запятой), «12 500»
			с пробелом — в 12, а «двенадцать тысяч» — в NaN, то есть в null.

			ЧТО ВИДЕЛ ВРАЧ. Всплывало «Заказ успешно создан», и наряд действительно
			создавался — но с ценой, которой врач не вводил, или совсем без цены.
			Разбирается это через месяц при сверке с лабораторией.

			ЧТО СТАЛО. Разбор суммы один на всё приложение —
			normalizeRubAmountInput: он понимает пробелы и запятую и держит копейки.
			Непонятная сумма больше не превращается в null втихую: заказ не уходит,
			а экран говорит, что поправить.
		*/
		const priceRubValue = normalizeRubAmountInput(priceRub);
		if (priceRub.trim() && priceRubValue === null) {
			showToast(
				"Стоимость непонятна. Впишите сумму цифрами, например 12500 или 12500,50 — и создайте наряд заново.",
				"error",
			);
			return;
		}
		setIsCreating(true);
		try {
			const res = await fetch("/api/clinical/lab-orders", {
				method: "POST",
				headers: readHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId,
					doctorId: doctorId || null,
					toothFdi: toothFdi || null,
					material,
					colorVita,
					dueDate: dueDate || null,
					clinicalNotes,
					priceRub: priceRubValue,
				}),
			});

			if (res.ok) {
				showToast(
					"Заказ зуботехнической лаборатории (ЗТЛ) успешно создан",
					"success",
				);
				setToothFdi("");
				setDueDate("");
				setClinicalNotes("");
				setPriceRub("");
				fetchOrders();
			} else {
				const err = await res.json();
				showToast(err.message || "Ошибка создания заказа ЗТЛ", "error");
			}
		} catch (err) {
			showToast(
				actionFailureToast(
					"Ошибка создания заказа ЗТЛ",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
		} finally {
			setIsCreating(false);
		}
	};

	const handleDeleteOrder = async (id: string) => {
		if (deletingId === id) return;
		if (!window.confirm("Удалить заказ зуботехнической лаборатории?")) return;
		setDeletingId(id);
		try {
			const res = await fetch(`/api/clinical/lab-orders/${id}`, {
				method: "DELETE",
				headers: readHeaders(),
			});
			if (res.ok) {
				showToast("Заказ удален", "success");
				fetchOrders();
			} else {
				showToast("Ошибка удаления", "error");
			}
		} catch (err) {
			showToast(
				actionFailureToast(
					"Ошибка удаления заказа",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
		} finally {
			setDeletingId(null);
		}
	};

	const handleStatusChange = async (id: string, status: LabOrder["status"]) => {
		// Optimistic: reflect the new status immediately, roll back on failure.
		const previous = orders;
		setOrders((current) =>
			current.map((o) => (o.id === id ? { ...o, status } : o)),
		);
		try {
			const res = await fetch(`/api/clinical/lab-orders/${id}`, {
				method: "PUT",
				headers: readHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({ status }),
			});
			if (res.ok) {
				showToast("Статус заказа ЗТЛ обновлён", "success");
				fetchOrders();
			} else {
				setOrders(previous);
				const err = await res.json();
				showToast(err.message || "Ошибка обновления статуса", "error");
			}
		} catch (err) {
			setOrders(previous);
			showToast(
				actionFailureToast(
					"Ошибка обновления статуса",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
		}
	};

	const copyPortalLink = (token: string) => {
		const url = `${window.location.origin}/#/portal/lab-order/${token}`;
		navigator.clipboard.writeText(url);
		showToast("Ссылка для зуботехника скопирована в буфер обмена", "success");
	};

	// Mirrors the <option> set in the create form so every material renders with
	// a correct label instead of falling back to "Металлокерамика".
	const materialLabels: Record<string, string> = {
		zirconia: "Цирконий",
		emax: "E.max",
		pfm: "Металлокерамика",
		composite: "Композит",
		temporary: "Временная пластмасса",
	};

	const statusLabels = {
		draft: "Черновик",
		sent: "Отправлен в лабораторию",
		in_progress: "В работе у техника",
		shipped: "Отправлен курьером",
		received: "Получен клиникой",
		refitting: "Переделка",
		completed: "Установлен пациенту",
	};

	// Statuses the clinic controls directly (the technician owns in_progress /
	// shipped / refitting from the guest portal).
	const clinicStatusFlow: LabOrder["status"][] = [
		"draft",
		"sent",
		"received",
		"completed",
	];

	const statusColors = {
		draft: "text-slate-400 border-slate-700/50 bg-slate-800/40",
		sent: "text-blue-400 border-blue-500/30 bg-blue-500/10",
		in_progress: "text-amber-400 border-amber-500/30 bg-amber-500/10",
		shipped: "text-purple-400 border-purple-500/30 bg-purple-500/10",
		received: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10",
		refitting: "text-rose-400 border-rose-500/30 bg-rose-500/10",
		completed: "text-teal-400 border-teal-500/30 bg-teal-500/10",
	};

	return (
		<div className="space-y-4">
			{/* Create Form */}
			<form
				onSubmit={handleCreateOrder}
				className="bg-slate-800/20 p-4 border border-slate-700/40 rounded-xl space-y-4"
			>
				<h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
					<FlaskConical className="w-4 h-4 text-teal-400" />
					Новый наряд ЗТЛ
				</h4>

				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<div className="space-y-1">
						<label htmlFor="lab-order-tooth" className="text-xs text-slate-400">
							Зуб (FDI)
						</label>
						<input
							id="lab-order-tooth"
							type="text"
							placeholder="Напр. 16, 24"
							value={toothFdi}
							onChange={(e) => setToothFdi(e.target.value)}
							className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
						/>
					</div>

					<div className="space-y-1">
						<label
							htmlFor="lab-order-material"
							className="text-xs text-slate-400"
						>
							Материал
						</label>
						<select
							id="lab-order-material"
							value={material}
							onChange={(e) => setMaterial(e.target.value)}
							className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
						>
							<option value="zirconia">Диоксид циркония</option>
							<option value="emax">E.max (керамика)</option>
							<option value="pfm">Металлокерамика</option>
							<option value="composite">Композит</option>
							<option value="temporary">Временная пластмасса</option>
						</select>
					</div>

					<div className="space-y-1">
						<label
							htmlFor="lab-order-color-vita"
							className="text-xs text-slate-400"
						>
							Цвет (Vita)
						</label>
						<select
							id="lab-order-color-vita"
							value={colorVita}
							onChange={(e) => setColorVita(e.target.value)}
							className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
						>
							{[
								"OM1",
								"OM2",
								"OM3",
								"A1",
								"A2",
								"A3",
								"A3.5",
								"A4",
								"B1",
								"B2",
								"B3",
								"C1",
								"C2",
								"D2",
								"D3",
							].map((v) => (
								<option key={v} value={v}>
									{v}
								</option>
							))}
						</select>
					</div>

					<div className="space-y-1">
						<label htmlFor="lab-order-price" className="text-xs text-slate-400">
							Стоимость, ₽
						</label>
						{/*
							Было type="number". Такое поле в русском браузере не принимает
							запятую: «12500,50» стирается в пустоту прямо под рукой, и наряд
							уходит без цены. Обычное текстовое поле с цифровой клавиатурой на
							телефоне принимает и «12 500», и «12500,50» — разбирает их
							normalizeRubAmountInput при отправке.
						*/}
						<input
							id="lab-order-price"
							type="text"
							inputMode="decimal"
							placeholder="например 12500"
							value={priceRub}
							onChange={(e) => setPriceRub(e.target.value)}
							className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
						/>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					<div className="space-y-1">
						<label
							htmlFor="lab-order-doctor"
							className="text-xs text-slate-400"
						>
							Лечащий врач
						</label>
						<select
							id="lab-order-doctor"
							value={doctorId}
							onChange={(e) => setDoctorId(e.target.value)}
							className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
						>
							<option value="">Не указан</option>
							{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
							{doctors.map((doc: any) => (
								<option key={doc.id} value={doc.id}>
									{doc.fullName}
								</option>
							))}
						</select>
					</div>

					<div className="space-y-1">
						<label
							htmlFor="lab-order-due-date"
							className="text-xs text-slate-400"
						>
							Срок готовности
						</label>
						<input
							id="lab-order-due-date"
							type="datetime-local"
							value={dueDate}
							onChange={(e) => setDueDate(e.target.value)}
							className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
						/>
					</div>

					<div className="space-y-1">
						<label
							htmlFor="lab-order-clinical-notes"
							className="text-xs text-slate-400"
						>
							Клиническое примечание
						</label>
						<input
							id="lab-order-clinical-notes"
							type="text"
							placeholder="Опишите особенности прикуса, уступы..."
							value={clinicalNotes}
							onChange={(e) => setClinicalNotes(e.target.value)}
							className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
						/>
					</div>
				</div>

				<button
					type="submit"
					disabled={isCreating}
					aria-busy={isCreating}
					className="w-full py-2 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-[#1e293b] font-bold rounded-lg text-xs transition-colors shadow-md shadow-teal-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isCreating ? "Создание..." : "Создать наряд ЗТЛ"}
				</button>
			</form>

			{/* Orders List */}
			<div className="space-y-2">
				{loadError ? (
					<div
						role="alert"
						className="border border-rose-500/40 bg-rose-500/10 rounded-xl p-3 text-[13px] text-rose-200 space-y-2"
					>
						<p className="font-semibold m-0">{loadError}</p>
						<p className="m-0 text-rose-100/90">
							Это не значит, что заказов нет: список просто не пришёл. Не
							заказывайте работу повторно, пока список не откроется, — иначе
							лаборатория сделает и выставит её дважды. Нажмите «Попробовать
							снова», а если не открывается — уточните состояние работы у
							зуботехника по телефону.
						</p>
						<button
							type="button"
							onClick={() => void fetchOrders()}
							disabled={isLoading}
							className="py-1.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-60 text-rose-100 border border-rose-500/40 rounded-lg font-semibold transition-colors"
						>
							{isLoading ? "Загружаем…" : "Попробовать снова"}
						</button>
					</div>
				) : null}

				{isLoading && orders.length === 0 ? (
					<div className="text-center py-4 text-xs text-slate-400">
						Загрузка…
					</div>
				) : orders.length === 0 && !loadError ? (
					<div className="text-center py-6 text-xs text-slate-500 border border-dashed border-slate-700/60 rounded-xl">
						{/*
							Честная пустота: сказано, что список пришёл и он пуст, и откуда
							здесь вообще берутся наряды. Без второй строки «нет заказов»
							читается как «не загрузилось».
						*/}
						Заказов в зуботехническую лабораторию по этому пациенту пока нет.
						<br />
						Первый появится здесь сразу после того, как вы заполните наряд выше
						и нажмёте «Создать наряд ЗТЛ».
					</div>
				) : orders.length > 0 ? (
					<div className="space-y-2">
						{orders.map((order) => (
							<div
								key={order.id}
								className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
							>
								<div className="space-y-1">
									<div className="flex items-center gap-2 flex-wrap">
										<span className="font-semibold text-slate-200">
											Зуб {order.toothFdi || "весь рот"}
										</span>
										<span className="text-slate-400">·</span>
										{/*
											Было «не указ.» — обрубок с точкой, каким программы
											печатают отчёты, а не каким говорят с людьми. Слово
											дописано целиком и согласовано по роду: материал не
											указан, цвет не указан.
										*/}
										<span className="text-slate-300">
											{order.material
												? (materialLabels[order.material] ?? order.material)
												: "материал не указан"}
										</span>
										<span className="text-slate-400">·</span>
										<span className="text-slate-300">
											Цвет: {order.colorVita || "не указан"}
										</span>
										<span
											className={`px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wide uppercase ${statusColors[order.status]}`}
										>
											{statusLabels[order.status]}
										</span>
									</div>
									{order.clinicalNotes && (
										<p className="text-slate-400 italic">
											«{order.clinicalNotes}»
										</p>
									)}
									{/*
										Дата печаталась в формате браузера: toLocaleDateString() без
										языка на системе с английской локалью даёт «7/29/2026», и врач
										читает месяц как число дня. Срок готовности работы — не то
										место, где можно угадывать. Пишем по-русски и словами месяца,
										чтобы спутать было нечем.
									*/}
									{order.dueDate && (
										<div className="text-[11px] text-slate-400 flex items-center gap-1">
											<Calendar className="w-3.5 h-3.5 text-teal-400/80" />
											Срок:{" "}
											{new Date(order.dueDate).toLocaleDateString("ru-RU", {
												day: "numeric",
												month: "long",
											})}{" "}
											в{" "}
											{new Date(order.dueDate).toLocaleTimeString("ru-RU", {
												hour: "2-digit",
												minute: "2-digit",
											})}
										</div>
									)}
								</div>

								<div className="flex items-center gap-2">
									{/*
										ДЕНЬГИ ТОЛЬКО ЧЕРЕЗ money(). Было
										`order.priceRub.toLocaleString() ₽` — это формат браузера,
										а не клиники: копейки терялись (12500.5 печаталось как
										«12 500,5»), а на английской раскладке системы выходило
										«12,500 ₽». И знак доллара рядом с рублями стоял тоже:
										иконка DollarSign убрана, money() сам ставит ₽.

										Условие было `order.priceRub && (...)`: при цене 0 такое
										выражение возвращает 0, и React честно печатал в строке
										одинокий «0» без подписи. Теперь ноль — это «0 ₽», а
										«цены нет» (null) по-прежнему не показывается вовсе.
									*/}
									{order.priceRub !== null && order.priceRub !== undefined ? (
										<span className="font-semibold text-teal-400 mr-2">
											{money(order.priceRub)}
										</span>
									) : null}
									<select
										value={order.status}
										onChange={(e) =>
											handleStatusChange(
												order.id,
												e.target.value as LabOrder["status"],
											)
										}
										className="py-1 px-2 bg-[#1e293b] border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500"
										title="Изменить статус заказа ЗТЛ"
									>
										{clinicStatusFlow.map((s) => (
											<option key={s} value={s}>
												{statusLabels[s]}
											</option>
										))}
										{/* Keep technician-owned states selectable-as-current so the
											control never silently drops the order's real status. */}
										{!clinicStatusFlow.includes(order.status) && (
											<option value={order.status}>
												{statusLabels[order.status]}
											</option>
										)}
									</select>
									<button
										type="button"
										onClick={() => copyPortalLink(order.secureToken)}
										className="py-1 px-2.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 rounded-lg font-semibold transition-colors flex items-center gap-1"
									>
										<Link className="w-3.5 h-3.5" />
										{/*
											Было «Линк» — английское слово русскими буквами, которое
											на этом экране не объясняет ничего. Кнопка копирует
											ссылку для зуботехника, о чём и говорит всплывающая
											подсказка после нажатия.
										*/}
										Ссылка технику
									</button>
									<button
										type="button"
										disabled={deletingId === order.id}
										aria-busy={deletingId === order.id}
										onClick={() => handleDeleteOrder(order.id)}
										className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<Trash2 className="w-3.5 h-3.5" />
									</button>
								</div>
							</div>
						))}
					</div>
				) : null}
			</div>
		</div>
	);
}
