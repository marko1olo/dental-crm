

## Executive BI Analytics (BI Аналитика)

Новый раздел **BI Аналитика** предоставляет руководителям и инвесторам клиники полный контроль над финансовыми и операционными метриками.

### Возможности:
- **Когортный анализ LTV**: Отслеживание накопленной выручки пациентов в разрезе 1, 3, 6 и 12 месяцев.
- **Воронка планов лечения**: Визуализация конверсии от создания черновика (Draft) до полного завершения (Completed).
- **Загрузка кресел**: Контроль использования стоматологических установок по сравнению с 12-часовым рабочим окном.
- **Маржинальность врачей**: Таблица рейтинга специалистов (Leaderboard) с расчетом чистой прибыли (выручка минус себестоимость и премии).

### Защита памяти (OOM)
Для предотвращения зависаний интерфейса графики автоматически выгружаются из памяти (unmount), когда пользователь переключается на другие вкладки системы.


### 4. Billing & Doctor Payouts

The **FinanceView** now includes a complete billing lifecycle management engine:

- **Invoice Splitting**: Cashiers can split invoice payments across multiple methods (Cash, Card, DMS) using the *InvoiceSplitPaymentModal*.
- **Thermal Receipts**: The system automatically generates an 80mm thermal receipt simulator displaying the patient's FDI tooth numbers and service codes, complete with a printable QR code.
- **Doctor Payout Audits**: The **DoctorPayoutDashboard** aggregates all *paid* invoices, subtracts material costs (based on procedure rules), and computes the final doctor commission.
- **Memory Safety**: The useBillingStore purges state upon unmount, preventing React memory leaks when navigating between patient records and the financial hub.

