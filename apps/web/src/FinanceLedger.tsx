import type { Dashboard } from "@dental/shared";
import { ClipboardList, CreditCard, FileText } from "lucide-react";

type TreatmentPlanItem = Dashboard["treatmentPlanItems"][number];
type Payment = Dashboard["payments"][number];
type ServiceCatalogItem = Dashboard["serviceCatalog"][number];
type BillingDocument = Dashboard["documents"][number];

type FinanceLedgerProps = {
	categoryLabels: Record<ServiceCatalogItem["category"], string>;
	documents: BillingDocument[];
	formatDateTime: (value: string) => string;
	money: (value: number | null) => string;
	onFocusPaymentCapture: () => void;
	onGoToVisit: () => void;
	paymentFiscalReceiptLabel: (
		payment: Pick<Payment, "id" | "fiscalReceiptNumber" | "fiscalReceipt">,
	) => string;
	paymentMethodLabels: Record<Payment["method"], string>;
	payments: Payment[];
	serviceCatalog: ServiceCatalogItem[];
	treatmentItems: TreatmentPlanItem[];
	treatmentStatusLabels: Record<TreatmentPlanItem["status"], string>;
	onCreateDocument?: (kind: string) => void;
};

export function FinanceLedger({
	categoryLabels = {} as any,
	documents = [],
	formatDateTime = (v: string) => v || "",
	/*
	 * У `money` НЕТ значения по умолчанию, и это намеренно.
	 *
	 * Здесь стояло `money = (v: number | null) => `${v ?? 0} ₽``: второй,
	 * частный печатник денег, повторявший ровно тот дефект, который лечили в
	 * общей money() (AppHelpers) — неизвестная сумма выходила как «0 ₽». Он же
	 * терял русское форматирование: 1500.5 печаталось «1500.5 ₽» вместо
	 * «1 500,50 ₽», то есть полтинник читался как пять копеек.
	 *
	 * Подстраховка была ненужной с самого начала: prop объявлен обязательным
	 * (FinanceLedgerProps), единственный вызывающий FinanceView передаёт общую
	 * money(), и пропуск prop-а — ошибка типов, а не случай времени выполнения.
	 * Умолчание лишь гарантировало, что ошибка пройдёт молча и напечатает
	 * неверные деньги вместо того, чтобы не собраться.
	 */
	money,
	onFocusPaymentCapture = () => {},
	onGoToVisit = () => {},
	paymentFiscalReceiptLabel = () => "",
	paymentMethodLabels = {} as any,
	payments = [],
	serviceCatalog = [],
	treatmentItems = [],
	treatmentStatusLabels = {} as any,
	onCreateDocument,
}: FinanceLedgerProps) {
	const safeTreatmentItems = treatmentItems || [];
	const safePayments = payments || [];
	const safeCatalog = serviceCatalog || [];
	const safeDocuments = documents || [];

	return (
		<div className="finance-split">
			<section className="finance-list" aria-label="План лечения">
				<div className="panel-heading">
					<h3>План лечения</h3>
					<span className="status-pill status-arrived">
						{safeTreatmentItems.length}
					</span>
				</div>
				{safeTreatmentItems.length ? (
					safeTreatmentItems.map((item) => {
						const service = safeCatalog.find(
							(catalogItem) => catalogItem.id === item.serviceId,
						);
						/*
						 * ЗАЖИМ В НОЛЬ, А НЕ УКРАШЕНИЕ. Здесь стояло
						 * `item.unitPriceRub * item.quantity - item.discountRub` без
						 * `Math.max(0, …)`, и это ЕДИНСТВЕННОЕ из восьми мест расчёта
						 * итога строки на клиенте, где зажима не было (перепись
						 * 2026-08-06: useAppLogic.tsx:11231/11479/12455,
						 * components/visit/completedServicesPlan.ts:108,
						 * components/plan/planPricing.ts:360,
						 * components/odontogram/treatmentEstimatorPricing.ts:728,
						 * ClinicalAiPersonalizePanel.tsx — все с зажимом).
						 *
						 * Почему это видел пациент. Скидка объявлена суммой НА СТРОКУ
						 * (`treatment_items.discount_rub numeric(12,2)`,
						 * `apps/api/src/db/schema.ts:558`), а не процентом и не ценой за
						 * единицу. Ограничения «скидка ≤ цена × количество» нет нигде: в
						 * живой базе у `treatment_items` НОЛЬ CHECK-ограничений
						 * (`pg_constraint`, contype='c', замер 2026-08-06), а маршрут
						 * приёма сметы (`routes/odontogram.ts:122`) принимает скидку до
						 * 100 000 000 ₽ независимо от цены. Значит строка «цена 1 000,
						 * количество 1, скидка 1 500» законна, и экран печатал пациенту
						 * «−500 ₽» ровно там, где ему выставляют счёт.
						 *
						 * Сервер на тех же данных даёт 0: канон
						 * `apps/api/src/money/patientDebt.ts`, `chargeLineKopecks` —
						 * `Math.max(0, цена × количество − скидка)`, и зажим там стоит НА
						 * СТРОКЕ намеренно, чтобы отрицательная позиция не гасила долг по
						 * соседним позициям того же пациента. Клиент обязан показывать то
						 * же число, что и сервер.
						 *
						 * Правка минимальная — только зажим. Канон считает целыми
						 * копейками, здесь по-прежнему рубли с плавающей точкой:
						 * 1 500,10 × 3 даёт 4500.299999999999. Перевод клиентского слоя
						 * денег на копейки — отдельная работа, она не входит в этот фикс.
						 */
						const total = Math.max(
							0,
							item.unitPriceRub * item.quantity - item.discountRub,
						);
						return (
							<article
								className={`finance-row plan-${item.status}`}
								key={item.id}
							>
								<ClipboardList aria-hidden="true" />
								<div>
									<h3>{service?.title ?? item.serviceId}</h3>
									<p>
										{item.toothCode ? `Зуб ${item.toothCode} · ` : ""}
										{service ? categoryLabels[service.category] : "услуга"} ·{" "}
										{treatmentStatusLabels[item.status]}
									</p>
								</div>
								<strong>{money(total)}</strong>
							</article>
						);
					})
				) : (
					<article className="finance-empty-state">
						<ClipboardList aria-hidden="true" />
						<p>
							План лечения для текущего пациента пуст. Добавьте услугу из приема
							или прайса, чтобы сумма, документы и оплата считались без ручного
							пересчета.
						</p>
						<button className="text-button" type="button" onClick={onGoToVisit}>
							Открыть прием
						</button>
					</article>
				)}
			</section>

			<section className="finance-list" aria-label="История оплат">
				<div
					className="panel-heading"
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<h3 style={{ margin: 0 }}>Платежи</h3>
						<span className="status-pill status-confirmed">
							{safePayments.length}
						</span>
					</div>
					{/* БЫЛО: кнопка рисовалась всегда, а обработчик был необязательным
					    и нигде не передавался. Оператор нажимал «Справка ИФНС» при
					    пациенте у стойки, и не происходило ничего: `?.` молча
					    проглатывал вызов. Показываем кнопку только когда она работает. */}
					{onCreateDocument && safePayments.some((p) => p.taxDeductionCode) && (
						<button
							className="secondary-button"
							type="button"
							title="Сгенерировать справку ИФНС для налогового вычета"
							onClick={() => onCreateDocument("tax_deduction_certificate")}
							style={{ padding: "4px 8px", fontSize: "0.85rem" }}
						>
							<FileText size={14} style={{ marginRight: "4px" }} /> Справка ИФНС
						</button>
					)}
				</div>
				{safePayments.length ? (
					safePayments.map((payment) => (
						<article className="finance-row" key={payment.id}>
							<CreditCard aria-hidden="true" />
							<div>
								<h3>{paymentMethodLabels[payment.method]}</h3>
								<p className="finance-payment-link">
									{payment.documentId
										? `Документ: ${safeDocuments.find((document) => document.id === payment.documentId)?.title ?? "документ не найден"}`
										: "Документ оплаты не привязан"}
								</p>
								<p>
									{payment.paidAt
										? formatDateTime(payment.paidAt)
										: "ожидает оплаты"}{" "}
									· чек {paymentFiscalReceiptLabel(payment)} · код{" "}
									{payment.taxDeductionCode ?? "не выбран"} ·{" "}
									{payment.note ?? "без примечания"}
								</p>
							</div>
							<strong>{money(payment.amountRub)}</strong>
						</article>
					))
				) : (
					<article className="finance-empty-state">
						<CreditCard aria-hidden="true" />
						<p>
							Платежей по текущему пациенту пока нет. Примите оплату выше, и она
							появится здесь с чеком, кодом вычета и примечанием.
						</p>
						<button
							className="text-button"
							type="button"
							onClick={onFocusPaymentCapture}
						>
							К оплате
						</button>
					</article>
				)}
			</section>
		</div>
	);
}
