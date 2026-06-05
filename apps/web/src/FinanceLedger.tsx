import { ClipboardList, CreditCard } from "lucide-react";
import type { Dashboard } from "@dental/shared";

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
  paymentFiscalReceiptLabel: (payment: Pick<Payment, "id" | "fiscalReceiptNumber" | "fiscalReceipt">) => string;
  paymentMethodLabels: Record<Payment["method"], string>;
  payments: Payment[];
  serviceCatalog: ServiceCatalogItem[];
  treatmentItems: TreatmentPlanItem[];
  treatmentStatusLabels: Record<TreatmentPlanItem["status"], string>;
};

export function FinanceLedger({
  categoryLabels,
  documents,
  formatDateTime,
  money,
  onFocusPaymentCapture,
  onGoToVisit,
  paymentFiscalReceiptLabel,
  paymentMethodLabels,
  payments,
  serviceCatalog,
  treatmentItems,
  treatmentStatusLabels
}: FinanceLedgerProps) {
  return (
    <div className="finance-split">
      <section className="finance-list" aria-label="План лечения">
        <div className="panel-heading">
          <h3>План лечения</h3>
          <span className="status-pill status-arrived">{treatmentItems.length}</span>
        </div>
        {treatmentItems.length ? (
          treatmentItems.map((item) => {
            const service = serviceCatalog.find((catalogItem) => catalogItem.id === item.serviceId);
            const total = item.unitPriceRub * item.quantity - item.discountRub;
            return (
              <article className={`finance-row plan-${item.status}`} key={item.id}>
                <ClipboardList aria-hidden="true" />
                <div>
                  <h3>{service?.title ?? item.serviceId}</h3>
                  <p>
                    {item.toothCode ? `Зуб ${item.toothCode} · ` : ""}
                    {service ? categoryLabels[service.category] : "услуга"} · {treatmentStatusLabels[item.status]}
                  </p>
                </div>
                <strong>{money(total)}</strong>
              </article>
            );
          })
        ) : (
          <article className="finance-empty-state">
            <ClipboardList aria-hidden="true" />
            <p>План лечения для текущего пациента пуст. Добавьте услугу из приема или прайса, чтобы сумма, документы и оплата считались без ручного пересчета.</p>
            <button className="text-button" type="button" onClick={onGoToVisit}>
              Открыть прием
            </button>
          </article>
        )}
      </section>

      <section className="finance-list" aria-label="История оплат">
        <div className="panel-heading">
          <h3>Платежи</h3>
          <span className="status-pill status-confirmed">{payments.length}</span>
        </div>
        {payments.length ? (
          payments.map((payment) => (
            <article className="finance-row" key={payment.id}>
              <CreditCard aria-hidden="true" />
              <div>
                <h3>{paymentMethodLabels[payment.method]}</h3>
                <p className="finance-payment-link">
                  {payment.documentId
                    ? `Документ: ${documents.find((document) => document.id === payment.documentId)?.title ?? "документ не найден"}`
                    : "Документ оплаты не привязан"}
                </p>
                <p>
                  {payment.paidAt ? formatDateTime(payment.paidAt) : "ожидает оплаты"} · чек {paymentFiscalReceiptLabel(payment)} · код{" "}
                  {payment.taxDeductionCode ?? "не выбран"} · {payment.note ?? "без примечания"}
                </p>
              </div>
              <strong>{money(payment.amountRub)}</strong>
            </article>
          ))
        ) : (
          <article className="finance-empty-state">
            <CreditCard aria-hidden="true" />
            <p>Платежей по текущему пациенту пока нет. Примите оплату выше, и она появится здесь с чеком, кодом вычета и примечанием.</p>
            <button className="text-button" type="button" onClick={onFocusPaymentCapture}>
              К оплате
            </button>
          </article>
        )}
      </section>
    </div>
  );
}
