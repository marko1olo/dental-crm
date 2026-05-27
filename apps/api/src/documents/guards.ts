import {
  documentPayloadDisallowedKeys,
  documentKindMetadata,
  legacyTaxDeductionCertificateMaxYear,
  legacyTaxDeductionCertificateMinYear,
  taxDeductionCertificateMinYear,
  taxDeductionApplicationPayloadSchema,
  type CompletedWorksActPayload,
  type CreateDocumentInput,
  type DocumentKind,
  type InstallmentPaymentSchedulePayload,
  type PaidMedicalServicesContractPayload,
  type Patient,
  type PaymentInvoicePayload,
  type PaymentReceiptPayload,
  type Payment,
  type TreatmentCostEstimatePayload,
  type TreatmentPlanItem,
  type Visit
} from "@dental/shared";

type DocumentVisit = Pick<Visit, "id" | "patientId">;
type DocumentPatient = Pick<Patient, "id">;
type DocumentTreatmentPlanItem = Pick<
  TreatmentPlanItem,
  "patientId" | "visitId" | "status" | "unitPriceRub" | "quantity" | "discountRub"
>;

export type DocumentCreationFacts = {
  patient: DocumentPatient | null;
  visit: DocumentVisit | null;
  paidAmountRub: number;
  plannedAmountRub: number;
  taxPaymentSelectionError?: string | null;
  paymentReceiptSelectionError?: string | null;
  paymentRefundCorrectionSelectionError?: string | null;
};

export type DocumentCreationGuardResult =
  | { ok: true; input: CreateDocumentInput }
  | { ok: false; statusCode: 404 | 409; error: string };

function taxPaidDocumentsNeedYear(kind: DocumentKind): boolean {
  const metadata = documentKindMetadata[kind];
  return metadata.group === "tax" && metadata.amountSource === "paid";
}

function taxPaidDocumentKindIsKnd(kind: DocumentKind): boolean {
  return kind === "tax_deduction_certificate" || kind === "tax_deduction_registry";
}

function taxPaidDocumentKindIsLegacy(kind: DocumentKind): boolean {
  return kind === "legacy_tax_deduction_certificate";
}

function taxCertificateRequiresPayerInn(kind: DocumentKind): boolean {
  return kind === "legacy_tax_deduction_certificate";
}

function taxPaidDocumentRequiresPaymentSelection(kind: DocumentKind): boolean {
  return (
    kind === "tax_deduction_certificate" ||
    kind === "legacy_tax_deduction_certificate" ||
    kind === "tax_deduction_registry"
  );
}

function taxPaidDocumentCanValidatePaymentSelection(kind: DocumentKind): boolean {
  return taxPaidDocumentRequiresPaymentSelection(kind) || kind === "tax_deduction_application";
}

function selectedTaxPaymentIds(input: Pick<CreateDocumentInput, "payload">): string[] {
  if (input.payload?.taxDeductionApplication) return input.payload.taxDeductionApplication.selectedPaymentIds ?? [];
  return input.payload?.taxPaymentSelection?.selectedPaymentIds ?? [];
}

function selectedPaymentReceiptIds(input: Pick<CreateDocumentInput, "payload">): string[] {
  return input.payload?.paymentReceipt?.selectedPaymentIds ?? [];
}

function selectedPaymentRefundCorrectionIds(input: Pick<CreateDocumentInput, "payload">): string[] {
  return input.payload?.paymentRefundCorrection?.selectedPaymentIds ?? [];
}

function payloadKindMismatchReason(input: CreateDocumentInput): string | null {
  const disallowedKeys = documentPayloadDisallowedKeys(input.kind, input.payload);
  if (disallowedKeys.length === 0) return null;
  const documentLabel = documentKindMetadata[input.kind]?.label ?? input.kind;
  return `Структурированные данные не соответствуют документу "${documentLabel}": ${disallowedKeys.join(", ")}. Создайте документ с данными нужной формы.`;
}

function paymentTaxYear(payment: Payment): number | null {
  const sourceDate = payment.fiscalReceiptIssuedAt || payment.paidAt;
  if (!sourceDate) return null;
  const explicitYear = /^(\d{4})/.exec(sourceDate)?.[1];
  if (explicitYear) return Number(explicitYear);
  const parsed = new Date(sourceDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getFullYear();
}

function paymentPaidInTaxYear(payment: Payment, taxYear: number): boolean {
  return paymentTaxYear(payment) === taxYear;
}

function normalizeInnDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D+/g, "");
}

function paymentMatchesTaxPayer(payment: Payment, payerInn: string | null | undefined): boolean {
  const normalizedPayerInn = normalizeInnDigits(payerInn);
  if (!normalizedPayerInn) return true;
  return normalizeInnDigits(payment.payerInn) === normalizedPayerInn;
}

function taxDocumentSelectionScope(input: CreateDocumentInput): { taxYear: number | null | undefined; payerInn: string | null | undefined } {
  const application = input.kind === "tax_deduction_application" ? input.payload?.taxDeductionApplication : null;
  return {
    taxYear: application?.requestedTaxYear ?? input.taxYear,
    payerInn: application?.taxpayerInn ?? input.taxPayerInn
  };
}

