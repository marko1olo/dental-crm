import { Activity, ArrowRight, PlusCircle, ShieldCheck, Users, Wallet } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { denteAdminSecretRequestHeaders, money } from "../../AppHelpers";
import { useCountUp } from "../../hooks/useCountUp";
import { useWebsocket } from "../../hooks/useWebsocket";
import type { PanelSubject } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";
import { PanelLoadFailure } from "../PanelLoadFailure";
import { paymentMethodLabels } from "../../workspaceUiLabels";
import "./FamilyWalletPanel.css";

interface FamilyMember {
	id: string;
	fullName: string;
	phone: string;
}

interface FamilyGroup {
	id: string;
	/**
	 * Название может отсутствовать: колонка family_groups.name объявлена
	 * без NOT NULL (db/schema.ts), обязателен только group_name. Тип был
	 * `string`, и любое обращение к методам строки уронило бы панель.
	 */
	name: string | null;
	balance: string;
	members: FamilyMember[];
}

/**
 * Как называть содержимое панели в сообщении об отказе.
 *
 * Отказ называется целой согласованной строкой. Раньше здесь стояло название
 * («Данные семейного кошелька»), а слова «не загружены» дописывал общий модуль —
 * и согласование держалось на том, что название случайно оказалось во
 * множественном числе. Теперь согласование живёт рядом с существительным.
 */
const WALLET_PANEL_SUBJECT: PanelSubject = {
	notLoadedTitle: "Данные семейного кошелька не загружены",
	accusative: "семейный кошелёк",
	emptyTitle: "Пациент не входит в семью",
	emptyHint: "Семейный счёт появится, когда пациента добавят в семейную группу.",
	failureConsequence:
		"Не считайте, что семейного счёта нет: баланс не прочитан. Пока он не загрузился, списывать с него нельзя — примите оплату обычным способом или повторите загрузку.",
};

/**
 * Идентификатор пациента в базе — uuid (patients.id). Когда пациент не выбран,
 * FinanceView передаёт пустую строку; раньше там стояла строка-заглушка «pat-1»,
 * остаток удалённых демо-данных. Ни на то, ни на другое запрос не может ответить
 * ничем, кроме ошибки приведения типа в базе (500), и после того как отказы стали
 * видимыми, на экране финансов без выбранного пациента появилась бы ложная
 * тревога «баланс не прочитан». Такой запрос не отправляем вовсе.
 */
const PATIENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/*
 * Чем можно внести аванс на семейный счёт.
 *
 * Список сужен намеренно. Сервер принимает ещё «online» и «other»
 * (familyTopupSchema, routes/finance_family.ts), но у стойки маленькой клиники
 * аванс вносят наличными, картой или переводом; лишние кнопки на кассе — это
 * лишний повод выбрать не то. Подписи берём из общего словаря экрана, чтобы
 * способ назывался одинаково здесь, в форме приёма оплаты и в истории оплат.
 */
type FamilyTopupMethod = "cash" | "card" | "bank_transfer";
const FAMILY_TOPUP_METHODS: readonly FamilyTopupMethod[] = ["cash", "card", "bank_transfer"];

interface FamilyWalletPanelProps {
	patientId: string;
	remainingDebtRub: number;
	onPaymentSuccess?: (() => void | Promise<void>) | undefined;
}

