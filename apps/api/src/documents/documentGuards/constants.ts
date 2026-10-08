/** Заглушка суммы, которую напечатать не удалось: форма денег сохранена, значение — нет. */
export const MONEY_TEXT_UNPRINTABLE = "?.??";

/**
 * Русские подписи полей заявления на налоговый вычет: ключ контракта → подпись
 * из формы заявления.
 *
 * Без словаря отказ называл бы поле латинским ключом (`taxpayerIdentityDocument`
 * — 24 знака), а латинское слово из шести и более знаков гасит фразу целиком
 * фильтром клиента.
 */
export const taxDeductionApplicationFieldLabels: Record<string, string> = {
	taxpayerFullName: "ФИО налогоплательщика",
	taxpayerInn: "ИНН налогоплательщика",
	taxpayerBirthDate: "дата рождения налогоплательщика",
	taxpayerIdentityDocument: "документ налогоплательщика",
	relationshipToPatient: "родство с пациентом",
	requestedTaxYear: "год вычета",
	requestedForm: "форма справки",
	selectedPaymentIds: "выбранные оплаты",
	deliveryChannel: "способ выдачи документа",
	contactForReadyDocument: "контакт для готового документа",
	applicantAuthorityDocument: "документ о полномочиях заявителя",
	requestedAt: "дата заявления",
	duplicateWarningAccepted: "подтверждение о повторном заявлении",
};
