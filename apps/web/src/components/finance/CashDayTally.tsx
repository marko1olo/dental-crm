import type { Dashboard } from "@dental/shared";
import {
	Banknote,
	Coins,
	CreditCard,
	Globe,
	Landmark,
	ShieldCheck,
	Undo2,
	Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { countLabel } from "../../lib/russianPlural";
import { normalizeRubAmountInput } from "../../rubAmountInput";
import { localDayKey, summarizeCashDay } from "./cashDaySummary";

/*
 * СВЕРКА КАССЫ В КОНЦЕ ДНЯ.
 *
 * ЧТО БЫЛО. Экран «Оплаты» показывал только оплаты выбранного пациента. Итога
 * дня не было нигде: чтобы ответить «сколько пришло за смену и сходится ли
 * ящик», администратор перебирал пациентов по одному и складывал на бумаге.
 *
 * ПОЧЕМУ РАЗДЕЛ РАСКРЫВАЮЩИЙСЯ. На поверхности нужны две цифры — сколько пришло
 * всего и сколько из них наличными; остальное нужно один раз в конце смены.
 * Экран кассы и без того плотный, и ещё одна раскрытая таблица мешала бы
 * основной работе — приёму оплаты.
 *
 * ЧЕГО ЗДЕСЬ НЕТ И ПОЧЕМУ. Открытия и закрытия смены нет: для этого нужна
 * таблица смен, которой в базе не существует (осиротевший CashShiftWidget.css в
 * этой папке — след незаписанного виджета). Итог дня считается по уже
 * прочитанным платежам и сервера не требует, поэтому он есть.
 */

type Payment = Dashboard["payments"][number];
type PaymentMethod = Payment["method"];

interface CashDayTallyProps {
	/** Все платежи клиники. undefined — журнал ещё не прочитан. */
	payments: readonly Payment[] | undefined;
	/** Подписи способов оплаты — те же, что в истории оплат на этом экране. */
	methodLabels: Record<string, string>;
	/** Общий money() экрана: «1 500,50 ₽». Своё форматирование денег запрещено. */
	money: (value: number | null) => string;
}

const METHOD_ICONS: Record<PaymentMethod, typeof Banknote> = {
	cash: Banknote,
	card: CreditCard,
	bank_transfer: Landmark,
	online: Globe,
	insurance: ShieldCheck,
	family_wallet: Wallet,
	other: Coins,
};

/**
 * «1 оплата, 2 оплаты, 5 оплат».
 *
 * БЫЛО: здесь лежала своя копия правила согласования — те же ветки на 11–14 и на
 * последнюю цифру, переписанные заново. Общий countLabel (lib/russianPlural.ts)
 * прямо запрещает такие копии: правило согласования одно, а второй его владелец
 * — это два разных ответа на один вопрос через полгода. Копия к тому же была
 * тише: ошибись в ней кто-нибудь, и сверка кассы писала бы «11 оплата», причём
 * общий модуль и его проверки остались бы зелёными.
 *
 * Здесь остаются только сами слова — они у каждого счётного места свои.
 * Импортировать общий модуль безопасно: он листовой, без единого импорта, и
 * стилей за собой не тянет.
 */
function paymentsCountLabel(count: number): string {
	return countLabel(count, "оплата", "оплаты", "оплат");
}

export function CashDayTally({
	payments,
	methodLabels,
	money,
}: CashDayTallyProps) {
	/*
	 * Сколько наличных пересчитал человек в ящике. Строкой, а не числом: поле
	 * хранит то, что набрали, вместе с запятой, а разбор делает тот же
	 * нормализатор, что и в форме приёма оплаты, — «12 000,50» там и здесь
	 * означает одно и то же.
	 */
	const [countedCashInput, setCountedCashInput] = useState("");

	/*
	 * Ключ дня берётся ВНЕ запоминания и входит в его зависимости.
	 *
	 * Смена переживает полночь: программу не перезагружают в 00:00. Если считать
	 * ключ внутри useMemo с зависимостью только от платежей, итог остался бы
	 * вчерашним до первой новой оплаты — и вечерняя сверка сложилась бы с чужими
	 * сутками. Здесь ключ пересчитывается при каждом показе, и после полуночи
	 * первый же показ переносит итог в новые сутки.
	 */
	const dayKey = localDayKey(new Date()) ?? "";
	const summary = useMemo(
		() => summarizeCashDay(payments, dayKey),
		[payments, dayKey],
	);

	const isLoaded = payments !== undefined;
	const hasAnything =
		summary.receivedCount > 0 ||
		summary.familyWalletRub > 0 ||
		summary.refundedCount > 0;

	const countedCash = normalizeRubAmountInput(countedCashInput);
	const countedCashInvalid =
		Boolean(countedCashInput.trim()) && countedCash === null;
	/*
	 * Расхождение считается в копейках целыми: разность двух дробей в плавающей
	 * точке даёт хвост, и «сходится» превратилось бы в «не хватает 0,000001 ₽».
	 */
	const differenceRub =
		countedCash === null
			? null
			: Math.round((countedCash - summary.cashRub) * 100) / 100;

	const headline = !isLoaded
		? "Касса за сегодня: считаем…"
		: hasAnything
			? `Касса за сегодня: пришло ${money(summary.receivedRub)}, из них наличными ${money(summary.cashRub)}`
			: "Касса за сегодня: оплат пока не записано";

	return (
		<details
			className="payment-capture-detail-section"
			data-testid="cash-day-tally"
		>
			<summary>{headline}</summary>
			<div className="smart-details-content">
				{!isLoaded ? (
					/* Загрузка. Нулей вместо цифр здесь быть не должно: ноль неотличим
					   от «денег не было», а это разные вещи для сверки. */
					<p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
						Загружаем оплаты клиники за сегодня. Итог появится, как только
						журнал платежей прочитается.
					</p>
				) : !hasAnything ? (
					<p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
						За сегодня оплат ещё не записано. Здесь появятся все оплаты клиники
						— и наличные, и карта, и переводы, — как только их примут в форме
						«Принять оплату» выше.
					</p>
				) : (
					<>
						{/* Список строк — той же раскладкой, что история оплат ниже
						    (.finance-list даёт сетку с отбивкой, .finance-row — строку
						    «значок · название · сумма»). Своя рамка и своя подложка убраны:
						    внутри раскрывающегося блока это была бы карточка в карточке. */}
						<div
							className="finance-list"
							style={{ border: "none", padding: 0, background: "transparent" }}
						>
							{summary.byMethod.map((row) => {
								const RowIcon = METHOD_ICONS[row.method] ?? Coins;
								return (
									<article className="finance-row" key={row.method}>
										<RowIcon aria-hidden="true" />
										<div>
											<h3>{methodLabels[row.method] ?? row.method}</h3>
											<p>{paymentsCountLabel(row.count)}</p>
										</div>
										<strong>{money(row.amountRub)}</strong>
									</article>
								);
							})}
							{summary.advanceRub > 0 ? (
								<article className="finance-row" key="advance">
									<Wallet aria-hidden="true" />
									<div>
										<h3>Из них аванс на семейный счёт</h3>
										<p>
											деньги получены, но выручкой станут при оплате лечения
										</p>
									</div>
									<strong>{money(summary.advanceRub)}</strong>
								</article>
							) : null}
							{summary.familyWalletRub > 0 ? (
								<article className="finance-row" key="family-wallet">
									<Wallet aria-hidden="true" />
									<div>
										<h3>Оплачено с семейных счетов</h3>
										<p>
											в приход не входит: эти деньги клиника получила раньше,
											когда счёт пополняли
										</p>
									</div>
									<strong>{money(summary.familyWalletRub)}</strong>
								</article>
							) : null}
							{summary.refundedRub > 0 ? (
								<article className="finance-row" key="refunded">
									<Undo2 aria-hidden="true" />
									<div>
										<h3>Возвращено пациентам</h3>
										{/* БЫЛО: «наличные возвраты уже вычтены из суммы в ящике» —
										    неправда в обе стороны. Возврат снимается с той же строки
										    оплаты, поэтому деньги по ней и пришли, и ушли: в приходе
										    их нет, и вычитать из ящика нечего. */}
										<p>
											{paymentsCountLabel(summary.refundedCount)}; в приход за
											день не входят — эти деньги вернули
										</p>
									</div>
									<strong>−{money(summary.refundedRub)}</strong>
								</article>
							) : null}
						</div>

						<div style={{ marginTop: "12px" }}>
							{/* Поле оформлено как поля формы приёма оплаты выше (.smart-field с
							    «плавающей» подписью): на одном экране не должно быть двух видов
							    полей ввода. Пустой placeholder обязателен — на нём держится
							    подъём подписи (:not(:placeholder-shown)), а сам текст подсказки
							    живёт в подписи. */}
							<div className="smart-field" style={{ maxWidth: "280px" }}>
								<input
									id="cash-day-counted"
									inputMode="decimal"
									autoComplete="off"
									value={countedCashInput}
									onChange={(event) => setCountedCashInput(event.target.value)}
									placeholder=" "
									aria-invalid={countedCashInvalid || undefined}
									aria-describedby="cash-day-counted-result"
								/>
								<label htmlFor="cash-day-counted">
									Пересчитайте наличные в ящике (₽)
								</label>
							</div>
							<p
								id="cash-day-counted-result"
								style={{ margin: "6px 0 0" }}
								role="status"
							>
								{countedCashInvalid
									? "Впишите сумму цифрами, копейки после запятой: 12 000,50"
									: differenceRub === null
										? `По записям в ящике должно быть ${money(summary.cashRub)}.`
										: differenceRub === 0
											? `Сходится: ${money(summary.cashRub)}.`
											: differenceRub > 0
												? `В ящике на ${money(differenceRub)} больше, чем по записям. Скорее всего, оплату приняли, но не записали в программу.`
												: `В ящике на ${money(-differenceRub)} меньше, чем по записям. Проверьте сдачу и возвраты: возврат по оплате, принятой в другой день, в сегодняшний итог не попадает — программа не хранит время возврата.`}
							</p>
						</div>

						{/* Честно о границах числа. Иначе итог прочтут как «выручка клиники за
						    день», а это итог того, что ЗАПИСАЛИ в программу. И это итог всей
						    клиники, а не выбранного пациента, — самая вероятная ошибка чтения
						    на экране, где всё остальное показано по одному человеку. */}
						<p
							style={{
								margin: "10px 0 0",
								color: "var(--muted)",
								fontSize: "13px",
							}}
						>
							Считаются оплаты, записанные в программу за сегодня по всей
							клинике, а не только по выбранному пациенту. Если оплату приняли и
							не записали, её здесь нет. Сама сверка в программе пока не
							сохраняется — это проверка на месте.
						</p>
					</>
				)}
			</div>
		</details>
	);
}