function paymentMatchesTaxDocumentScope(payment: Payment, input: CreateDocumentInput): boolean {
  const { taxYear, payerInn } = taxDocumentSelectionScope(input);
  return Boolean(
    taxYear &&
      payment.patientId === input.patientId &&
      payment.status === "paid" &&
      payment.amountRub > 0 &&
      paymentPaidInTaxYear(payment, taxYear) &&
      paymentMatchesTaxPayer(payment, payerInn)
  );
}

export function taxPaymentSelectionErrorForDocument(input: CreateDocumentInput, payments: readonly Payment[]): string | null {
  if (!taxPaidDocumentCanValidatePaymentSelection(input.kind)) return null;

  const selectedIds = selectedTaxPaymentIds(input);
  const { taxYear, payerInn } = taxDocumentSelectionScope(input);
  if (!selectedIds.length) {
    if (!taxPaidDocumentRequiresPaymentSelection(input.kind)) return null;
    return "Для налогового заявления, справки или реестра нужно явно выбрать фискальные чеки. Автоматический захват всех оплат за год отключен.";
  }

  const uniqueSelectedIds = new Set(selectedIds);
  if (uniqueSelectedIds.size !== selectedIds.length) {
    return "В выбранных чеках есть дубли. Оставьте каждый фискальный чек один раз.";
  }

  const paymentsById = new Map(payments.map((payment) => [payment.id, payment]));
  for (const paymentId of selectedIds) {
    const payment = paymentsById.get(paymentId);
    if (!payment) {
      return "Выбранный фискальный чек не найден. Обновите экран и выберите чек заново.";
    }
    if (payment.patientId !== input.patientId) {
      return "Выбранный фискальный чек относится к другому пациенту.";
    }
    if (payment.status !== "paid" || payment.amountRub <= 0) {
      return "В налоговый документ можно включать только проведенные положительные оплаты.";
    }
    if (!taxYear || !paymentPaidInTaxYear(payment, taxYear)) {
      return "Выбранный фискальный чек не относится к выбранному налоговому году.";
    }
    if (!paymentMatchesTaxPayer(payment, payerInn)) {
      return "Выбранный фискальный чек относится к другому ИНН плательщика.";
    }
  }

  return null;
}

