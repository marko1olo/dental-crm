import {
	Activity,
	ArrowRight,
	PlusCircle,
	ShieldCheck,
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

	/*
	 * ЗА КОГО СПИСЫВАЮТ — ИМЕНЕМ, А НЕ ТОЛЬКО НАЗВАНИЕМ СЕМЬИ.
	 *
	 * БЫЛО: панель показывала название семьи, баланс и число членов — и больше
	 * ничего. Списание же уходит на КОНКРЕТНОГО пациента (patientId в теле запроса
	 * /family/pay), а панель при переходе к другому человеку не размонтируется:
	 * меняется только patientId. Для двух членов ОДНОЙ семьи — мать и ребёнок —
	 * экран после переключения выглядит буква в букву одинаково: та же семья, тот
	 * же баланс, то же число членов. Единственное, что изменилось, — кому запишут
	 * оплату, и этого на экране не было видно вовсе. Администратор, отвлёкшийся на
	 * телефонный звонок, списывал лечение ребёнка на мать: деньги уходили с того же
	 * семейного счёта, но в журнале платежей и в долге закрывался НЕ ТОТ человек, и
	 * второй продолжал числиться должником.
	 *
	 * Имя берём из уже полученного списка членов группы: маршрут находит семью
	 * ИМЕННО по этому пациенту (patients.family_group_id) и возвращает всех членов
	 * организации, поэтому выбранный пациент в списке есть всегда. Новых полей API
	 * и новых свойств компонента для этого не нужно.
	 *
	 * Если имя всё же не нашлось (список пуст или пациент уже переведён в другую
	 * семью, а ответ ещё старый) — молчим, а не пишем «неизвестно»: подпись «за
	 * кого платим» с неверным или пустым именем хуже отсутствия подписи.
	 */
	const payerName = (family?.members ?? [])
		.find((member) => member.id === patientId)
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
	 *
	 * Долг приходит с копейками (billingSummary.totalDueRub), а списание с
	 * семейного счёта сервер принимает только целым числом рублей: familyPaymentSchema
	 * требует z.number().int() (routes/finance_family.ts). Поэтому целое.
	 *
	 * ВНИЗ, А НЕ ПО ПРАВИЛАМ ОКРУГЛЕНИЯ. БЫЛО Math.round: долг 1 500,50 ₽
	 * превращался в кнопку «Долг: 1 501 ₽», и одно нажатие списывало с семейного
	 * счёта на 50 копеек БОЛЬШЕ, чем человек должен. Программа не имеет права
	 * брать с пациента деньги, которых он не задолжал, даже полтинник: у семьи
	 * образуется переплата, которую никто не заметит и не вернёт. Math.floor
	 * оставляет копейки непогашенными — их видно в остатке долга, и это чинится
	 * обычной оплатой.
	 * ДОЛГ (сервер): сама колонка payments.amount_rub копейки уже умеет —
	 * numeric(12,2) после миграции 0131, — а вот баланс семьи и схема списания
	 * остались целыми. Пока так, долг вида «1 500,50 ₽» этой кнопкой не закрыть:
	 * остаток 0,50 ₽ не гасится.
	 */
	const debtSuggestionRub = Math.floor(
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
	const payBlockReason = amountInvalid
		? "Впишите сумму цифрами, копейки после запятой: 1500,50"
		: amount > 0 && !Number.isInteger(amount)
			? "Списание проходит только целыми рублями — уберите копейки из суммы."
			: amount > balanceVal && amount > 0
				? `На семейном счету только ${money(balanceVal)}. Спишите не больше этой суммы, остальное примите обычной оплатой или пополните счёт.`
				: null;

	/*
	 * То же самое для пополнения.
	 *
	 * Работу оборвало исчерпанием лимита ровно здесь: разметка поля пополнения уже
	 * ссылалась на topupBlockReason, а самой причины ещё не было — сборка не
	 * проходила. Дописано ведущим по образцу списания выше.
	 *
	 * Отличие от списания одно и оно по делу: сверять с балансом нечего — счёт
	 * пополняют, а не тратят. Остаётся проверка записи и запрет копеек, потому что
	 * сервер принимает пополнение целыми рублями тем же familyTopupSchema.
	 */
	const topupBlockReason = topupInvalid
		? "Впишите сумму цифрами, копейки после запятой: 1500,50"
		: topupAmount > 0 && !Number.isInteger(topupAmount)
			? "Пополнение проходит только целыми рублями — уберите копейки из суммы."
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
		// Схема списания требует целое число рублей (familyPaymentSchema,
		// routes/finance_family.ts), дробное сервер отклоняет с 400. Сама колонка
		// payments.amount_rub копейки уже умеет — ограничение в схеме и в балансе
		// семьи. Без этой проверки оператор видел невнятную ошибку схемы вместо
		// понятного текста.
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
		// Подпись — ровно те поля тела запроса, которые двигают деньги: другой
		// пациент, другая семья или другая сумма означают другую операцию.
		const mutationId = familyMutationId(
			payMutationRef,
			"family-pay",
			familyPayRequestKey(patientId, family.id, amount),
		);

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
			/*
			 * ПОВТОР НАЗЫВАЕТСЯ ПОВТОРОМ, А НЕ НОВЫМ СПИСАНИЕМ.
			 *
			 * БЫЛО: `duplicate` из ответа не читался вовсе, и повтор после потерянного
			 * ответа рапортовал «Оплата списана» — то есть о СЕГОДНЯШНЕМ списании,
			 * которого в этот раз не было. Администратор, не понявший, прошла ли первая
			 * попытка, получал подтверждение и не мог отличить одно списание от двух.
			 * Сервер отвечает `duplicate: true`, когда узнал ключ и денег НЕ тронул, —
			 * это и говорим словами: деньги ушли раньше, второй раз не ушли.
			 */
			const payResult = (await res.json().catch(() => null)) as {
				duplicate?: boolean;
			} | null;
			showToast(
				payResult?.duplicate
					? "Эта оплата уже была списана раньше — второй раз деньги не списаны."
					: "Оплата списана с семейного кошелька",
				"success",
			);
			// Поле суммы обнуляется, иначе после успешного списания в нём
			// остаётся та же сумма и кнопка снова активна — приглашение
			// случайно списать второй раз.
			setAmountInput("");
			if (onPaymentSuccess) onPaymentSuccess();
			// Баланс приходит и по вебсокету, но перечитываем на случай, если
			// сообщение не дошло.
			void loadFamily();
		} catch (e) {
			// БЫЛО: «Сетевая ошибка» — жаргон без действия, и вдобавок неправда о
			// деньгах. Запрос оборвался, значит НЕ известно, успел ли сервер списать:
			// утверждать «не прошло» здесь нельзя. Поэтому сказано ровно то, что
			// известно — ответ не получен, — и предложено повторить: повтор уходит с
			// тем же ключом идемпотентности (payMutationIdRef не сбрасывается в этой
			// ветке), поэтому второго списания не будет.
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
		if (!Number.isInteger(topupAmount) || topupAmount <= 0) {
			showToast("Введите сумму пополнения целыми рублями", "error");
			return;
		}
		// Способ входит в подпись наравне с суммой: он попадает в журнал платежей и
		// в сверку кассы, поэтому «те же 5 000 ₽, но картой» — другая операция.
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
					// БЫЛО: способ не отправлялся вовсе, а сервер подставляет «cash»
					// по умолчанию (familyTopupSchema, routes/finance_family.ts). Семья
					// вносила аванс картой, в журнал платежей попадали наличные — и
					// вечером наличных в ящике оказывалось меньше, чем в отчёте, ровно
					// на сумму такого пополнения. Причину сверки было не найти.
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
			// Зачисление прошло — следующее пополнение получит новый ключ.
			topupMutationRef.current = null;
			// Повтор не выдаём за новое зачисление: сервер вернул `duplicate: true`,
			// значит баланс он в этот раз не менял. Иначе семья, внёсшая аванс дважды
			// по одной непрошедшей попытке, увидела бы два подтверждения на один взнос.
			// Сумма — через общий money(): своё toLocaleString печатало «1 500,5 ₽»
			// вместо «1 500,50 ₽», а полтинник в такой записи читается как пять копеек.
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
			// То же, что у списания: оборванный запрос не говорит, зачислены деньги
			// или нет. Повтор безопасен по тому же ключу идемпотентности
			// (topupMutationIdRef в этой ветке не сбрасывается).
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
					{/* За кого платят — рядом с полем суммы, а не в заголовке панели: сюда
					    смотрят, когда набирают сумму и нажимают «Списать». */}
					{payerName && (
						<p className="family-wallet-payer">
							Оплата за: <strong>{payerName}</strong>
						</p>
					)}
					{/* type="text" с inputMode="decimal", а не type="number": числовое
					    поле стирало всё набранное на русской запятой, а на телефоне
					    inputMode всё равно поднимает цифровую клавиатуру. Разбор — общим
					    normalizeRubAmountInput, как в форме приёма оплаты. */}
					<input
						id="family-withdraw-amount"
						type="text"
						inputMode="decimal"
						autoComplete="off"
						className="family-wallet-input"
						value={amountInput}
						onChange={(e) => setAmountInput(e.target.value)}
						/* БЫЛО: подсказка «0.00» обещала копейки, которые сервер
						   отклоняет: списание проходит только целыми рублями. */
						placeholder="0"
						disabled={isPaying}
						aria-invalid={payBlockReason ? true : undefined}
						aria-describedby={
							payBlockReason ? "family-withdraw-hint" : undefined
						}
					/>
					{/* Долг подставляется ТОЛЬКО нажатием, а не сам. Кнопка нужна,
					    чтобы администратору не приходилось переписывать сумму глазами
					    из сводки выше — самая частая причина ошибки на рубль. */}
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
					{/* Чем внесли аванс. БЫЛО: способ не спрашивали и не отправляли, а
					    сервер записывал в журнал наличные. Вечером наличных в ящике
					    не хватало ровно на сумму пополнения картой. */}
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
			{/*
			 * ПОЧЕМУ «ПОПОЛНИТЬ» НЕ НАЖИМАЕТСЯ — ТЕПЕРЬ НАПИСАНО.
			 *
			 * БЫЛО: причина считалась (topupBlockReason), поле помечалось как ошибочное
			 * и ссылалось на подсказку `aria-describedby="family-topup-hint"` — а самой
			 * подсказки в разметке не существовало. Ссылка вела в пустоту, текст не
			 * показывался нигде, и переменная работала только на два атрибута.
			 *
			 * Что видел администратор. Вносит аванс, набирает сумму так, как программа
			 * её прочитать не может, — «тысяча», «1.500.50», цифры с русской «о»
			 * вместо нуля. Разбор даёт «не число», сумма считается нулём, кнопка
			 * «Пополнить» гаснет — и НИ ОДНОГО слова о том, что не так. Кнопка,
			 * которая ничего не делает и молчит: человек с деньгами в руках стоит у
			 * стойки, а касса выглядит сломанной. Для незрячего хуже: поле объявлялось
			 * ошибочным со ссылкой на несуществующее описание, то есть «здесь ошибка» —
			 * и тишина.
			 *
			 * Ставится там же, где подсказка списания, — под всей строкой, а не внутри
			 * группы поля: рядом с полем уже стоят кнопки способа оплаты, и текст между
			 * ними и полем разорвал бы их связку.
			 */}
			{topupBlockReason && (
				<p className="family-wallet-hint" id="family-topup-hint" role="status">
					{topupBlockReason}
				</p>
			)}
		</div>
	);
};