export const FamilyWalletPanel: React.FC<FamilyWalletPanelProps> = ({
	patientId,
	remainingDebtRub,
	onPaymentSuccess,
}) => {
	const [family, setFamily] = useState<FamilyGroup | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	// Отказ сервера хранится ОТДЕЛЬНО от «семьи нет»: раньше и то и другое
	// сводилось к family=null, и панель просто исчезала. `status` — код ответа,
	// null — до сервера не дошли вовсе.
	const [loadFailure, setLoadFailure] = useState<{ status: number | null } | null>(null);
	const [isPaying, setIsPaying] = useState(false);
	const [isToppingUp, setIsToppingUp] = useState(false);
	const [topupAmount, setTopupAmount] = useState<number>(0);
	/*
	 * Чем внесли аванс. Способ НЕ гасится при смене пациента: это настройка
	 * рабочего места кассира, а не данные пациента, — так же как способ оплаты в
	 * форме приёма оплаты (components/finance/paymentComposerReset.ts).
	 */
	const [topupMethod, setTopupMethod] = useState<FamilyTopupMethod>("cash");
	/*
	 * ПОЛЕ СУММЫ СПИСАНИЯ НАЧИНАЕТСЯ ПУСТЫМ, А НЕ С ДОЛГА ПАЦИЕНТА.
	 *
	 * БЫЛО: useState(remainingDebtRub || 0). Две беды сразу.
	 *
	 * Первая: начальное значение useState берётся ОДИН раз за жизнь компонента, а
	 * панель при переходе к другому пациенту не размонтируется — меняется только
	 * patientId. В поле оставался долг ПРЕДЫДУЩЕГО человека. Администратор
	 * открывал Иванова с долгом 15 000 ₽, переключался на Петрова, у которого
	 * долг 1 000 ₽, нажимал «Списать с баланса» — и с семейного счёта Петрова
	 * уходило 15 000 ₽. Ровно та же подстановка чужих денег, от которой уже
	 * защищён сброс формы приёма оплаты (components/finance/paymentComposerReset.ts).
	 *
	 * Вторая: подставленная сумма в кассе опасна и сама по себе. Пациент платит
	 * часть, а одно нажатие по привычке списывает весь долг целиком.
	 *
	 * Теперь сумму подставляет только явное нажатие по кнопке «Долг: N ₽» — тем
	 * же приёмом, что и в форме приёма оплаты выше на этом же экране.
	 */
	const [amount, setAmount] = useState<number>(0);
	// Ключ идемпотентности живёт между повторами: без него повторная отправка
	// после обрыва связи зачислила бы деньги дважды.
	const topupMutationIdRef = useRef<string | null>(null);
	// То же самое для списания. Отключённой кнопки недостаточно: она защищает
	// только от второго клика, но не от повтора после потерянного ответа.
	const payMutationIdRef = useRef<string | null>(null);

	const isPatientDatabaseId = PATIENT_ID_PATTERN.test(patientId);
	// Номер запроса вместо флага cancelled: тот же счётчик защищает и повторную
	// загрузку по кнопке, и обновление после списания, а не только первый показ.
	const requestGenerationRef = useRef(0);

	/**
	 * Одна загрузка на все случаи: первый показ, кнопка «Повторить» и обновление
	 * после оплаты. БЫЛО две почти одинаковые копии, и у той, которая обновляла
	 * панель после списания, не было ни защиты от гонки, ни разбора кода ответа.
	 *
	 * ПОЧЕМУ 404 — НЕ ОШИБКА, А ВСЁ ОСТАЛЬНОЕ ОШИБКА. Сервер отвечает 404,
	 * когда пациент действительно не состоит в семье («Patient has no family
	 * group», routes/finance_family.ts). Это штатный случай: панель не нужна.
	 * БЫЛО: `setFamily(res.ok ? await res.json() : null)` — любой другой отказ
	 * (нет доступа у смены, 500, обрыв связи) давал ровно тот же результат, и
	 * панель молча исчезала. Кассир не мог отличить «семейного счёта нет» от
	 * «баланс не прочитан»: деньги на счёте были, а он брал всю сумму другим
	 * способом. Ни текста, ни кнопки повтора при этом не было, а для отказа по
	 * HTTP не вызывался даже console.error.
	 */
	const loadFamily = useCallback(async () => {
		const generation = requestGenerationRef.current + 1;
		requestGenerationRef.current = generation;
		const isStale = () => requestGenerationRef.current !== generation;
		setIsLoading(true);
		try {
			const res = await fetch(`/api/finance/family/patient/${patientId}`, {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (isStale()) return;
			if (res.ok) {
				const data = (await res.json()) as FamilyGroup;
				if (isStale()) return;
				setFamily(data);
				setLoadFailure(null);
				return;
			}
			setFamily(null);
			setLoadFailure(res.status === 404 ? null : { status: res.status });
		} catch (e) {
			if (isStale()) return;
			// Текст исключения английский и наружу не идёт: пользователю сообщение
			// собирает panelStateText по коду, здесь — «сервер не ответил».
			console.error("[family wallet] не удалось прочитать семейный кошелёк:", e);
			setFamily(null);
			setLoadFailure({ status: null });
		} finally {
			if (!isStale()) setIsLoading(false);
		}
	}, [patientId]);

	useEffect(() => {
		// БЫЛО: без защиты от гонки. Ответ по пациенту А мог прийти позже ответа
		// по Б, и списание уходило в семью А со ссылкой на пациента Б.
		setFamily(null);
		setLoadFailure(null);
		// Обе денежные суммы гасим при смене пациента: набранное для прежнего
		// человека к новому не относится, а поле с чужой суммой выглядит как
		// только что набранное.
		setAmount(0);
		setTopupAmount(0);
		if (!isPatientDatabaseId) {
			// Пациент не выбран — грузить нечего, и висящая «Загрузка…» здесь
			// была бы обещанием, которое ничем не закончится.
			setIsLoading(false);
			return;
		}
		void loadFamily();
		return () => {
			// Ответ по прежнему пациенту применять уже нельзя.
			requestGenerationRef.current += 1;
		};
	}, [isPatientDatabaseId, loadFamily]);

	// Sync balance with WS
	const wsUrl = (() => {
		const wsHost = (import.meta as any).env.VITE_WS_URL;
		if (wsHost) return wsHost;
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		return `${protocol}//${window.location.host}/api/ws/schedule`;
	})();
	const { lastMessage } = useWebsocket(wsUrl);
	useEffect(() => {
		if (lastMessage?.type === "FAMILY_BALANCE_UPDATED" && lastMessage.payload) {
			setFamily((prev) => {
				if (prev && lastMessage.payload.familyGroupId === prev.id) {
					return { ...prev, balance: lastMessage.payload.balance };
				}
				return prev;
			});
		}
	}, [lastMessage]);

	// Number() обязателен: колонка balance объявлена numeric без mode "number",
	// драйвер отдаёт её строкой («150.50»). Нечисловое значение считаем нулём:
	// NaN в сравнении `amount > balanceVal` даёт false и молча РАЗРЕШИЛ бы
	// списание с баланса, которого мы не прочитали.
	const parsedBalance = Number(family?.balance ?? 0);
	const balanceVal = Number.isFinite(parsedBalance) ? parsedBalance : 0;
	const animatedBalance = useCountUp(balanceVal, 1000);

	/*
	 * Сколько предложить списать одним нажатием.
	 *
	 * Долг приходит с копейками (billingSummary.totalDueRub), а журнал платежей
	 * хранит целые рубли (payments.amount_rub — integer), поэтому округляем. Ровно
	 * то же округление и та же подпись стоят у кнопки «Долг» в форме приёма оплаты
	 * (PaymentCapture): на одном экране одна и та же сумма обязана выглядеть
	 * одинаково, иначе расхождение читается как ошибка в данных.
	 * ДОЛГ (сервер): пока amount_rub целый, долг с копейками нельзя закрыть
	 * ни этой кнопкой, ни обычной оплатой — остаток вида «0,50 ₽» не гасится.
	 */
	const debtSuggestionRub = Math.round(
		Number.isFinite(remainingDebtRub) ? Math.max(0, remainingDebtRub) : 0,
	);

	/*
	 * Почему кнопка «Списать с баланса» погасла.
	 *
	 * БЫЛО: кнопка просто не нажималась — при сумме больше баланса и при дробной
	 * сумме. Проверки с понятными словами лежат внутри handlePay, но до них дело
	 * не доходит: отключённая кнопка не даёт кликнуть, и подсказка не появляется
	 * никогда. Для администратора это неотличимо от «программа сломалась».
	 */
	const payBlockReason =
		amount > 0 && !Number.isInteger(amount)
			? "Списание проходит только целыми рублями — уберите копейки из суммы."
			: amount > balanceVal && amount > 0
				? `На семейном счету только ${money(balanceVal)}. Спишите не больше этой суммы, остальное примите обычной оплатой или пополните счёт.`
				: null;

	const handlePay = async () => {
		// БЫЛО: только `if (!family) return`. Отключение кнопки через isPaying
		// происходит после ре-рендера, поэтому два быстрых клика в одном кадре
		// успевали отправить два запроса.
		if (!family || isPaying) return;
		if (amount <= 0) {
			showToast("Введите сумму", "error");
			return;
		}
		// Журнал платежей хранит целые рубли (payments.amount_rub — integer),
		// сервер отклоняет дробное с 400. Без этой проверки оператор видел
		// невнятную ошибку схемы вместо понятного текста.
		if (!Number.isInteger(amount)) {
			showToast("Сумма списания указывается целыми рублями", "error");
			return;
		}
		if (amount > balanceVal) {
			showToast("Недостаточно средств на семейном балансе", "error");
			return;
		}
		// БЫЛО: списание уходило вообще без ключа идемпотентности, хотя
		// пополнение строкой ниже его уже отправляло. Сценарий потери денег:
		// оператор нажал «Списать», сервер списал, ответ не дошёл (обрыв связи),
		// интерфейс показал «Сетевая ошибка», оператор нажал повторно — семья
		// заплатила дважды за одно лечение. Серверная защита по паре
		// (organizationId, clientMutationId) есть, но без ключа не срабатывает.
		if (!payMutationIdRef.current) {
			payMutationIdRef.current = `family-pay-${crypto.randomUUID()}`;
		}

		setIsPaying(true);
		try {
			const res = await fetch("/api/finance/family/pay", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId,
					familyGroupId: family.id,
					amountRub: amount,
					clientMutationId: payMutationIdRef.current,
				}),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}) as { message?: string });
				showToast(err.message || "Ошибка оплаты", "error");
				return;
			}
			// Списание прошло — следующее получит новый ключ.
			payMutationIdRef.current = null;
			showToast("Оплата списана с семейного кошелька", "success");
			// Поле суммы обнуляется, иначе после успешного списания в нём
			// остаётся та же сумма и кнопка снова активна — приглашение
			// случайно списать второй раз.
			setAmount(0);
			if (onPaymentSuccess) onPaymentSuccess();
			// Баланс приходит и по вебсокету, но перечитываем на случай, если
			// сообщение не дошло.
			void loadFamily();
		} catch (e) {
			showToast("Сетевая ошибка", "error");
		} finally {
			setIsPaying(false);
		}
	};

	const handleTopup = async () => {
		if (!family || isToppingUp) return;
		if (!Number.isInteger(topupAmount) || topupAmount <= 0) {
			showToast("Введите сумму пополнения целыми рублями", "error");
			return;
		}
		if (!topupMutationIdRef.current) {
			topupMutationIdRef.current = `family-topup-${crypto.randomUUID()}`;
		}

		setIsToppingUp(true);
		try {
			const res = await fetch("/api/finance/family/topup", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId,
					familyGroupId: family.id,
					amountRub: topupAmount,
					// БЫЛО: способ не отправлялся вовсе, а сервер подставляет «cash»
					// по умолчанию (familyTopupSchema, routes/finance_family.ts). Семья
					// вносила аванс картой, в журнал платежей попадали наличные — и
					// вечером наличных в ящике оказывалось меньше, чем в отчёте, ровно
					// на сумму такого пополнения. Причину сверки было не найти.
					method: topupMethod,
					clientMutationId: topupMutationIdRef.current,
				}),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				showToast(err.message || "Не удалось пополнить счёт", "error");
				return;
			}
			// Зачисление прошло — следующее пополнение получит новый ключ.
			topupMutationIdRef.current = null;
			// Сумма — через общий money(): своё toLocaleString печатало «1 500,5 ₽»
			// вместо «1 500,50 ₽», а полтинник в такой записи читается как пять копеек.
			showToast(`Семейный счёт пополнен на ${money(topupAmount)}`, "success");
			setTopupAmount(0);
			void loadFamily();
		} catch {
			showToast("Сетевая ошибка", "error");
		} finally {
			setIsToppingUp(false);
		}
	};

	if (isLoading)
		return (
			<div className="family-wallet-loading">
				<Activity size={16} className="animate-spin inline mr-2" />
				Загрузка семейного кошелька...
			</div>
		);
	// Отказ показываем текстом и с кнопкой «Повторить». Оформление берём у
	// общего PanelLoadFailure, чтобы на экране не появилось второго языка
	// ошибок: тот же вид уже у виджетов карточки пациента.
	if (loadFailure)
		return (
			<PanelLoadFailure
				subject={WALLET_PANEL_SUBJECT}
				status={loadFailure.status}
				onRetry={() => {
					void loadFamily();
				}}
			/>
		);
	// 404 от сервера или пациент не выбран: семьи нет, панель не нужна. Это
	// единственный случай, когда пустое место — правда.
	if (!family) return null;

	return (
		<div className="family-wallet-panel" data-testid="family-wallet-panel">
			<div className="family-wallet-bg-icon">
				<Users size={96} />
			</div>

			<div className="family-wallet-header">
				<div>
					<h3 className="family-wallet-title-row">
						<Wallet size={20} />
						Семейный Кошелек: {family.name?.trim() || "без названия"}
					</h3>
					<p className="family-wallet-subtitle">
						Единый счет для семьи ({(family.members ?? []).length} чел.)
					</p>
				</div>
				<div className="family-wallet-balance-container">
					{/* Сумма — только через общий money(). Своя запись с жёстко двумя
					    знаками дописывала «,00» круглым суммам, тогда как рядом на экране
					    финансов те же деньги печатаются как «1 500 ₽»: две разные записи
					    одной суммы на одном экране читаются как расхождение в данных. */}
					<div className="family-wallet-balance">{money(animatedBalance)}</div>
					<p className="family-wallet-balance-label">
						<ShieldCheck size={12} />
						ДОСТУПНЫЙ БАЛАНС
					</p>
				</div>
			</div>

			<div className="family-wallet-actions">
				<div className="family-wallet-input-group">
					<label
						htmlFor="family-withdraw-amount"
						className="family-wallet-input-label"
					>
						Сумма списания (₽)
					</label>
					<input
						id="family-withdraw-amount"
						type="number"
						className="family-wallet-input"
						value={amount || ""}
						onChange={(e) => setAmount(Number(e.target.value))}
						/* БЫЛО: подсказка «0.00» обещала копейки, которые сервер
						   отклоняет: списание проходит только целыми рублями. */
						placeholder="0"
						disabled={isPaying}
						min={1}
						step={1}
						max={balanceVal}
						aria-invalid={payBlockReason ? true : undefined}
						aria-describedby={payBlockReason ? "family-withdraw-hint" : undefined}
					/>
					{/* Долг подставляется ТОЛЬКО нажатием, а не сам. Кнопка нужна,
					    чтобы администратору не приходилось переписывать сумму глазами
					    из сводки выше — самая частая причина ошибки на рубль. */}
					{debtSuggestionRub > 0 && (
						<div className="quick-chips-row">
							<button
								type="button"
								className="quick-chip quick-chip--sm"
								onClick={() => setAmount(debtSuggestionRub)}
								disabled={isPaying}
							>
								Долг: {money(debtSuggestionRub)}
							</button>
						</div>
					)}
				</div>
				<div className="family-wallet-btn-container">
					<button
						type="button"
						onClick={handlePay}
						disabled={isPaying || balanceVal < amount || amount <= 0}
						className="family-wallet-btn"
					>
						{isPaying ? "Списание..." : "Списать с баланса"}{" "}
						<ArrowRight size={16} />
					</button>
				</div>
			</div>
			{payBlockReason && (
				<p className="family-wallet-hint" id="family-withdraw-hint" role="status">
					{payBlockReason}
				</p>
			)}

			{/* Пополнение. БЫЛО: интерфейса и эндпоинта пополнения не существовало,
			    баланс мог только уменьшаться — поэтому он всегда оставался нулевым,
			    и любая оплата с семейного счёта отклонялась как «недостаточно средств». */}
			<div className="family-wallet-actions">
				<div className="family-wallet-input-group">
					<label
						htmlFor="family-topup-amount"
						className="family-wallet-input-label"
					>
						Пополнить счёт (₽)
					</label>
					<input
						id="family-topup-amount"
						type="number"
						min={1}
						step={1}
						className="family-wallet-input"
						value={topupAmount || ""}
						onChange={(e) => setTopupAmount(Math.trunc(Number(e.target.value)))}
						placeholder="0"
						disabled={isToppingUp}
					/>
					{/* Чем внесли аванс. БЫЛО: способ не спрашивали и не отправляли, а
					    сервер записывал в журнал наличные. Вечером наличных в ящике
					    не хватало ровно на сумму пополнения картой. */}
					<div className="quick-chips-row" aria-label="Чем внесли аванс">
						{FAMILY_TOPUP_METHODS.map((methodKey) => (
							<button
								key={methodKey}
								type="button"
								className={`quick-chip quick-chip--sm ${topupMethod === methodKey ? "active" : ""}`}
								aria-pressed={topupMethod === methodKey}
								onClick={() => setTopupMethod(methodKey)}
								disabled={isToppingUp}
							>
								{paymentMethodLabels[methodKey]}
							</button>
						))}
					</div>
				</div>
				<div className="family-wallet-btn-container">
					<button
						type="button"
						onClick={handleTopup}
						disabled={isToppingUp || topupAmount <= 0}
						className="family-wallet-btn"
					>
						{isToppingUp ? "Зачисление..." : "Пополнить"} <PlusCircle size={16} />
					</button>
				</div>
			</div>
		</div>
	);
};