function normalizedDocumentValue(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

function normalizedFiscalReceiptNumber(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleUpperCase("ru-RU");
}

function paymentReceiptStoredFieldMatchesPayload(storedValue: string | null | undefined, payloadValue: string | null | undefined): boolean {
  const normalizedStoredValue = normalizedDocumentValue(storedValue);
  if (!normalizedStoredValue) return true;
  return normalizedStoredValue === normalizedDocumentValue(payloadValue);
}

function paymentReceiptStoredInnMatchesPayload(storedValue: string | null | undefined, payloadValue: string | null | undefined): boolean {
  const normalizedStoredValue = normalizeInnDigits(storedValue);
  if (!normalizedStoredValue) return true;
  return normalizedStoredValue === normalizeInnDigits(payloadValue);
}

function paymentReceiptPayloadMatchesPayer(payment: Payment, payload: PaymentReceiptPayload): boolean {
  if (normalizedDocumentValue(payment.payerFullName) !== normalizedDocumentValue(payload.payerFullName)) return false;
  if (!payload.taxSupportRequested) return true;
  return (
    paymentReceiptStoredFieldMatchesPayload(payment.payerBirthDate, payload.payerBirthDate) &&
    paymentReceiptStoredInnMatchesPayload(payment.payerInn, payload.payerInn) &&
    paymentReceiptStoredFieldMatchesPayload(payment.payerIdentityDocument, payload.payerIdentityDocument) &&
    paymentReceiptStoredFieldMatchesPayload(payment.payerRelationship, payload.payerRelationship)
  );
}

function paymentReceiptMissingPayerFact(payment: Payment, payload: PaymentReceiptPayload): string | null {
  if (!payment.payerFullName?.trim()) {
    return "В выбранной оплате не заполнено ФИО плательщика. Заполните плательщика в оплате, затем создавайте квитанцию.";
  }
  if (!payload.taxSupportRequested) return null;
  if (!payment.payerBirthDate?.trim()) {
    return "В выбранной оплате не заполнена дата рождения плательщика. Налоговая квитанция не берет дату из карточки пациента.";
  }
  if (!payment.payerRelationship?.trim()) {
    return "В выбранной оплате не указана связь плательщика с пациентом.";
  }
  if (!normalizeInnDigits(payment.payerInn) && !payment.payerIdentityDocument?.trim()) {
    return "В выбранной оплате не указан ИНН или документ плательщика для налоговой опоры.";
  }
  return null;
}

export function paymentReceiptSelectionErrorForDocument(input: CreateDocumentInput, payments: readonly Payment[]): string | null {
  if (input.kind !== "payment_receipt") return null;
  const payload = input.payload?.paymentReceipt;
  if (!payload) return null;

  const selectedIds = selectedPaymentReceiptIds(input);
  const uniqueSelectedIds = new Set(selectedIds);
  if (uniqueSelectedIds.size !== selectedIds.length) {
    return "В выбранных платежах квитанции есть дубли. Оставьте каждый платеж один раз.";
  }

  const paymentsById = new Map(payments.map((payment) => [payment.id, payment]));
  const selectedPayments: Payment[] = [];
  for (const paymentId of selectedIds) {
    const payment = paymentsById.get(paymentId);
    if (!payment) return "Выбранный платеж для квитанции не найден. Обновите экран и выберите платеж заново.";
    if (payment.patientId !== input.patientId) return "Выбранный платеж для квитанции относится к другому пациенту.";
    if (input.visitId && payment.visitId !== input.visitId) return "Выбранный платеж для квитанции относится к другому визиту.";
    if (payment.status !== "paid" || payment.amountRub <= 0) {
      return "В платежную квитанцию можно включать только проведенные положительные оплаты.";
    }
    if (!payment.fiscalReceiptNumber?.trim()) return "Платежная квитанция требует номер фискального чека в каждом выбранном платеже.";
    if (!payment.fiscalReceiptIssuedAt?.trim()) return "Платежная квитанция требует дату фискального чека в каждом выбранном платеже.";
    const missingPayerFact = paymentReceiptMissingPayerFact(payment, payload);
    if (missingPayerFact) return missingPayerFact;
    if (!paymentReceiptPayloadMatchesPayer(payment, payload)) {
      return "Платежная квитанция не должна смешивать разные данные плательщика. Проверьте выбранные оплаты и карточку плательщика.";
    }
    selectedPayments.push(payment);
  }

  const selectedTotalRub = selectedPayments.reduce((total, payment) => total + payment.amountRub, 0);
  if (selectedTotalRub !== payload.totalPaidRub) {
    return `Платежная квитанция: сумма ${payload.totalPaidRub} руб. не совпадает с выбранными оплатами ${selectedTotalRub} руб.`;
  }

  const actualReceiptNumbers = new Set(
    selectedPayments.map((payment) => normalizedFiscalReceiptNumber(payment.fiscalReceiptNumber)).filter(Boolean)
  );
  const payloadReceiptNumbers = [...new Set(payload.fiscalReceiptNumbers.map(normalizedFiscalReceiptNumber).filter(Boolean))];
  const unknownPayloadReceipts = payloadReceiptNumbers.filter((receiptNumber) => !actualReceiptNumbers.has(receiptNumber));
  if (unknownPayloadReceipts.length) {
    return `Платежная квитанция содержит фискальный чек без связи с выбранной оплатой: ${unknownPayloadReceipts.join(", ")}.`;
  }
  const missingPayloadReceipts = [...actualReceiptNumbers].filter((receiptNumber) => !payloadReceiptNumbers.includes(receiptNumber));
  if (missingPayloadReceipts.length) {
    return `Платежная квитанция должна включать все фискальные чеки выбранных оплат: ${missingPayloadReceipts.join(", ")}.`;
  }

  return null;
}

export function paymentRefundCorrectionSelectionErrorForDocument(input: CreateDocumentInput, payments: readonly Payment[]): string | null {
  if (input.kind !== "payment_refund_correction_request") return null;
  const payload = input.payload?.paymentRefundCorrection;
  if (!payload) return null;

  const selectedIds = selectedPaymentRefundCorrectionIds(input);
  if (!selectedIds.length) {
    return "Для возврата или коррекции выберите конкретный исходный оплаченный платеж.";
  }
  const uniqueSelectedIds = new Set(selectedIds);
  if (uniqueSelectedIds.size !== selectedIds.length) {
    return "В выбранных исходных платежах есть дубли. Оставьте каждый платеж один раз.";
  }

  const expectedReceiptNumber = normalizedFiscalReceiptNumber(payload.originalFiscalReceiptNumber);
  const paymentsById = new Map(payments.map((payment) => [payment.id, payment]));
  for (const paymentId of selectedIds) {
    const payment = paymentsById.get(paymentId);
    if (!payment) return "Выбранный исходный платеж для возврата или коррекции не найден. Обновите экран и выберите платеж заново.";
    if (payment.patientId !== input.patientId) return "Выбранный исходный платеж для возврата или коррекции относится к другому пациенту.";
    if (input.visitId && payment.visitId !== input.visitId) return "Выбранный исходный платеж для возврата или коррекции относится к другому визиту.";
    if (payment.status !== "paid" || payment.amountRub <= 0) {
      return "Возврат или коррекцию можно оформить только по проведенному положительному платежу.";
    }
    if (!payment.fiscalReceiptNumber?.trim()) {
      return "Возврат или коррекция требуют номер исходного фискального чека в выбранном платеже.";
    }
    if (!payment.fiscalReceiptIssuedAt?.trim()) {
      return "Возврат или коррекция требуют дату исходного фискального чека в выбранном платеже.";
    }
    if (normalizedFiscalReceiptNumber(payment.fiscalReceiptNumber) !== expectedReceiptNumber) {
      return "Исходный фискальный чек в заявлении не совпадает с выбранным платежом.";
    }
  }

  return null;
}

function structuredPayloadMissingReason(input: CreateDocumentInput): string | null {
  if (input.kind === "patient_intake_questionnaire" && !input.payload?.patientIntakeQuestionnaire) {
    return "Для анкеты пациента нужны структурированные данные: жалоба, аллергии, препараты, хронические заболевания, беременность/лактация, антикоагулянты и подтверждение пациента.";
  }
  if (input.kind === "tax_deduction_application" && !input.payload?.taxDeductionApplication) {
    return "Для заявления на налоговую справку нужны структурированные данные: заявитель, ИНН, дата рождения, документ, родство, год, форма справки, канал выдачи, контакт и подтверждение проверки дублей.";
  }
  if (input.kind === "paid_medical_services_contract" && !input.payload?.paidMedicalServicesContract) {
    return "Для договора платных медицинских услуг нужны структурированные данные: номер и дата договора, сроки, заказчик, основание обращения, состав услуг, сумма, порядок оплаты, изменение цены, уведомление о бесплатной помощи, предупреждение о рекомендациях врача, отказ/возврат, гарантия и подтверждения пациента.";
  }
  if (input.kind === "completed_works_act" && !input.payload?.completedWorksAct) {
    return "Для акта выполненных работ нужны структурированные данные: номер и дата акта, договор, период оказания, врач, состав работ, суммы, фискальные чеки, претензии или их отсутствие и подтверждения пациента.";
  }
  if (input.kind === "treatment_cost_estimate" && !input.payload?.treatmentCostEstimate) {
    return "Для сметы лечения нужны структурированные данные: номер, дата, пациент или плательщик, основание лечения, состав услуг, сумма, срок действия, правила изменения цены, исключения, условия оплаты, ответственный врач и подтверждения пациента.";
  }
  if (input.kind === "payment_invoice" && !input.payload?.paymentInvoice) {
    return "Для счета на оплату нужны структурированные данные: номер и дата счета, плательщик, назначение платежа, состав услуг, сумма, срок оплаты, реквизиты, способы оплаты и подтверждение, что счет не заменяет кассовый чек.";
  }
  if (input.kind === "payment_receipt" && !input.payload?.paymentReceipt) {
    return "Для платежной квитанции нужны структурированные данные: номер и дата квитанции, выбранные оплаченные платежи, сумма, плательщик, фискальные чеки, назначение оплаты и подтверждение проверки.";
  }
  if (input.kind === "installment_payment_schedule" && !input.payload?.installmentPaymentSchedule) {
    return "Для графика рассрочки нужны структурированные данные: номер и дата графика, базовый договор или план, плательщик, сумма, предоплата, остаток, платежи, правила просрочки, способы оплаты и подтверждения пациента.";
  }
  if (input.kind === "minor_legal_representative_consent" && !input.payload?.minorLegalRepresentativeConsent) {
    return "Для согласия законного представителя нужны структурированные данные: представитель, родство, документ личности, основание полномочий, данные несовершеннолетнего, вмешательство, риски, альтернативы, врач и подтверждения проверки.";
  }
  if (input.kind === "warranty_service_memo" && !input.payload?.warrantyServiceMemo) {
    return "Для гарантийной памятки нужны структурированные данные: работа, дата завершения, зубы или область, материалы, срок гарантии, контрольные визиты, обязанности пациента, исключения, срочные признаки, связанный акт или договор и подтверждения выдачи.";
  }
  if (input.kind === "anesthesia_consent_log" && !input.payload?.anesthesiaConsentLog) {
    return "Для журнала анестезии нужны структурированные данные: метод, препарат, зона, аллергоанамнез и дозы.";
  }
  if (input.kind === "prescription_medication_order" && !input.payload?.prescriptionMedicationOrder) {
    return "Для назначения препаратов нужны структурированные данные: препарат, дозировка, режим, срок и памятка безопасности.";
  }
  if (input.kind === "lab_work_order" && !input.payload?.labWorkOrder) {
    return "Для лабораторного заказа нужны структурированные данные: работа, зона, материал, цвет, источник данных и срок.";
  }
  if (input.kind === "photo_video_consent" && !input.payload?.photoVideoConsent) {
    return "Для согласия на фото, видео и снимки нужны структурированные данные: типы материалов, разрешенные цели, запрет/разрешение публикации и порядок отзыва.";
  }
  if (input.kind === "xray_cbct_referral" && !input.payload?.xrayCbctReferral) {
    return "Для направления на рентген или КЛКТ нужны структурированные данные: вид исследования, область, клинический вопрос, показание, ограничения и ответственный врач.";
  }
  if (input.kind === "medical_record_extract" && !input.payload?.medicalRecordExtract) {
    return "Для выписки из медицинской карты нужны структурированные данные: период, источники записей, жалобы и анамнез, объективный статус, диагноз, лечение, рекомендации, врач, получатель и проверка данных третьих лиц.";
  }
  if (input.kind === "outpatient_medical_card_025u" && !input.payload?.outpatientMedicalCard025u) {
    return "Для медицинской карты 025/у нужны структурированные данные: организация, пациент, номер карты, период, подписанные врачебные записи, диагнозы, стоматологические строки и подтверждения проверки формы 274н.";
  }
  if (input.kind === "medical_record_copy_request" && !input.payload?.medicalRecordCopyRequest) {
    return "Для запроса копий медицинской документации нужны структурированные данные: состав документов, период, формат, получатель, документ получателя, полномочия, контакт выдачи и проверка лишних данных третьих лиц.";
  }
  if (input.kind === "post_visit_recommendations" && !input.payload?.postVisitRecommendations) {
    return "Для рекомендаций после приема нужны структурированные данные: процедура, зона, дата, врач, разрешенные действия, ограничения, назначения, питание, гигиена, тревожные признаки, контакт клиники и краткий текст для Telegram.";
  }
  if (input.kind === "treatment_plan" && !input.payload?.treatmentPlan) {
    return "Для плана лечения нужны структурированные данные: причина обращения, диагноз, область, цели, этапы, стоимость, альтернативы, риски, прогноз, контроль, врач и подтверждения пациента.";
  }
  if (input.kind === "treatment_plan_acceptance" && !input.payload?.treatmentPlanAcceptance) {
    return "Для согласования плана лечения нужны структурированные данные: выбранный вариант, диагноз/цель, зона, этапы, сумма, срок действия сметы, условия оплаты, отклоненные альтернативы, риски, врач и подтверждения пациента.";
  }
  if (input.kind === "visit_attendance_certificate" && !input.payload?.visitAttendanceCertificate) {
    return "Для справки о посещении нужны структурированные данные: время начала и окончания приема, цель выдачи, получатель, дата, подписант и подтверждение, что диагноз не раскрывается.";
  }
  if (input.kind === "medical_document_release_receipt" && !input.payload?.medicalDocumentReleaseReceipt) {
    return "Для расписки о выдаче медицинских документов нужны структурированные данные: получатель, основание, канал, состав выдачи, дата и защита передачи.";
  }
  if (input.kind === "payment_refund_correction_request" && !input.payload?.paymentRefundCorrection) {
    return "Для возврата или коррекции оплаты нужны структурированные данные: действие, сумма, основание, способ, получатель, исходный чек и решение ответственного.";
  }
  if (input.kind === "informed_consent" && !input.payload?.informedConsent) {
    return "Для информированного согласия нужны структурированные данные: вмешательство, область, показание, ожидаемая польза, риски, альтернативы, рекомендации после вмешательства, врач и подтверждения пациента.";
  }
  if (input.kind === "procedure_specific_consent_packet" && !input.payload?.procedureSpecificConsent) {
    return "Для процедурного согласия нужны структурированные данные: вид процедуры, область, показание, анестезия, материалы, персональные риски пациента, процедурные риски, альтернативы, ограничения после процедуры, врач и подтверждения пациента.";
  }
  if (input.kind === "personal_data_processing_consent" && !input.payload?.personalDataProcessingConsent) {
    return "Для согласия на обработку персональных данных нужны структурированные данные: оператор, ИНН, адрес, цели, категории данных, действия обработки, правила передачи третьим лицам, срок хранения, отзыв согласия и подтверждение обработки медицинских данных.";
  }
  if (input.kind === "medical_intervention_refusal" && !input.payload?.medicalInterventionRefusal) {
    return "Для отказа от медицинского вмешательства нужны структурированные данные: вмешательство, показание, причина отказа, разъясненные риски, альтернативы, тревожные признаки и подтверждения пациента.";
  }
  return null;
}

type FinancialServicePayloadLine = {
  quantity: number;
  unitPriceRub: number;
  discountRub: number;
  totalRub: number;
};

function expectedFinancialLineTotal(line: FinancialServicePayloadLine): number {
  return Math.max(0, line.quantity * line.unitPriceRub - line.discountRub);
}

function financialLinesTotal(lines: readonly FinancialServicePayloadLine[]): number {
  return lines.reduce((total, line) => total + line.totalRub, 0);
}

function financialServiceLinesMismatchReason(lines: readonly FinancialServicePayloadLine[], documentLabel: string): string | null {
  for (const [index, line] of lines.entries()) {
    const expectedTotalRub = expectedFinancialLineTotal(line);
    if (line.totalRub !== expectedTotalRub) {
      return `${documentLabel}: строка ${index + 1} должна иметь сумму ${expectedTotalRub} руб. по количеству, цене и скидке; передано ${line.totalRub} руб.`;
    }
  }
  return null;
}

function financialServiceLinesGrandTotalMismatchReason(
  lines: readonly FinancialServicePayloadLine[],
  totalAmountRub: number,
  documentLabel: string
): string | null {
  const linesTotalRub = financialLinesTotal(lines);
  if (linesTotalRub !== totalAmountRub) {
    return `${documentLabel}: общий итог ${totalAmountRub} руб. не совпадает с суммой строк ${linesTotalRub} руб.`;
  }
  return null;
}

function plannedFactsTotalMismatchReason(
  payloadTotalRub: number,
  facts: DocumentCreationFacts,
  documentLabel: string
): string | null {
  if (facts.plannedAmountRub > 0 && payloadTotalRub !== facts.plannedAmountRub) {
    return `${documentLabel}: сумма ${payloadTotalRub} руб. не совпадает с актуальным планом лечения ${facts.plannedAmountRub} руб.`;
  }
  return null;
}

function paidFactsTotalMismatchReason(payloadTotalRub: number, facts: DocumentCreationFacts, documentLabel: string): string | null {
  if (facts.paidAmountRub > 0 && payloadTotalRub !== facts.paidAmountRub) {
    return `${documentLabel}: сумма ${payloadTotalRub} руб. не совпадает с реально оплаченным контекстом ${facts.paidAmountRub} руб.`;
  }
  return null;
}

function treatmentCostEstimateMismatchReason(
  payload: TreatmentCostEstimatePayload,
  facts: DocumentCreationFacts
): string | null {
  return (
    financialServiceLinesMismatchReason(payload.serviceLines, "Смета лечения") ??
    financialServiceLinesGrandTotalMismatchReason(payload.serviceLines, payload.totalAmountRub, "Смета лечения") ??
    plannedFactsTotalMismatchReason(payload.totalAmountRub, facts, "Смета лечения")
  );
}

function paymentInvoiceMismatchReason(payload: PaymentInvoicePayload, facts: DocumentCreationFacts): string | null {
  return (
    financialServiceLinesMismatchReason(payload.serviceLines, "Счет на оплату") ??
    financialServiceLinesGrandTotalMismatchReason(payload.serviceLines, payload.totalAmountRub, "Счет на оплату") ??
    plannedFactsTotalMismatchReason(payload.totalAmountRub, facts, "Счет на оплату")
  );
}

function installmentScheduleMismatchReason(
  payload: InstallmentPaymentSchedulePayload,
  facts: DocumentCreationFacts
): string | null {
  const expectedRemainingRub = Math.max(0, payload.totalAmountRub - payload.prepaidAmountRub);
  if (payload.remainingAmountRub !== expectedRemainingRub) {
    return `График рассрочки: остаток ${payload.remainingAmountRub} руб. не совпадает с суммой минус предоплатой ${expectedRemainingRub} руб.`;
  }

  const installmentsTotalRub = payload.installments.reduce((total, installment) => total + installment.amountRub, 0);
  if (installmentsTotalRub !== payload.remainingAmountRub) {
    return `График рассрочки: сумма платежей ${installmentsTotalRub} руб. не совпадает с остатком ${payload.remainingAmountRub} руб.`;
  }

  return plannedFactsTotalMismatchReason(payload.totalAmountRub, facts, "График рассрочки");
}

function paidContractMismatchReason(payload: PaidMedicalServicesContractPayload, facts: DocumentCreationFacts): string | null {
  if (!payload.customerFullName.trim()) {
    return "Договор платных медицинских услуг: укажите заказчика. Для взрослого пациента это сам пациент, для ребенка или оплаты третьим лицом - законный представитель или плательщик.";
  }
  return plannedFactsTotalMismatchReason(payload.estimatedTotalRub, facts, "Договор платных медицинских услуг");
}

function completedWorksActMismatchReason(payload: CompletedWorksActPayload, facts: DocumentCreationFacts): string | null {
  if (payload.totalByActRub !== payload.paidRub) {
    return `Акт выполненных работ: сумма акта ${payload.totalByActRub} руб. не совпадает с оплаченной суммой ${payload.paidRub} руб.`;
  }
  return (
    paidFactsTotalMismatchReason(payload.totalByActRub, facts, "Акт выполненных работ") ??
    paidFactsTotalMismatchReason(payload.paidRub, facts, "Акт выполненных работ")
  );
}

function documentPayloadConsistencyReason(input: CreateDocumentInput, facts: DocumentCreationFacts): string | null {
  if (input.kind === "paid_medical_services_contract" && input.payload?.paidMedicalServicesContract) {
    return paidContractMismatchReason(input.payload.paidMedicalServicesContract, facts);
  }
  if (input.kind === "completed_works_act" && input.payload?.completedWorksAct) {
    return completedWorksActMismatchReason(input.payload.completedWorksAct, facts);
  }
  if (input.kind === "treatment_cost_estimate" && input.payload?.treatmentCostEstimate) {
    return treatmentCostEstimateMismatchReason(input.payload.treatmentCostEstimate, facts);
  }
  if (input.kind === "payment_invoice" && input.payload?.paymentInvoice) {
    return paymentInvoiceMismatchReason(input.payload.paymentInvoice, facts);
  }
  if (input.kind === "installment_payment_schedule" && input.payload?.installmentPaymentSchedule) {
    return installmentScheduleMismatchReason(input.payload.installmentPaymentSchedule, facts);
  }
  if (input.kind === "tax_deduction_application" && input.payload?.taxDeductionApplication) {
    const application = input.payload.taxDeductionApplication;
    const applicationPayloadResult = taxDeductionApplicationPayloadSchema.safeParse(application);
    if (!applicationPayloadResult.success) {
      return applicationPayloadResult.error.issues[0]?.message ?? "Заявление на налоговый вычет содержит некорректные данные.";
    }
    if (input.taxYear && input.taxYear !== application.requestedTaxYear) {
      return `Заявление на налоговый вычет: год документа ${input.taxYear} не совпадает с годом заявления ${application.requestedTaxYear}.`;
    }
    if (application.requestedForm === "knd_1151156" && application.requestedTaxYear < taxDeductionCertificateMinYear) {
      return "Заявление на налоговый вычет: КНД 1151156 доступна только для оплат с 2024 года.";
    }
    if (
      application.requestedForm === "legacy_2021_2023" &&
      (application.requestedTaxYear < legacyTaxDeductionCertificateMinYear ||
        application.requestedTaxYear > legacyTaxDeductionCertificateMaxYear)
    ) {
      return "Заявление на налоговый вычет: старая форма доступна только для оплат 2021-2023.";
    }
  }
  return null;
}

export function paidAmountRubForDocument(kind: DocumentKind, input: CreateDocumentInput, payments: Payment[]) {
  const metadata = documentKindMetadata[kind];
  if (metadata.requiresPaidRecord && metadata.group !== "tax" && !input.visitId) {
    return 0;
  }
  if (taxPaidDocumentsNeedYear(kind) && !input.taxYear) {
    return 0;
  }
  if (taxPaidDocumentKindIsKnd(kind) && input.taxYear && input.taxYear < taxDeductionCertificateMinYear) {
    return 0;
  }
  if (
    taxPaidDocumentKindIsLegacy(kind) &&
    input.taxYear &&
    (input.taxYear < legacyTaxDeductionCertificateMinYear || input.taxYear > legacyTaxDeductionCertificateMaxYear)
  ) {
    return 0;
  }
  if (taxPaidDocumentRequiresPaymentSelection(kind)) {
    const selectedIds = new Set(selectedTaxPaymentIds(input));
    if (!selectedIds.size) return 0;
    return payments
      .filter((payment) => selectedIds.has(payment.id) && paymentMatchesTaxDocumentScope(payment, input))
      .reduce((total, payment) => total + payment.amountRub, 0);
  }
  if (kind === "payment_receipt" && input.payload?.paymentReceipt) {
    const selectedIds = new Set(selectedPaymentReceiptIds(input));
    if (!selectedIds.size) return 0;
    return payments
      .filter(
        (payment) =>
          selectedIds.has(payment.id) &&
          payment.patientId === input.patientId &&
          payment.status === "paid" &&
          payment.amountRub > 0 &&
          (!input.visitId || payment.visitId === input.visitId)
      )
      .reduce((total, payment) => total + payment.amountRub, 0);
  }
  if (kind === "payment_refund_correction_request" && input.payload?.paymentRefundCorrection) {
    const selectedIds = new Set(selectedPaymentRefundCorrectionIds(input));
    if (!selectedIds.size) return 0;
    return payments
      .filter(
        (payment) =>
          selectedIds.has(payment.id) &&
          payment.patientId === input.patientId &&
          payment.status === "paid" &&
          payment.amountRub > 0 &&
          (!input.visitId || payment.visitId === input.visitId)
      )
      .reduce((total, payment) => total + payment.amountRub, 0);
  }

  return payments
    .filter((payment) => payment.patientId === input.patientId && payment.status === "paid")
    .filter((payment) =>
      metadata.group === "tax"
        ? Boolean(input.taxYear && paymentPaidInTaxYear(payment, input.taxYear) && paymentMatchesTaxPayer(payment, input.taxPayerInn))
        : !input.visitId || payment.visitId === input.visitId
    )
    .reduce((total, payment) => total + payment.amountRub, 0);
}

function treatmentLineTotal(item: DocumentTreatmentPlanItem): number {
  return Math.max(0, item.unitPriceRub * item.quantity - item.discountRub);
}

export function plannedAmountRubForDocument(
  kind: DocumentKind,
  input: CreateDocumentInput,
  treatmentPlanItems: DocumentTreatmentPlanItem[]
) {
  const metadata = documentKindMetadata[kind];
  if (metadata.amountSource !== "planned") {
    return 0;
  }
  if (!input.visitId) {
    return 0;
  }

  return treatmentPlanItems
    .filter((item) => item.patientId === input.patientId && item.status !== "cancelled")
    .filter((item) => !input.visitId || item.visitId === input.visitId)
    .reduce((total, item) => total + treatmentLineTotal(item), 0);
}

export function validateDocumentCreation(
  input: CreateDocumentInput,
  facts: DocumentCreationFacts
): DocumentCreationGuardResult {
  if (!facts.patient) {
    return { ok: false, statusCode: 404, error: "Пациент не найден" };
  }

  if (input.visitId && !facts.visit) {
    return { ok: false, statusCode: 404, error: "Визит не найден" };
  }

  if (facts.visit && facts.visit.patientId !== input.patientId) {
    return { ok: false, statusCode: 409, error: "Визит не принадлежит выбранному пациенту" };
  }

  const metadata = documentKindMetadata[input.kind];
  if (metadata.requiresVisit && !input.visitId) {
    return { ok: false, statusCode: 409, error: "Документ должен быть связан с конкретным визитом." };
  }
  if (metadata.requiresPaidRecord && metadata.group !== "tax" && !input.visitId) {
    return { ok: false, statusCode: 409, error: "Платежному документу нужен явный визит или платежный контекст." };
  }
  if (taxPaidDocumentsNeedYear(input.kind) && !input.taxYear) {
    return { ok: false, statusCode: 409, error: "Налоговым документам нужен явный год оплаты." };
  }
  if (taxCertificateRequiresPayerInn(input.kind) && !input.taxPayerInn?.trim()) {
    return {
      ok: false,
      statusCode: 409,
      error: "Налоговой справке нужен ИНН налогоплательщика. Для разных плательщиков создавайте отдельные справки."
    };
  }
  if (taxPaidDocumentKindIsKnd(input.kind) && input.taxYear && input.taxYear < taxDeductionCertificateMinYear) {
    return {
      ok: false,
      statusCode: 409,
      error: "КНД 1151156 поддерживается только для оплат с 2024 года."
    };
  }
  if (
    taxPaidDocumentKindIsLegacy(input.kind) &&
    input.taxYear &&
    (input.taxYear < legacyTaxDeductionCertificateMinYear || input.taxYear > legacyTaxDeductionCertificateMaxYear)
  ) {
    return {
      ok: false,
      statusCode: 409,
      error: "Старая налоговая справка поддерживается только для оплат 2021-2023; для оплат с 2024 года используйте КНД 1151156."
    };
  }
  if (taxPaidDocumentRequiresPaymentSelection(input.kind) && !selectedTaxPaymentIds(input).length) {
    return {
      ok: false,
      statusCode: 409,
      error: "Для налогового заявления, справки или реестра нужно явно выбрать фискальные чеки. Автоматический захват всех оплат за год отключен."
    };
  }
  if (metadata.amountSource === "planned" && !input.visitId) {
    return { ok: false, statusCode: 409, error: "Документ с плановой суммой требует явный визит или контекст плана лечения." };
  }

  const payloadMismatchReason = payloadKindMismatchReason(input);
  if (payloadMismatchReason) {
    return { ok: false, statusCode: 409, error: payloadMismatchReason };
  }

  const payloadReason = structuredPayloadMissingReason(input);
  if (payloadReason) {
    return { ok: false, statusCode: 409, error: payloadReason };
  }

  const payloadConsistencyReason = documentPayloadConsistencyReason(input, facts);
  if (payloadConsistencyReason) {
    return { ok: false, statusCode: 409, error: payloadConsistencyReason };
  }
  if (facts.taxPaymentSelectionError) {
    return { ok: false, statusCode: 409, error: facts.taxPaymentSelectionError };
  }
  if (facts.paymentReceiptSelectionError) {
    return { ok: false, statusCode: 409, error: facts.paymentReceiptSelectionError };
  }
  if (facts.paymentRefundCorrectionSelectionError) {
    return { ok: false, statusCode: 409, error: facts.paymentRefundCorrectionSelectionError };
  }

  if (
    input.kind === "photo_video_consent" &&
    input.payload?.photoVideoConsent?.recognizablePublicationAllowed &&
    !input.payload.photoVideoConsent.educationUseAllowed &&
    !input.payload.photoVideoConsent.marketingUseAllowed
  ) {
    return {
      ok: false,
      statusCode: 409,
      error: "Публикация узнаваемых фото или видео требует отдельного разрешения на обучение или маркетинг."
    };
  }

  if (
    input.kind === "xray_cbct_referral" &&
    input.payload?.xrayCbctReferral?.studyType === "cbct" &&
    input.payload.xrayCbctReferral.pregnancyStatus !== "not_applicable" &&
    !input.payload.xrayCbctReferral.safetyNotes.trim()
  ) {
    return {
      ok: false,
      statusCode: 409,
      error: "Для КЛКТ при возможной беременности или неясном статусе нужен явный комментарий по ограничениям и защите."
    };
  }

  let totalAmountRub = metadata.amountSource === "none" ? null : input.totalAmountRub ?? null;

  if (metadata.requiresPaidRecord) {
    if (facts.paidAmountRub <= 0) {
      return {
        ok: false,
        statusCode: 409,
        error: "Для этого документа нужен существующий оплаченный платеж; плановые суммы не подходят."
      };
    }
    totalAmountRub = facts.paidAmountRub;
  }

  if (input.kind === "payment_refund_correction_request" && input.payload?.paymentRefundCorrection) {
    const requestedAmountRub = input.payload.paymentRefundCorrection.amountRub;
    if (requestedAmountRub > facts.paidAmountRub) {
      return {
        ok: false,
        statusCode: 409,
        error: "Сумма возврата или коррекции не может превышать фактически оплаченную сумму по выбранному визиту."
      };
    }
  }

  if (metadata.amountSource === "planned") {
    totalAmountRub = facts.plannedAmountRub > 0 ? facts.plannedAmountRub : null;
  }

  return {
    ok: true,
    input: {
      ...input,
      taxYear: metadata.group === "tax" ? input.taxYear ?? null : null,
      taxPayerInn: metadata.group === "tax" ? input.taxPayerInn?.trim() || null : null,
      payload: input.payload ?? null,
      totalAmountRub
    }
  };
}
