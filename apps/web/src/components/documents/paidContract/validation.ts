/**
 * paidContract/validation.ts
 *
 * Валидация договора на оказание платных медицинских услуг
 * по Постановлению Правительства РФ № 736 от 11.05.2023.
 * Реализует Мандаты 8e (Автономия врача) и 8n (Zero Dead-Ends: CITO / Острая боль).
 */

import type {
	PaidContractData,
	PaidContractMissingField,
	PaidContractValidationResult,
	ValidatePaidContractOptions,
} from "./types";

/**
 * Валидация договора на оказание платных медицинских услуг по Постановлению Правительства РФ № 736 от 11.05.2023.
 */
export function validatePaidContract736(
	contract: PaidContractData,
	options?: ValidatePaidContractOptions,
): PaidContractValidationResult {
	const missing: PaidContractMissingField[] = [];
	const warnings: string[] = [];

	const checkFilled = (val: string | number | undefined | null): boolean => {
		if (val === undefined || val === null) return false;
		if (typeof val === "number") return val > 0;
		return val.trim().length > 0;
	};

	const isCitoEmergency = Boolean(options?.isCito);

	// 1. Номер и дата договора
	if (!checkFilled(contract.contractNumber)) {
		missing.push({
			section: "Реквизиты договора",
			field: "contractNumber",
			label: "Номер договора",
			hint: "Укажите номер по реестру договоров клиники (например, ДПМУ-2026-001).",
		});
	}
	if (!checkFilled(contract.contractDate)) {
		missing.push({
			section: "Реквизиты договора",
			field: "contractDate",
			label: "Дата заключения договора",
			hint: "Укажите дату заключения договора.",
		});
	}

	// 2. Реквизиты клиники (Исполнителя) — п. 17 ПП РФ № 736
	const cl = contract.clinic;
	if (!checkFilled(cl.fullName)) {
		missing.push({
			section: "Сведения об Исполнителе (Клинике)",
			field: "clinic.fullName",
			label: "Полное фирменное наименование клиники",
			hint: "Укажите полное юридическое наименование организации согласно ЕГРЮЛ.",
		});
	}
	if (!checkFilled(cl.ogrn)) {
		missing.push({
			section: "Сведения об Исполнителе (Клинике)",
			field: "clinic.ogrn",
			label: "ОГРН / ОГРНИП клиники",
			hint: "Укажите 13-значный (для юрлиц) или 15-значный (для ИП) ОГРН.",
		});
	}
	if (!checkFilled(cl.inn)) {
		missing.push({
			section: "Сведения об Исполнителе (Клинике)",
			field: "clinic.inn",
			label: "ИНН клиники",
			hint: "Укажите ИНН организации.",
		});
	}
	if (!checkFilled(cl.legalAddress)) {
		missing.push({
			section: "Сведения об Исполнителе (Клинике)",
			field: "clinic.legalAddress",
			label: "Адрес места нахождения (юридический)",
			hint: "Укажите юридический адрес организации.",
		});
	}
	if (!checkFilled(cl.actualAddress)) {
		missing.push({
			section: "Сведения об Исполнителе (Клинике)",
			field: "clinic.actualAddress",
			label: "Адрес места осуществления медицинской деятельности",
			hint: "Укажите фактический адрес филиала клиники, где оказывается медпомощь.",
		});
	}
	if (!checkFilled(cl.licenseNumber)) {
		missing.push({
			section: "Сведения об Исполнителе (Клинике)",
			field: "clinic.licenseNumber",
			label: "Номер медицинской лицензии (ЕРИЛ / Росздравнадзор)",
			hint: "Укажите номер лицензии единого реестра, например: Л041-01137-77/00584930.",
		});
	}
	if (!checkFilled(cl.phone)) {
		missing.push({
			section: "Сведения об Исполнителе (Клинике)",
			field: "clinic.phone",
			label: "Телефон клиники",
			hint: "Укажите официальный телефон медицинской организации.",
		});
	}

	// 3. Реквизиты Пациента (Потребителя) — п. 17 ПП РФ № 736
	const pt = contract.patient;
	if (!checkFilled(pt.fullName)) {
		if (options?.allowBlankForPrint || isCitoEmergency) {
			warnings.push(
				"Ф.И.О. Пациента не заполнено — для печати бланка выведены подчеркивания для заполнения от руки.",
			);
		} else {
			missing.push({
				section: "Сведения о Пациенте (Потребителе)",
				field: "patient.fullName",
				label: "Ф.И.О. Пациента",
				hint: "Укажите фамилию, имя и отчество пациента полностью.",
			});
		}
	}
	if (!checkFilled(pt.birthDate)) {
		if (options?.allowBlankForPrint || isCitoEmergency) {
			warnings.push(
				"Дата рождения Пациента не заполнена — для печати бланка выведены подчеркивания для заполнения от руки.",
			);
		} else {
			missing.push({
				section: "Сведения о Пациенте (Потребителе)",
				field: "patient.birthDate",
				label: "Дата рождения Пациента",
				hint: "Укажите дату рождения пациента.",
			});
		}
	}
	if (!checkFilled(pt.passportSeries) || !checkFilled(pt.passportNumber)) {
		if (options?.allowBlankForPrint || isCitoEmergency) {
			warnings.push(
				"Паспортные данные Пациента не заполнены — для печати бланка выведены подчеркивания для заполнения от руки в холле.",
			);
		} else {
			missing.push({
				section: "Сведения о Пациенте (Потребителе)",
				field: "patient.passport",
				label: "Паспортные данные Пациента (серия и номер)",
				hint: "Укажите серию и номер паспорта гражданина РФ или иного документа, удостоверяющего личность.",
			});
		}
	}
	if (!checkFilled(pt.registrationAddress)) {
		if (options?.allowBlankForPrint || isCitoEmergency) {
			warnings.push(
				"Адрес регистрации Пациента не заполнен — для печати бланка выведены подчеркивания для заполнения от руки.",
			);
		} else {
			missing.push({
				section: "Сведения о Пациенте (Потребителе)",
				field: "patient.registrationAddress",
				label: "Адрес регистрации Пациента",
				hint: "Укажите адрес регистрации по месту жительства.",
			});
		}
	}
	if (!checkFilled(pt.phone)) {
		if (options?.allowBlankForPrint || isCitoEmergency) {
			warnings.push(
				"Телефон Пациента не заполнен — для печати бланка выведены подчеркивания для заполнения от руки.",
			);
		} else {
			missing.push({
				section: "Сведения о Пациенте (Потребителе)",
				field: "patient.phone",
				label: "Телефон Пациента",
				hint: "Укажите контактный номер телефона для связи и СМС-уведомлений.",
			});
		}
	}

	// 4. Заказчик (если отличается от Пациента)
	if (contract.customer.isDifferentFromPatient) {
		const cust = contract.customer;
		if (!checkFilled(cust.fullName)) {
			if (options?.allowBlankForPrint || isCitoEmergency) {
				warnings.push(
					"Ф.И.О. Заказчика не заполнено — для печати выведены подчеркивания для заполнения от руки.",
				);
			} else {
				missing.push({
					section: "Сведения о Заказчике (Плательщике)",
					field: "customer.fullName",
					label: "Ф.И.О. Заказчика",
					hint: "Укажите Ф.И.О. лица, оплачивающего медицинские услуги.",
				});
			}
		}
		if (!checkFilled(cust.passportSeries) || !checkFilled(cust.passportNumber)) {
			if (options?.allowBlankForPrint || isCitoEmergency) {
				warnings.push(
					"Паспортные данные Заказчика не заполнены — для печати бланка выведены подчеркивания для заполнения от руки.",
				);
			} else {
				missing.push({
					section: "Сведения о Заказчике (Плательщике)",
					field: "customer.passport",
					label: "Паспорт Заказчика",
					hint: "Укажите паспортные данные заказчика.",
				});
			}
		}
		if (!checkFilled(cust.phone)) {
			if (options?.allowBlankForPrint || isCitoEmergency) {
				warnings.push(
					"Телефон Заказчика не заполнен — для печати бланка выведены подчеркивания для заполнения от руки.",
				);
			} else {
				missing.push({
					section: "Сведения о Заказчике (Плательщике)",
					field: "customer.phone",
					label: "Телефон Заказчика",
					hint: "Укажите телефон заказчика.",
				});
			}
		}
	}

	// 5. Законный представитель (для несовершеннолетних)
	if (contract.representative.hasRepresentative) {
		const rep = contract.representative;
		if (!checkFilled(rep.fullName)) {
			missing.push({
				section: "Законный представитель",
				field: "representative.fullName",
				label: "Ф.И.О. представителя",
				hint: "Укажите Ф.И.О. родителя / опекуна.",
			});
		}
		if (!checkFilled(rep.basisDocument)) {
			missing.push({
				section: "Законный представитель",
				field: "representative.basisDocument",
				label: "Документ, подтверждающий полномочия",
				hint: "Укажите реквизиты свидетельства о рождении или акта органа опеки.",
			});
		}
	}

	// 6. Предмет договора и состав услуг — п. 18 ПП РФ № 736
	if (!checkFilled(contract.clinicalReason)) {
		if (options?.allowBlankForPrint || isCitoEmergency) {
			warnings.push(
				"Основание обращения не заполнено — для печати бланка выведена первичная консультация и осмотр.",
			);
		} else {
			missing.push({
				section: "Предмет договора",
				field: "clinicalReason",
				label: "Основание обращения / клинический диагноз",
				hint: "Укажите диагноз МКБ-10 или повод для оказания стоматологической помощи.",
			});
		}
	}
	if (!checkFilled(contract.serviceScopeSummary) && (!contract.services || contract.services.length === 0)) {
		if (options?.allowBlankForPrint || isCitoEmergency) {
			warnings.push(
				"Состав услуг не детализирован — для печати выведены услуги по плану лечения / смете.",
			);
		} else {
			missing.push({
				section: "Предмет договора",
				field: "serviceScopeSummary",
				label: "Перечень и состав согласованных платных услуг",
				hint: "Укажите перечень стоматологических услуг согласно смете / плану лечения.",
			});
		}
	}

	// 7. Сроки оказания услуг — п. 17 ПП РФ № 736
	if (!checkFilled(contract.serviceStart)) {
		if (options?.allowBlankForPrint || isCitoEmergency) {
			warnings.push("Дата начала оказания услуг будет заполнена в день обращения.");
		} else {
			missing.push({
				section: "Сроки оказания услуг",
				field: "serviceStart",
				label: "Дата начала оказания услуг",
				hint: "Укажите дату или время начала первого клинического этапа.",
			});
		}
	}
	if (!checkFilled(contract.serviceEndOrCondition)) {
		if (options?.allowBlankForPrint || isCitoEmergency) {
			warnings.push("Срок или условие завершения услуг будет определено по плану лечения.");
		} else {
			missing.push({
				section: "Сроки оказания услуг",
				field: "serviceEndOrCondition",
				label: "Срок или условие завершения услуг",
				hint: "Укажите дату окончания или условие (например, «до подписания Акта оказанных услуг»).",
			});
		}
	}

	// 8. Стоимость и порядок оплаты — п. 17, 21 ПП РФ № 736
	if (contract.totalAmountKopecks !== undefined && contract.totalAmountKopecks < 0) {
		missing.push({
			section: "Стоимость и оплата",
			field: "totalAmountKopecks",
			label: "Ориентировочная сумма договора",
			hint: "Сумма договора не может быть отрицательной.",
		});
	} else if (!contract.totalAmountKopecks || contract.totalAmountKopecks <= 0) {
		if (options?.allowBlankForPrint || isCitoEmergency) {
			warnings.push(
				"Сумма договора не указана (0 руб.) — на печать выведены подчеркивания для заполнения от руки пациентом в холле перед приемом.",
			);
		} else {
			missing.push({
				section: "Стоимость и оплата",
				field: "totalAmountKopecks",
				label: "Ориентировочная сумма договора",
				hint: "Укажите сумму договора в копейках / рублях (сумма должна быть больше 0).",
			});
		}
	}
	if (!checkFilled(contract.paymentTerms)) {
		missing.push({
			section: "Стоимость и оплата",
			field: "paymentTerms",
			label: "Порядок и форма расчетов",
			hint: "Укажите условия оплаты (100% предоплата, поэтапная оплата, кассовый чек по 54-ФЗ).",
		});
	}
	if (!checkFilled(contract.priceChangeRules)) {
		missing.push({
			section: "Стоимость и оплата",
			field: "priceChangeRules",
			label: "Порядок изменения цены и объема",
			hint: "Укажите порядок оформления дополнительных услуг письменно через доп. соглашение.",
		});
	}

	// 9. Обязательные уведомления — п. 7, 10, 15 ПП РФ № 736
	if (!checkFilled(contract.freeCareNotice)) {
		missing.push({
			section: "Обязательные правовые уведомления",
			field: "freeCareNotice",
			label: "Уведомление о бесплатной помощи (ОМС)",
			hint: "Обязательное по закону уведомление о возможности получения помощи по ОМС без взимания платы.",
		});
	}
	if (!checkFilled(contract.medicalRecommendationWarning)) {
		missing.push({
			section: "Обязательные правовые уведомления",
			field: "medicalRecommendationWarning",
			label: "Предупреждение о последствиях несоблюдения назначений врача",
			hint: "Обязательное предупреждение о снижении качества и рисках при несоблюдении режима лечения.",
		});
	}

	// 10. Ответственность, отказ и гарантии
	if (!checkFilled(contract.refusalAndRefundTerms)) {
		missing.push({
			section: "Отказ от услуг и возврат",
			field: "refusalAndRefundTerms",
			label: "Условия отказа и возврата денежных средств",
			hint: "Укажите порядок возврата за вычетом фактически понесенных расходов клиники.",
		});
	}
	if (!checkFilled(contract.warrantyTerms)) {
		missing.push({
			section: "Гарантийные обязательства",
			field: "warrantyTerms",
			label: "Гарантийные сроки и условия их сохранения",
			hint: "Укажите гарантийные обязательства клиники и периодичность профосмотров (не реже 1 раза в 6 мес.).",
		});
	}

	// 11. Обязательные подтверждения (чекбоксы)
	const disc = contract.confirmedDisclosures;
	if (!disc.clinicInfoConfirmed) {
		missing.push({
			section: "Подтверждения пациента",
			field: "confirmedDisclosures.clinicInfoConfirmed",
			label: "Сведения о клинике, лицензии и прейскуранте получены",
			hint: "Пациент должен подтвердить ознакомление со сведениями об исполнителе.",
		});
	}
	if (!disc.serviceListAndPriceConfirmed) {
		missing.push({
			section: "Подтверждения пациента",
			field: "confirmedDisclosures.serviceListAndPriceConfirmed",
			label: "Перечень услуг и предварительная смета согласованы",
			hint: "Пациент должен подтвердить согласование перечня и стоимости услуг.",
		});
	}
	if (!disc.paidBasisUnderstood) {
		missing.push({
			section: "Подтверждения пациента",
			field: "confirmedDisclosures.paidBasisUnderstood",
			label: "Платная основа услуг понятна",
			hint: "Пациент должен подтвердить добровольный выбор платных услуг.",
		});
	}
	if (!disc.freeCareNoticeUnderstood) {
		missing.push({
			section: "Подтверждения пациента",
			field: "confirmedDisclosures.freeCareNoticeUnderstood",
			label: "Уведомление о программе госгарантий (ОМС) принято",
			hint: "Обязательная отметка по п. 7 Постановления Правительства РФ № 736.",
		});
	}
	if (!disc.writtenChangesConfirmed) {
		missing.push({
			section: "Подтверждения пациента",
			field: "confirmedDisclosures.writtenChangesConfirmed",
			label: "Письменное оформление дополнительных услуг согласовано",
			hint: "Пациент подтверждает, что доп. услуги не оказываются без доп. соглашения.",
		});
	}

	// Предупреждения
	if (!contract.doctorFullName) {
		warnings.push("Не указан ответственный лечащий врач клиники.");
	}
	if (!contract.patient.snils) {
		warnings.push("Не указан СНИЛС пациента (рекомендуется для корректной передачи сведений в ЕГИСЗ Минздрава РФ).");
	}
	if (!contract.patient.passportDepartmentCode) {
		warnings.push("Не указан код подразделения паспорта пациента.");
	}

	if (isCitoEmergency) {
		warnings.push("Оказание экстренной помощи по острой боли: приём пациента и спасение здоровья проводятся безотлагательно.");
	}

	return {
		isValid: missing.length === 0,
		missingFields: missing,
		warnings,
	};
}
