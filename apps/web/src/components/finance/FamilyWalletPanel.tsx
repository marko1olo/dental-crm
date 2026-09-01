import {
	Activity,
	ArrowRight,
	Award,
	Coins,
	Layers,
	PlusCircle,
	QrCode,
	ShieldCheck,
	Sparkles,
	User,
	UserCheck,
	Users,
	Wallet,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { denteAdminSecretRequestHeaders, money } from "../../AppHelpers";
import { useCountUp } from "../../hooks/useCountUp";
import { useWebsocket } from "../../hooks/useWebsocket";
import type { PanelSubject } from "../../lib/panelStateText";
import { actionFailureToast } from "../../lib/panelStateText";
/*
 * Разбор набранной суммы — тот же, что в форме приёма оплаты. Второй разбор
 * рядом с кассой означал бы, что «1500,50» в одном поле и в другом понимается
 * по-разному.
 */
import { normalizeRubAmountInput } from "../../rubAmountInput";
import { paymentMethodLabels } from "../../workspaceUiLabels";
import { showToast } from "../GlobalToast";
import { PanelLoadFailure } from "../PanelLoadFailure";
import {
	familyMutationId,
	familyPayRequestKey,
	familyTopupRequestKey,
	type MutationTicket,
} from "./familyWalletMutationKey";
import { FamilyCombinedBillingModal } from "./FamilyCombinedBillingModal";
import "./FamilyWalletPanel.css";
import { logger } from "../../utils/logger";

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
	emptyHint:
		"Семейный счёт появится, когда пациента добавят в семейную группу.",
	failureConsequence:
		"Не считайте, что семейного счёта нет: баланс не прочитан. Пока он не загрузился, списывать с него нельзя — примите оплату обычным способом или повторите загрузку.",
};

/**
 * ОТКАЗ СЕРВЕРА ЧЕЛОВЕЧЕСКИМИ СЛОВАМИ.
 *
 * БЫЛО: `showToast(err.message || "Ошибка оплаты", "error")` — сообщение сервера
 * выводилось в кассу как есть. Маршрут семейного счёта на любой внутренней
 * ошибке отвечает `message: err.message || "Internal Server Error"`
 * (apps/api/src/routes/finance_family.ts, ветки catch у /family/pay и
 * /family/topup), то есть администратору всплывало английское «Internal Server
 * Error» или текст ошибки драйвера базы. Ни что случилось с деньгами, ни что
 * делать дальше из такого сообщения не узнать, а списание с семейного счёта —
 * это оплата лечения: не поняв отказ, администратор берёт ту же сумму второй раз
 * другим способом или не берёт вовсе.
 *
 * Своё сообщение сервера показываем ТОЛЬКО когда в нём есть русские буквы: такие
 * фразы написаны нашим же маршрутом по делу, и «Недостаточно средств на семейном
 * балансе» (402) полезнее любой общей формулировки. Всё остальное — английский
 * текст исключения — заменяем подсказкой по коду ответа, той же, что показывают
 * панели загрузки: она всегда говорит, что делать.
 */
function refusalToast(
	action: string,
	status: number,
	message: unknown,
): string {
	const serverText = typeof message === "string" ? message.trim() : "";
	return /[а-яё]/i.test(serverText)
		? serverText
		: actionFailureToast(action, status);
}

/**
 * Идентификатор пациента в базе — uuid (patients.id). Когда пациент не выбран,
 * FinanceView передаёт пустую строку; раньше там стояла строка-заглушка «pat-1»,
 * остаток удалённых демо-данных. Ни на то, ни на другое запрос не может ответить
 * ничем, кроме ошибки приведения типа в базе (500), и после того как отказы стали
 * видимыми, на экране финансов без выбранного пациента появилась бы ложная
 * тревога «баланс не прочитан». Такой запрос не отправляем вовсе.
 */
const PATIENT_ID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
const FAMILY_TOPUP_METHODS: readonly FamilyTopupMethod[] = [
	"cash",
	"card",
	"bank_transfer",
];

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
	const [loadFailure, setLoadFailure] = useState<{
		status: number | null;
	} | null>(null);
	const [isPaying, setIsPaying] = useState(false);
	const [isToppingUp, setIsToppingUp] = useState(false);
	const [isCombinedBillingModalOpen, setIsCombinedBillingModalOpen] = useState(false);
	/*
	 * СУММЫ ХРАНЯТСЯ СТРОКОЙ — ТЕМ, ЧТО НАБРАЛ ЧЕЛОВЕК.
	 *
	 * БЫЛО: числом, а поля стояли type="number" с `Number(e.target.value)` и
	 * `Math.trunc(Number(e.target.value))`. Отсюда потеря набранного:
	 *  • браузер у числового поля отдаёт ПУСТУЮ строку, как только набранное не
	 *    является числом по его правилам. Русская запятая — именно такой случай:
	 *    администратор набирал «1500,50», на запятой поле мгновенно пустело
	 *    (state 0 → value ""), и все набранные цифры исчезали без слов;
	 *  • Math.trunc молча съедал копейки: «1500.50» превращалось в 1500 прямо
	 *    под руками, и человек не видел, что сумма изменилась.
	 * Теперь набранное остаётся на экране как есть, а разбирает его тот же
	 * normalizeRubAmountInput, что и форма приёма оплаты, — «1500,50» там и здесь
	 * означает одно и то же. Копейки не отбрасываются молча: сервер их не
	 * принимает, и об этом сказано словами под полем.
	 */
	const [topupInput, setTopupInput] = useState("");
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
	const [amountInput, setAmountInput] = useState("");
	/*
	 * КЛЮЧ ИДЕМПОТЕНТНОСТИ ПРИВЯЗАН К ОДНОЙ КОНКРЕТНОЙ ОПЕРАЦИИ.
	 *
	 * Ключ обязан жить между повторами: без него повторная отправка после обрыва
	 * связи списала бы деньги второй раз. Но жить он должен ровно у ТОЙ операции,
	 * для которой выдан, — иначе он превращается в обратную беду.
	 *
	 * БЫЛО: `useRef<string | null>`, один ключ на панель. После обрыва связи ключ
	 * намеренно сохранялся (для безопасного повтора), а сбрасывался только при
	 * успехе. Ни смена пациента, ни смена суммы его не трогали. Сервер же ищет
	 * повтор ТОЛЬКО по паре (organizationId, clientMutationId) — ни пациента, ни
	 * сумму он не сверяет (routes/finance_family.ts) — и на найденный повтор
	 * отвечает 200 с ранее созданным платежом и `duplicate: true`.
	 *
	 * Отсюда ложный успех: администратор списывал 15 000 ₽ у Иванова, связь
	 * обрывалась, он переходил к Петрову, набирал 1 000 ₽, нажимал «Списать» — и
	 * запрос уходил с ТЕМ ЖЕ ключом. Сервер узнавал в нём платёж Иванова, ничего
	 * не списывал и отвечал успехом. Панель писала «Оплата списана с семейного
	 * кошелька», очищала поле — а у Петрова не списано ничего, долг открыт, оплаты
	 * в журнале нет. Администратор отпускал человека как оплатившего. То же самое
	 * при смене суммы у одного пациента: повтор «на 3 000 ₽» подтверждался
	 * успехом, хотя списаны были прежние 500 ₽.
	 *
	 * СТАЛО: рядом с ключом хранится подпись операции — те самые поля, которые
	 * уходят в тело запроса и двигают деньги. Совпала подпись — это повтор, ключ
	 * тот же, второго списания не будет. Изменилась хоть одна — это ДРУГАЯ
	 * операция, и она получает новый ключ. Отдельного сброса при смене пациента не
	 * нужно: пациент входит в подпись, и одно правило не может разойтись с другим.
	 *
	 * Само правило вынесено в familyWalletMutationKey.ts и проверяется прогоном
	 * (familyWalletMutationKey.test.ts): здесь, внутри панели, исполнить его в
	 * тесте было нельзя, а ошибка в нём стоит денег живого человека.
	 */
	const topupMutationRef = useRef<MutationTicket | null>(null);
	const payMutationRef = useRef<MutationTicket | null>(null);

	const isPatientDatabaseId = PATIENT_ID_PATTERN.test(patientId);
	// Номер запроса вместо флага cancelled: тот же счётчик защищает и повторную
	// загрузку по кнопке, и обновление после списания, а не только первый показ.
	const requestGenerationRef = useRef(0);
	/*
	 * ЧЕЙ КОШЕЛЁК СЕЙЧАС НА ЭКРАНЕ.
	 *
	 * Одного счётчика запросов не хватало, и вот почему. Счётчик задаёт только
	 * ПОРЯДОК: применяется ответ на самый последний запрос. А самый последний
	 * запрос мог оказаться запросом по ПРЕЖНЕМУ пациенту. Обновление после
	 * успешного списания вызывает loadFamily из того замыкания, в котором нажали
	 * кнопку, — то есть с прежним patientId; номер поколения такой запрос берёт в
	 * момент вызова и потому становится «самым свежим».
	 *
	 * Что из этого выходило. Администратор нажимал «Списать с баланса» у Иванова,
	 * связь медленная, и не дожидаясь ответа переключался на Петрова. Ответ по
	 * списанию приходил, обновление уходило по ИВАНОВУ и перебивало уже начатую
	 * загрузку Петрова. На экране Петрова оказывался баланс семьи Иванова —
	 * чужие деньги как свои, — и следующее списание кассир считал по этому
	 * балансу. Подпись «Оплата за:» при этом молча исчезала (Петрова нет в списке
	 * членов чужой семьи), но объяснения этому на экране не было.
	 *
	 * Поэтому ответ применяется только если он про того пациента, который на
	 * экране сейчас. Проверка добавлена внутрь isStale, а не отдельной ветвью:
	 * isStale уже стоит перед КАЖДЫМ применением ответа, и новое условие
	 * автоматически действует во всех этих местах, включая ветку отказа.
	 */
	const selectedPatientIdRef = useRef(patientId);

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
	 * HTTP не вызывался даже logger.error.
	 */
	const loadFamily = useCallback(async () => {
		const generation = requestGenerationRef.current + 1;
		requestGenerationRef.current = generation;
		// Устарел не только тот ответ, поверх которого уже пошёл новый запрос, но и
		// любой ответ про пациента, которого на экране больше нет.
		const isStale = () =>
			requestGenerationRef.current !== generation ||
			selectedPatientIdRef.current !== patientId;
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
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(e as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (isStale()) return;
			// Текст исключения английский и наружу не идёт: пользователю сообщение
			// собирает panelStateText по коду, здесь — «сервер не ответил».
			logger.error("[family wallet] не удалось прочитать семейный кошелёк:", e);
			setFamily(null);
			setLoadFailure({ status: null });
		} finally {
			if (!isStale()) setIsLoading(false);
		}
	}, [patientId]);

	useEffect(() => {
		// Кто на экране — записывается ДО начала загрузки: на это значение смотрит
		// isStale, решая, можно ли применить пришедший ответ.
		selectedPatientIdRef.current = patientId;
		// БЫЛО: без защиты от гонки. Ответ по пациенту А мог прийти позже ответа
		// по Б, и списание уходило в семью А со ссылкой на пациента Б.
		setFamily(null);
		setLoadFailure(null);
		// Обе денежные суммы гасим при смене пациента: набранное для прежнего
		// человека к новому не относится, а поле с чужой суммой выглядит как
		// только что набранное.
		setAmountInput("");
		setTopupInput("");
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
	}, [isPatientDatabaseId, loadFamily, patientId]);

	// Sync balance with WS
	const wsUrl = (() => {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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

	const [targetPatientId, setTargetPatientId] = useState<string>(patientId);

	useEffect(() => {
		setTargetPatientId(patientId);
	}, [patientId]);

	/*
	 * ЗА КОГО СПИСЫВАЮТ — ИМЕНЕМ, А НЕ ТОЛЬКО НАЗВАНИЕМ СЕМЬИ.
	 *
	 * Имя берём из уже полученного списка членов группы по выбранному targetPatientId
	 * (по умолчанию текущий пациент, но кассир может переключить на любого члена семьи).
	 */
	const payerName =
		(family?.members ?? []).find((member) => member.id === targetPatientId)
			?.fullName?.trim() ||
		(family?.members ?? []).find((member) => member.id === patientId)
			?.fullName?.trim();

	/*
	 * Разбор набранного. null означает «набрано не число» — это НЕ ноль: нулём
	 * его считать нельзя, иначе непонятная запись выглядела бы как пустое поле.
	 * Для сравнений с балансом берём 0, а человеку отдельно говорим, что не так.
	 */
	const parsedAmount = normalizeRubAmountInput(amountInput);
	const amount = parsedAmount ?? 0;
	const amountInvalid = Boolean(amountInput.trim()) && parsedAmount === null;
	const parsedTopup = normalizeRubAmountInput(topupInput);
	const topupAmount = parsedTopup ?? 0;
	const topupInvalid = Boolean(topupInput.trim()) && parsedTopup === null;

	/*
	 * Сколько предложить списать одним нажатием.
	 * Долг учитывается с копейками (billingSummary.totalDueRub) с округлением до сотых.
	 */
	const debtSuggestionRub = Number.isFinite(remainingDebtRub)
		? Math.max(0, Math.round(remainingDebtRub * 100) / 100)
		: 0;

	/*
	 * Почему кнопка «Списать с баланса» погасла.
	 */
	const payBlockReason = amountInvalid
		? "Впишите сумму цифрами, копейки после запятой: 1500,50"
		: amount > 0 && Math.round(amount * 100) !== amount * 100
			? "Сумма списания может содержать не более 2 знаков после запятой (копейки)."
			: amount > balanceVal && amount > 0
				? `На семейном счету только ${money(balanceVal)}. Спишите не больше этой суммы, остальное примите обычной оплатой или пополните счёт.`
				: null;

	/*
	 * То же самое для пополнения.
	 */
	const topupBlockReason = topupInvalid
		? "Впишите сумму цифрами, копейки после запятой: 1500,50"
		: topupAmount > 0 && Math.round(topupAmount * 100) !== topupAmount * 100
			? "Сумма пополнения может содержать не более 2 знаков после запятой (копейки)."
			: null;

	const handlePay = async () => {
		if (!family || isPaying) return;
		if (amount <= 0) {
			showToast("Введите сумму", "error");
			return;
		}
		if (Math.round(amount * 100) !== amount * 100) {
			showToast("Сумма списания может содержать не более 2 знаков после запятой", "error");
			return;
		}
		if (amount > balanceVal) {
			showToast("Недостаточно средств на семейном балансе", "error");
			return;
		}
		const mutationId = familyMutationId(
			payMutationRef,
			"family-pay",
			familyPayRequestKey(targetPatientId, family.id, amount),
		);

		setIsPaying(true);
		try {
			const res = await fetch("/api/finance/family/pay", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId: targetPatientId,
					familyGroupId: family.id,
					amountRub: amount,
					clientMutationId: mutationId,
				}),
			});

			if (!res.ok) {
				const errPayload = (await res.json().catch(() => null)) as {
					message?: string;
				} | null;
				showToast(
					refusalToast(
						"Списание с семейного счёта не прошло",
						res.status,
						errPayload?.message,
					),
					"error",
				);
				return;
			}
			// Списание прошло — следующее получит новый ключ.
			payMutationRef.current = null;
			const payResult = (await res.json().catch(() => null)) as {
				duplicate?: boolean;
			} | null;
			showToast(
				payResult?.duplicate
					? "Эта оплата уже была списана раньше — второй раз деньги не списаны."
					: "Оплата списана с семейного кошелька",
				"success",
			);
			setAmountInput("");
			if (onPaymentSuccess) onPaymentSuccess();
			void loadFamily();
		} catch (e) {
			logger.error("[family wallet] списание не получило ответа сервера:", e);
			showToast(
				actionFailureToast(
					"Ответ по списанию с семейного счёта не получен",
					null,
				),
				"error",
			);
		} finally {
			setIsPaying(false);
		}
	};

	const handleTopup = async () => {
		if (!family || isToppingUp) return;
		if (topupAmount <= 0 || Math.round(topupAmount * 100) !== topupAmount * 100) {
			showToast("Введите корректную сумму пополнения", "error");
			return;
		}
		const mutationId = familyMutationId(
			topupMutationRef,
			"family-topup",
			familyTopupRequestKey(patientId, family.id, topupAmount, topupMethod),
		);

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
					method: topupMethod,
					clientMutationId: mutationId,
				}),
			});
			if (!res.ok) {
				const errPayload = (await res.json().catch(() => null)) as {
					message?: string;
				} | null;
				showToast(
					refusalToast(
						"Пополнение семейного счёта не прошло",
						res.status,
						errPayload?.message,
					),
					"error",
				);
				return;
			}
			topupMutationRef.current = null;
			const topupResult = (await res.json().catch((err) => {
				logger.error("[Dente]", err);
				showToast(
					actionFailureToast(
						"Ответ о пополнении не прочитан",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				return null;
			})) as {
				duplicate?: boolean;
			} | null;
			showToast(
				topupResult?.duplicate
					? `Этот аванс уже был зачислен раньше — ${money(topupAmount)} второй раз не зачислены.`
					: `Семейный счёт пополнен на ${money(topupAmount)}`,
				"success",
			);
			setTopupInput("");
			void loadFamily();
		} catch (e) {
			logger.error("[family wallet] пополнение не получило ответа сервера:", e);
			showToast(
				actionFailureToast(
					"Ответ по пополнению семейного счёта не получен",
					null,
				),
				"error",
			);
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
				<div className="flex items-center gap-3">
					<div className="family-wallet-balance-container">
						<div className="family-wallet-balance">{money(animatedBalance)}</div>
						<p className="family-wallet-balance-label">
							<ShieldCheck size={12} />
							ДОСТУПНЫЙ БАЛАНС
						</p>
					</div>

					<button
						type="button"
						onClick={() => setIsCombinedBillingModalOpen(true)}
						className="min-h-[44px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
						title="Объединить счета членов семьи и фискализировать чек 54-ФЗ со сплитом"
						data-testid="btn-open-family-combined-billing"
					>
						<Sparkles size={15} className="animate-pulse" />
						<span>Семейный расчет 54-ФЗ</span>
					</button>
				</div>
			</div>

			{/* Списание с семейного баланса */}
			<div className="family-wallet-actions">
				<div className="family-wallet-input-group">
					<label
						htmlFor="family-withdraw-amount"
						className="family-wallet-input-label"
					>
						Сумма списания (₽)
					</label>
					{payerName && (
						<p className="family-wallet-payer">
							Оплата за: <strong>{payerName}</strong>
						</p>
					)}
					<input
						id="family-withdraw-amount"
						type="text"
						inputMode="decimal"
						autoComplete="off"
						className="family-wallet-input"
						value={amountInput}
						onChange={(e) => setAmountInput(e.target.value)}
						placeholder="0"
						disabled={isPaying}
						aria-invalid={payBlockReason ? true : undefined}
						aria-describedby={
							payBlockReason ? "family-withdraw-hint" : undefined
						}
					/>
					{debtSuggestionRub > 0 && (
						<div className="quick-chips-row">
							<button
								type="button"
								className="quick-chip quick-chip--sm"
								onClick={() => setAmountInput(String(debtSuggestionRub))}
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
				<p
					className="family-wallet-hint"
					id="family-withdraw-hint"
					role="status"
				>
					{payBlockReason}
				</p>
			)}

			{/* Бонусные баллы & Быстрый выбор суммы */}
			<div className="family-bonus-section">
				<div className="family-bonus-header">
					<h4 className="family-bonus-title">
						<Sparkles size={16} className="text-amber-500" />
						Бонусные баллы & Быстрое списание
					</h4>
					<span className="text-xs font-semibold text-[var(--muted,#64748b)]">
						Баланс:{" "}
						<strong className="text-[var(--ink,#0f172a)]">
							{money(balanceVal)}
						</strong>
					</span>
				</div>
				<div
					className="family-bonus-chips-row"
					role="toolbar"
					aria-label="Быстрый выбор суммы списания"
				>
					{[500, 1000, 2000, 5000].map((bonusVal) => (
						<button
							key={bonusVal}
							type="button"
							className={`family-bonus-chip ${amount === bonusVal ? "active" : ""}`}
							onClick={() => setAmountInput(String(bonusVal))}
							disabled={isPaying}
						>
							<Coins size={14} className="text-amber-500 shrink-0" />
							<span>{bonusVal.toLocaleString("ru-RU")} бонусов</span>
						</button>
					))}
					{balanceVal > 0 && (
						<button
							type="button"
							className={`family-bonus-chip ${amount === balanceVal ? "active" : ""}`}
							onClick={() => setAmountInput(String(balanceVal))}
							disabled={isPaying}
						>
							<Award size={14} className="text-teal-500 shrink-0" />
							<span>Весь баланс ({money(balanceVal)})</span>
						</button>
					)}
				</div>
			</div>

			{/* Список членов семейной группы и перевод */}
			{(family.members ?? []).length > 0 && (
				<div className="family-members-section">
					<h4 className="family-members-title">
						<Users size={16} />
						Члены семьи и доступные счета ({(family.members ?? []).length} чел.)
					</h4>
					<div className="family-members-grid">
						{(family.members ?? []).map((member) => {
							const isCurrent = member.id === targetPatientId;
							const isSelf = member.id === patientId;
							return (
								<div
									key={member.id}
									className={`family-member-card ${isCurrent ? "is-current" : ""}`}
								>
									<div className="family-member-card-header">
										<div className="family-member-avatar">
											{isCurrent ? (
												<UserCheck size={20} />
											) : (
												<User size={20} />
											)}
										</div>
										<div className="family-member-info">
											<h5
												className="family-member-name"
												title={member.fullName}
											>
												{member.fullName || "Без имени"}
											</h5>
											<p className="family-member-phone">
												{member.phone || "—"}
											</p>
											<span className="family-member-badge">
												{isSelf ? "Текущий пациент" : "Член семьи"}
											</span>
										</div>
									</div>
									<button
										type="button"
										onClick={() => setTargetPatientId(member.id)}
										className={`family-member-transfer-btn ${isCurrent ? "active" : ""}`}
										disabled={isPaying}
									>
										{isCurrent ? "Выбран для оплаты" : "Выбрать для списания"}
									</button>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Пополнение семейного кошелька */}
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
						type="text"
						inputMode="decimal"
						autoComplete="off"
						className="family-wallet-input"
						value={topupInput}
						onChange={(e) => setTopupInput(e.target.value)}
						placeholder="0"
						disabled={isToppingUp}
						aria-invalid={topupBlockReason ? true : undefined}
						aria-describedby={
							topupBlockReason ? "family-topup-hint" : undefined
						}
					/>
					<div
						role="toolbar"
						className="quick-chips-row"
						aria-label="Чем внесли аванс"
					>
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
						{isToppingUp ? "Зачисление..." : "Пополнить"}{" "}
						<PlusCircle size={16} />
					</button>
				</div>
			</div>
			{topupBlockReason && (
				<p className="family-wallet-hint" id="family-topup-hint" role="status">
					{topupBlockReason}
				</p>
			)}

			{/* Модальное окно объединенного расчета семьи и сплит-оплаты */}
			<FamilyCombinedBillingModal
				isOpen={isCombinedBillingModalOpen}
				onClose={() => setIsCombinedBillingModalOpen(false)}
				familyGroupId={family.id}
				familyGroupName={family.name?.trim() || "Семья"}
				availableFamilyWalletRub={balanceVal}
				initialPayer={{
					payerId: patientId,
					payerFullName: payerName || "Плательщик семьи",
				}}
				onCheckoutComplete={async () => {
					setIsCombinedBillingModalOpen(false);
					await onPaymentSuccess?.();
					void loadFamily();
				}}
			/>
		</div>
	);
};
