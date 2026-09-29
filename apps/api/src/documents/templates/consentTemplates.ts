import {
	type ClinicProfile,
	type GeneratedDocument,
	type InformedConsentPayload,
	type MedicalInterventionRefusalPayload,
	type MinorLegalRepresentativeConsentPayload,
	type Patient,
	type PersonalDataProcessingConsentPayload,
	type ProcedureSpecificConsentPayload,
	type ServiceCatalogItem,
	type TreatmentPlanAcceptancePayload,
	type TreatmentPlanItem,
	type TreatmentPlanPayload,
	parseKopecks,
	renderGraphicalDentalFormulaHtml,
	splitKopecks,
	sumKopecks,
} from "@dental/shared";
import {
	DocumentRenderContext,
	escapeHtml,
	present,
	compactParts,
	patientAdministrativeProfile,
	patientIdentityDocument,
	patientTaxpayerInn,
	patientRegistrationAddress,
	patientResidentialAddress,
	patientSnils,
	patientInsurancePolicyNumber,
	patientDataProcessingBasisNote,
	representativeIdentityLine,
	representativeDisplayLine,
	representativeAuthorityLine,
	representativeContactLine,
	documentRecipientLine,
	preferredDocumentRecipient,
	legalRepresentativeName,
	legalRepresentativeRelationship,
	legalRepresentativeDocument,
	legalRepresentativePhone,
	clinicDisplayName,
	clinicLicenseLine,
	clinicLegalRequisites,
	clinicPaymentRequisites,
	clinicSignatory,
	documentRequiresClinicLegalProfile,
	clinicLegalProfileMissingFields,
	documentPayloadBlockReason,
	hasClinicalToothRows,
	clinicalToothRowsTable,
	row,
	cell,
	issuedDate,
	rub,
} from "./baseRenderUtils.js";
import {
	bulletList,
	checkList,
	signatureBlock,
	signatureParty,
} from "./signatureRenderUtils.js";
import { baseDocument } from "./baseDocument.js";
import {
	treatmentPlanItemTotalKopecks,
	treatmentPlanTotalKopecks,
	treatmentPlanTotalRub,
	unreadableTreatmentPlanItems,
	financialServiceRows,
} from "./contractAndActTemplates.js";

export function informedConsent(document: GeneratedDocument) {
	const payload = document.payload?.informedConsent as
		| InformedConsentPayload
		| undefined;
	if (payload) {
		const trusted = present(payload.trustedContactForMedicalInfo);
		const trustedContacts = trusted
			? escapeHtml(trusted)
			: "сведения о состоянии здоровья и диагнозе третьим лицам не передавать (за исключением случаев, предусмотренных ст. 13 323-ФЗ)";

		return `<h2>Информированное добровольное согласие на медицинское вмешательство</h2>
    <div class="notice">
      Настоящее информированное добровольное согласие составлено в строгом соответствии со ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ «Об основах охраны здоровья граждан в Российской Федерации» и Приказом Министерства здравоохранения РФ от 12.11.2021 № 1051н.
    </div>

    <h2>1. Сведения о планируемом медицинском вмешательстве</h2>
    <table>
      ${row("Вид медицинского вмешательства", payload.intervention)}
      ${row("Область / анатомическая зона / зубы", payload.toothOrArea)}
      ${row("Диагноз и клинические показания", payload.diagnosisOrIndication)}
      ${row("Цели вмешательства и ожидаемая польза", payload.expectedBenefit)}
      ${row("Планируемое обезболивание / анестезия", present(payload.plannedAnesthesia) ?? "не применяется / по клиническим показаниям")}
      ${present(payload.materialOrMedicationNotes) ? row("Материалы, лекарственные препараты", payload.materialOrMedicationNotes ?? "") : ""}
      ${row("Лечащий врач, проводивший разъяснение", payload.doctorFullName?.trim() ? payload.doctorFullName : "________________________ (подпись / расшифровка)")}
      ${row("Дата и время оформления согласия", payload.consentConfirmedAt)}
    </table>

    <h2>2. Разъясненные риски и возможные осложнения</h2>
    <div class="legal-body">
      <p class="legal-clause">Пациенту в доступной форме разъяснены вероятные риски, связанные с проведением вмешательства, а также возможные индивидуальные реакции и осложнения:</p>
      ${bulletList(payload.explainedRisks)}
    </div>

    <h2>3. Альтернативные методы лечения и последствия отказа</h2>
    <div class="legal-body">
      <p class="legal-clause">Пациенту разъяснены альтернативные методы лечения (включая консервативные, хирургические и ортопедические варианты), их сравнительная эффективность и последствия полного или частичного отказа от медицинского вмешательства (прогрессирование патологического процесса, развитие воспалительных осложнений, потеря зуба, деструкция костной ткани):</p>
      ${bulletList(payload.alternatives)}
    </div>

    <h2>4. Рекомендации и назначения после вмешательства</h2>
    <div class="legal-body">
      <p class="legal-clause">Пациент обязуется строго соблюдать предписания лечащего врача, режим приема медикаментов, правила гигиены и явиться на контрольный осмотр:</p>
      ${bulletList(payload.aftercareRequirements)}
    </div>

    <h2>5. Сведения о доверенных лицах (ст. 13 Федерального закона № 323-ФЗ)</h2>
    <div class="legal-body">
      <p class="legal-clause">В соответствии с частью 3 статьи 13 Федерального закона от 21.11.2011 № 323-ФЗ «Об основах охраны здоровья граждан в Российской Федерации» Пациент определяет следующих лиц, которым может быть передана информация о состоянии здоровья, результатах обследования и диагнозе:</p>
      <p class="legal-clause"><strong>Доверенные лица:</strong> ${trustedContacts}.</p>
    </div>

    <h2>6. Подтверждения и волеизъявление пациента</h2>
    ${checkList([
			"пациент получил исчерпывающие и понятные ответы на все интересующие вопросы до начала медицинского вмешательства",
			"пациент проинформирован о целях, методах оказания медицинской помощи, связанном с ними риске, возможных вариантах медицинского вмешательства, о его последствиях, а также о предполагаемых результатах",
			"пациент подтвердил предоставление полных сведений об аллергических реакциях, перенесенных и сопутствующих заболеваниях и принимаемых препаратах",
			"пациент знает о своем законном праве отказаться от медицинского вмешательства или потребовать его прекращения в любой момент до начала вмешательства (ч. 3 ст. 20 323-ФЗ)",
		])}
    ${signatureBlock("Пациент / Законный представитель", signatureParty("Врач, проводивший разъяснение", payload.doctorFullName?.trim() ? payload.doctorFullName : "________________________"))}`;
	}

	return `<h2>Информированное добровольное согласие на медицинское вмешательство</h2>
    <div class="notice">
      Информированное добровольное согласие оформляется до начала оказания медицинской помощи в соответствии со ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ и Приказом Минздрава России от 12.11.2021 № 1051н.
    </div>
    <h2>1. Медицинское вмешательство</h2>
    <table>
      ${row("Планируемое вмешательство", document.title)}
      ${row("Область/зубы", "________________________ (по клиническим показаниям)")}
      ${row("Анестезия", "________________________ (препарат и метод при наличии)")}
      ${row("Доверенные лица (ст. 13 323-ФЗ)", '________________________ (или "не разрешаю передавать третьим лицам")')}
    </table>
    <h2>2. Разъяснения пациенту</h2>
    ${bulletList([
			"цели, методы оказания медицинской помощи, связанный с ними риск, возможные варианты и последствия",
			"основные риски: болевой синдром, отек, гематома, кровотечение, аллергические реакции, необходимость дополнительных этапов",
			"альтернативные методы лечения и последствия отказа от медицинского вмешательства",
			"право задавать вопросы лечащему врачу и отозвать согласие до начала вмешательства",
			"обязанность предоставить полные данные об аллергиях, хронических болезнях, лекарствах и беременности",
		])}
    <h2>3. Подтверждения и подписи</h2>
    <p class="legal-clause">Пациент подтверждает, что получил исчерпывающие разъяснения от лечащего врача и дает добровольное согласие на проведение вмешательства.</p>
    ${signatureBlock("Пациент / Законный представитель", signatureParty("Лечащий врач", "________________________"))}`;
}

export function procedureSpecificConsentPacket(document: GeneratedDocument) {
	const payload = document.payload?.procedureSpecificConsent as
		| ProcedureSpecificConsentPayload
		| undefined;
	if (payload) {
		const procedureTypeLabels: Record<
			ProcedureSpecificConsentPayload["procedureType"],
			string
		> = {
			local_anesthesia: "местная анестезия",
			therapy_endo_restoration: "терапия, эндодонтия или реставрация",
			sedation: "седация (ЗАКС / внутривенная)",
			surgery_extraction: "хирургия или удаление зуба",
			implantation_bone_graft:
				"имплантация, костная пластика или синус-лифтинг",
			prosthetics: "ортопедия",
			orthodontics: "ортодонтия",
			hygiene_whitening: "профессиональная гигиена или отбеливание",
			periodontology: "пародонтология",
			other: "другая процедура",
			veneers: "виниры",
			implantation: "дентальная имплантация",
			sinus_lifting: "синус-лифтинг",
			fixed_prosthetics: "несъемное протезирование",
			removable_prosthetics: "съемное протезирование",
			deep_caries: "глубокий кариес",
			superficial_medium_caries: "поверхностный и средний кариес",
			pulpitis_endodontics: "пульпит и эндодонтия",
			professional_hygiene: "профессиональная гигиена",
			teeth_whitening: "отбеливание зубов",
			minor_general: "общее согласие для несовершеннолетних",
			xray_cbct: "рентгенологическое исследование и КЛКТ",
			photoprotocol: "фотопротокол",
			egisz_refusal: "отказ от передачи данных в ЕГИСЗ",
			medical_intervention_refusal: "отказ от медицинского вмешательства",
			warranty_policy: "гарантийные обязательства",
			warranty_passport: "гарантийный паспорт и условия",
			somatic_health_questionnaire: "анкета о соматическом здоровье и рисках",
			xray_dose_load_sheet: "лист учета дозовых нагрузок при рентгене",
		};
		return `<h2>Процедурное информированное добровольное согласие: ${escapeHtml(procedureTypeLabels[payload.procedureType])}</h2>
    <div class="notice">
      Специализированное приложение к информированному добровольному согласию по конкретному клиническому протоколу (ст. 20 Федерального закона № 323-ФЗ, Приказ Минздрава России № 1051н).
    </div>

    <h2>1. Сведения о процедуре и клиническом обосновании</h2>
    <table>
      ${row("Направление / блок", procedureTypeLabels[payload.procedureType])}
      ${row("Конкретная процедура / этап", payload.procedureName)}
      ${row("Область / анатомическая зона / зубы", payload.toothOrArea)}
      ${row("Диагноз и клинические показания", payload.diagnosisOrIndication)}
      ${row("Обезболивание / анестезия", present(payload.plannedAnesthesia) ?? "не применяется / по показаниям")}
      ${present(payload.materialsAndSystems) ? row("Материалы, системы и конструкции", payload.materialsAndSystems ?? "") : ""}
      ${row("Лечащий врач, проводивший разъяснение", payload.doctorFullName)}
      ${row("Дата и время подтверждения", payload.consentConfirmedAt)}
      ${row("Локальная форма клиники", payload.localClinicFormAttached ? "приложена к пакету документов" : "используется данный структурированный электронный протокол")}
    </table>

    <h2>2. Клиническая детализация по зубам и сегментам</h2>
    ${clinicalToothRowsTable(payload.clinicalToothRows)}

    <h2>3. Индивидуальные факторы риска пациента</h2>
    <div class="legal-body">
      <p class="legal-clause">Учтены следующие персональные факторы анамнеза и анатомические особенности:</p>
      ${bulletList(payload.patientSpecificRiskFactors)}
    </div>

    <h2>4. Процедурные риски и возможные осложнения</h2>
    <div class="legal-body">
      <p class="legal-clause">Пациенту подробно разъяснены специфические риски и возможные осложнения, свойственные данной процедуре:</p>
      ${bulletList(payload.procedureSpecificRisks)}
    </div>

    <h2>5. Альтернативные варианты и последствия отказа</h2>
    <div class="legal-body">
      <p class="legal-clause">Пациент ознакомлен с альтернативными методиками лечения и возможными негативными последствиями отказа от процедуры:</p>
      ${bulletList(payload.alternatives)}
    </div>

    <h2>6. Режим и ограничения после вмешательства</h2>
    <div class="legal-body">
      <p class="legal-clause">Пациент проинформирован о необходимых ограничениях, правилах ухода и признаках, требующих срочного обращения к врачу:</p>
      ${bulletList(payload.aftercareAndLimits)}
    </div>

    <h2>7. Подтверждения перед проведением процедуры</h2>
    ${checkList([
			"пациенту подробно разъяснена суть и этапы именно указанной процедуры, а не общий шаблон",
			"пациент предоставил достоверные данные об аллергических реакциях, сопутствующих заболеваниях, лекарствах и антикоагулянтах",
			"пациент получил исчерпывающие ответы на все вопросы от лечащего врача до начала процедуры",
			"альтернативные методы, риски осложнений и последствия отказа понятны пациенту",
			"пациент подтверждает свое добровольное согласие на проведение медицинского вмешательства",
		])}
    ${signatureBlock("Пациент / Законный представитель", signatureParty("Врач, проводивший разъяснение", payload.doctorFullName))}`;
	}

	return `<h2>Процедурное информированное согласие</h2>
    <div class="notice">
      Приложение к информированному добровольному согласию по конкретной процедуре (ст. 20 323-ФЗ, Приказ 1051н). Врач отмечает фактическую процедуру и клинические параметры.
    </div>
    <h2>1. Параметры процедуры</h2>
    <table>
      ${row("Процедура/этап", document.title)}
      ${row("Область/зубы", "заполнить врачом")}
      ${row("Анестезия", "нет / инфильтрационная / проводниковая / аппликационная / иное")}
      ${row("Материалы и конструкции", "композит / керамика / цирконий / имплант-система / брекеты / элайнеры / иное")}
    </table>
    <h2>2. Процедурные блоки и риски</h2>
    ${checkList([
			"анестезия: онемение, травма мягких тканей, аллергическая реакция, сердечно-сосудистые реакции",
			"терапия/эндодонтия: повторная боль, перелечивание каналов, перфорация, инструментальный риск, необходимость коронки",
			"хирургия/удаление: кровотечение, отек, альвеолит, повреждение соседних структур, швы, контроль",
			"имплантация/НКР/синус-лифтинг: КТ-планирование, костный объем, мембрана/костный материал, риск отторжения и повторного этапа",
			"ортопедия: препарирование, временная конструкция, примерки, цвет/форма, риск сколов и коррекций",
			"ортодонтия: сроки лечения, гигиена, риск кариеса/резорбции/рецессий, ретенция после лечения",
			"гигиена/отбеливание: чувствительность, раздражение десны, ограничения по питанию и домашнему уходу",
		])}
    <h2>3. Подтверждения</h2>
    ${checkList([
			"альтернативы лечения и последствия отказа проговорены с врачом",
			"сроки, этапы, стоимость и необходимость контрольных снимков понятны пациенту",
			"пациент сообщил обо всех аллергиях, препаратах и хронических заболеваниях",
		])}
    ${signatureBlock("Пациент / Законный представитель", "Лечащий врач")}`;
}

export function treatmentPlan(document: GeneratedDocument) {
	const payload = document.payload?.treatmentPlan as
		| TreatmentPlanPayload
		| undefined;
	if (payload) {
		const stageRows = payload.plannedStages
			.map(
				(stage) =>
					`<tr>${cell(stage.stageName)}${cell(stage.plannedServices)}${cell(stage.plannedTiming)}${cell(
						stage.clinicalNotes?.trim() || "по клинической ситуации",
					)}${cell(rub(stage.estimatedAmountRub ?? null))}</tr>`,
			)
			.join("");
		return `<h2>Клинический план лечения</h2>
    <div class="notice">
      План лечения фиксирует клиническую логику, этапы, альтернативы и ориентировочную стоимость. Перед вмешательством нужны информированное согласие и, при изменении объема, новое согласование.
    </div>
    <table>
      ${row("Повод обращения", payload.clinicalReason)}
      ${row("Диагноз / клиническое основание", payload.diagnosisSummary)}
      ${row("Зубы / область", payload.teethOrArea)}
      ${row("Ориентировочная стоимость", rub(payload.estimatedTotalRub))}
      ${row("Прогноз и ограничения", payload.prognosisAndLimits ?? "")}
      ${row("Контрольный план", payload.controlPlan ?? "")}
      ${row("Врач", payload.doctorFullName ?? "")}
      ${row("Дата подготовки плана", payload.plannedAt)}
    </table>
    <h2>Клиническая детализация по зубам и сегментам</h2>
    ${renderGraphicalDentalFormulaHtml({
			clinicalToothRows: payload.clinicalToothRows,
			title: "Графическая зубная формула (FDI 11–48 / 51–85)",
		})}
    ${clinicalToothRowsTable(payload.clinicalToothRows)}
    <h2>Цели лечения</h2>
    ${bulletList(payload.treatmentGoals)}
    <h2>Планируемые этапы</h2>
    <table>
      <tr><th>Этап</th><th>Услуги и объем</th><th>Срок</th><th>Клинические заметки</th><th>Оценка</th></tr>
      ${stageRows}
    </table>
    <h2>Альтернативы</h2>
    ${bulletList(payload.alternatives)}
    <h2>Риски и ограничения</h2>
    ${bulletList(payload.risksAndLimitations)}
    ${checkList([
			"пациент получил ответы на вопросы по плану лечения",
			"план лечения не заменяет отдельное информированное согласие перед вмешательством",
			"при изменении диагноза, объема, материалов, сроков или стоимости план требует нового согласования",
		])}
    ${signatureBlock("Пациент ознакомлен", signatureParty("Врач", payload.doctorFullName))}`;
	}

	return `<h2>Клинический план</h2>
    <table>
      ${row("Повод обращения", "заполнить из приема/диктовки")}
      ${row("Диагноз/предварительное заключение", "заполняет врач после осмотра и диагностики")}
      ${row("План лечения", document.title)}
      ${row("Ориентировочная стоимость", rub(document.totalAmountRub))}
    </table>
    <h2>Этапы</h2>
    ${checkList([
			"диагностика, фото-протокол, снимки при показаниях",
			"санация/терапия/гигиена перед ортопедией или хирургией",
			"основное лечение по специальности",
			"контрольный осмотр и рекомендации",
			"альтернативный план и отказанные варианты зафиксированы",
		])}
    <p class="small">План лечения не является подписанной медицинской записью до проверки врачом.</p>
    ${signatureBlock("Пациент ознакомлен", "Врач")}`;
}

export function treatmentPlanAcceptanceVariantLabel(
	value: TreatmentPlanAcceptancePayload["selectedVariant"],
): string {
	const labels: Record<
		TreatmentPlanAcceptancePayload["selectedVariant"],
		string
	> = {
		urgent: "срочный",
		standard: "стандартный",
		optimal: "оптимальный",
		staged: "этапный",
		maintenance: "поддерживающий",
		other: "индивидуальный",
	};
	return labels[value] ?? value;
}

export function treatmentPlanAcceptance(document: GeneratedDocument) {
	const payload = document.payload?.treatmentPlanAcceptance as
		| TreatmentPlanAcceptancePayload
		| undefined;
	if (!payload) {
		return fallbackTreatmentPlanAcceptance(document);
	}

	const stageRows = payload.acceptedStages
		.map(
			(stage) =>
				`<tr>${cell(stage.stageName)}${cell(stage.plannedServices)}${cell(stage.plannedTiming)}${cell(rub(stage.estimatedAmountRub ?? null))}</tr>`,
		)
		.join("");

	return `<h2>Согласование плана лечения</h2>
    <div class="notice">
      Документ фиксирует выбранный пациентом вариант лечения, сумму и границы согласия. Изменение диагноза, объема, материалов, сроков или стоимости оформляется новым согласованием или дополнительным соглашением.
    </div>
    <table>
      ${row("Выбранный вариант", treatmentPlanAcceptanceVariantLabel(payload.selectedVariant))}
      ${row("Клиническая цель", payload.clinicalGoal)}
      ${row("Диагноз / клиническое основание", payload.diagnosisSummary)}
      ${row("Зубы / область", payload.teethOrArea)}
      ${row("Ориентировочная стоимость", rub(payload.estimatedTotalRub))}
      ${row("Смета действует до", payload.estimateValidUntil)}
      ${row("Условия оплаты", payload.paymentTerms)}
      ${row("Гарантия и контроль", payload.warrantyAndControlTerms)}
      ${row("Врач", payload.doctorFullName)}
      ${row("Дата и время согласования", payload.acceptedAt)}
    </table>
    <h2>Клиническая детализация по зубам и сегментам</h2>
    ${clinicalToothRowsTable(payload.clinicalToothRows)}
    <h2>Согласованные этапы</h2>
    <table>
      <tr><th>Этап</th><th>Услуги и объем</th><th>Срок</th><th>Оценка</th></tr>
      ${stageRows}
    </table>
    <h2>Отклоненные или отложенные альтернативы</h2>
    ${bulletList(payload.rejectedAlternatives)}
    <h2>Риски и ограничения</h2>
    ${bulletList(payload.risksAndLimitations)}
    ${checkList([
			"пациент получил ответы на вопросы до согласования плана",
			"пациенту объяснены альтернативы, включая наблюдение, второй взгляд, перенос лечения и отказ",
			"пациент понимает, что стоимость и сроки могут измениться при новых клинических данных, снимках, осложнениях или выборе других материалов",
			"существенное изменение объема лечения требует нового согласования",
		])}
    ${signatureBlock("Пациент согласовал план", "Врач")}`;
}

export function fallbackTreatmentPlanAcceptance(document: GeneratedDocument) {
	return `<h2>Согласование плана лечения</h2>
    <table>
      ${row("Выбранный вариант", "срочный / стандартный / оптимальный / этапный / поддерживающий")}
      ${row("Клиническая цель", "заполнить врачом: санация, восстановление функции, эстетика, подготовка к протезированию/имплантации")}
      ${row("Зубы/область", "заполнить по FDI или сегментам")}
      ${row("Ориентировочная стоимость", rub(document.totalAmountRub))}
      ${row("Срок действия сметы", "указать локальным правилом клиники")}
    </table>
    <h2>Пациенту объяснено</h2>
    ${checkList([
			"диагноз, цель лечения, этапы, сроки и ожидаемый результат",
			"альтернативные варианты: наблюдение, терапия, хирургия, ортопедия, ортодонтия, имплантация или отказ",
			"что стоимость меняется при новых клинических данных, КТ/снимках, осложнениях или изменении выбранных материалов",
			"какие варианты пациент отклонил и чем это может повлиять на прогноз",
			"гарантийные условия, ограничения и необходимость контрольных посещений",
		])}
    <h2>Отклоненные или отложенные варианты</h2>
    <p>______________________________________________________________________________</p>
    <p>______________________________________________________________________________</p>
    ${signatureBlock("Пациент согласовал план", "Врач")}`;
}

export function anesthesiaConsentLog(document: GeneratedDocument) {
	const payload = document.payload?.anesthesiaConsentLog;
	if (payload) {
		const doseRows = payload.doseRows
			.map(
				(dose) =>
					`<tr>${cell(dose.time)}${cell(dose.medication)}${cell(dose.doseMl)}${cell(dose.zone)}${cell(dose.reaction ?? "без особенностей")}</tr>`,
			)
			.join("");
		return `<h2>Согласие и журнал местной анестезии</h2>
      <div class="notice">
        Структурированные данные заполнены до выдачи. Седация и наркоз требуют отдельного утвержденного пакета клиники.
      </div>
      <table>
        ${row("Планируемый метод", payload.method)}
        ${row("Анестетик", payload.anesthetic)}
        ${row("Вазоконстриктор", payload.vasoconstrictor ?? "не указан")}
        ${row("Зона", payload.plannedZone)}
        ${row("Аллергии и реакции", payload.allergyStatus)}
        ${row("Ограничения и риски", payload.restrictionNotes ?? "не отмечены")}
        ${row("Риски анестезии разъяснены", payload.patientAnesthesiaRisksExplained ? "да" : "нет")}
        ${row("Аллергии и ограничения проверены", payload.allergyAndRestrictionStatusChecked ? "да" : "нет")}
        ${row("Согласие пациента на анестезию", payload.patientConfirmedAnesthesiaConsent ? "да" : "нет")}
      </table>
      <h2>Журнал введения</h2>
      <table>
        <tr><th>Время</th><th>Препарат</th><th>Доза</th><th>Зона</th><th>Реакция</th></tr>
        ${doseRows}
      </table>
      ${checkList([
				"пациент предупрежден об онемении, риске травмы мягких тканей и временном ограничении еды/горячего",
				"перед введением уточнены аллергии, лекарства, хронические заболевания, беременность/лактация и антикоагулянты",
				"при осложнении симптомы, действия врача и дальнейшие рекомендации фиксируются в записи приема",
			])}
      ${signatureBlock("Пациент/законный представитель", "Врач")}`;
	}
	return `<h2>Согласие на местную анестезию</h2>
    <div class="notice">
      Заполняется перед введением анестетика и дополняется фактическим журналом введения после процедуры.
      При седации/наркозе нужен отдельный утвержденный анестезиологический пакет клиники.
    </div>
    <table>
      ${row("Планируемый метод", "аппликационная / инфильтрационная / проводниковая / интралигаментарная / интраоссальная")}
      ${row("Анестетик", "артикаин / мепивакаин / лидокаин / другое: ____________________")}
      ${row("Вазоконстриктор", "нет / 1:100000 / 1:200000 / другое")}
      ${row("Аллергии и реакции", "нет / есть: ____________________")}
      ${row("Ограничения", "беременность, лактация, антикоагулянты, сердечно-сосудистые риски, сопутствующие препараты")}
    </table>
    <h2>Журнал введения</h2>
    <table>
      <tr><th>Время</th><th>Препарат</th><th>Доза</th><th>Зона</th><th>Реакция</th></tr>
      <tr><td>____:____</td><td>____________________</td><td>____ мл</td><td>____________________</td><td>без особенностей / указать</td></tr>
    </table>
    ${checkList([
			"пациент предупрежден об онемении, риске травмы мягких тканей и временном ограничении еды/горячего",
			"перед введением уточнены аллергии, лекарства и хронические заболевания",
			"при осложнении указаны симптомы, действия врача и дальнейшие рекомендации",
		])}
    ${signatureBlock("Пациент/представитель", "Врач")}`;
}

export function prescriptionMedicationOrder(document: GeneratedDocument) {
	const payload = document.payload?.prescriptionMedicationOrder;
	if (payload) {
		const medicationRows = payload.medications
			.map(
				(medication) =>
					`<tr>${cell(medication.medication)}${cell(medication.dosage)}${cell(medication.instructions)}${cell(medication.duration)}</tr>`,
			)
			.join("");
		return `<h2>Назначение лекарственных препаратов</h2>
      <div class="notice">
        Это структурированное назначение клиники. Если нужен рецептурный бланк или электронный рецепт, клиника оформляет его по утвержденному процессу.
      </div>
      <h2>Клиническая привязка назначения</h2>
      ${clinicalToothRowsTable(payload.clinicalToothRows)}
      <table>
        <tr><th>Препарат</th><th>Дозировка</th><th>Как принимать</th><th>Срок</th></tr>
        ${medicationRows}
      </table>
      <h2>Контроль безопасности</h2>
      ${checkList([...payload.safetyNotes, `Срочно связаться с клиникой: ${payload.urgentContactReason}`])}
      ${signatureBlock("Пациент получил назначения", "Врач")}`;
	}
	return `<h2>Назначение лекарственных препаратов</h2>
    <div class="notice">
      Черновик назначения должен быть проверен врачом. Если требуется рецептурный бланк или электронный рецепт,
      клиника оформляет его по своему утвержденному процессу.
    </div>
    <table>
      <tr><th>Препарат</th><th>Дозировка</th><th>Как принимать</th><th>Срок</th></tr>
      <tr><td>____________________</td><td>____________________</td><td>____________________</td><td>__________</td></tr>
      <tr><td>____________________</td><td>____________________</td><td>____________________</td><td>__________</td></tr>
    </table>
    <h2>Контроль безопасности</h2>
    ${checkList([
			"аллергии, беременность/лактация, антикоагулянты и постоянные препараты сверены",
			"пациенту объяснено, что нельзя менять дозировку без врача",
			"указан повод срочно связаться с клиникой: отек, сыпь, одышка, кровотечение, нарастающая боль, температура",
			"назначения согласованы с проведенным вмешательством и медицинской записью",
		])}
    ${signatureBlock("Пациент получил назначения", "Врач")}`;
}

export function personalDataConsent(document: GeneratedDocument, patient: Patient) {
	const payload = document.payload?.personalDataProcessingConsent as
		| PersonalDataProcessingConsentPayload
		| undefined;

	if (payload) {
		const representativeIdentity = compactParts([
			legalRepresentativeName(patient),
			legalRepresentativeDocument(patient),
			legalRepresentativeRelationship(patient),
		]);

		return `<h2>Согласие на обработку персональных данных</h2>
      <p>Пациент дает добровольное, конкретное и информированное согласие оператору на обработку персональных данных, включая сведения о здоровье, в пределах целей и правил, указанных ниже.</p>
      <table>
        ${row("Оператор персональных данных", payload.operatorLegalName)}
        ${row("ИНН оператора", payload.operatorInn)}
        ${row("Адрес оператора", payload.operatorAddress)}
        ${row("Субъект персональных данных", patient.fullName)}
        ${patient.birthDate ? row("Дата рождения пациента", patient.birthDate) : ""}
        ${patientIdentityDocument(patient) ? row("Документ пациента", patientIdentityDocument(patient) ?? "") : ""}
        ${patientTaxpayerInn(patient) ? row("ИНН пациента", patientTaxpayerInn(patient) ?? "") : ""}
        ${patientRegistrationAddress(patient) ? row("Адрес регистрации", patientRegistrationAddress(patient) ?? "") : ""}
        ${patientResidentialAddress(patient) ? row("Адрес проживания", patientResidentialAddress(patient) ?? "") : ""}
        ${patientInsurancePolicyNumber(patient) ? row("Полис/ДМС", patientInsurancePolicyNumber(patient) ?? "") : ""}
        ${patientSnils(patient) ? row("СНИЛС", patientSnils(patient) ?? "") : ""}
        ${representativeIdentity ? row("Законный представитель/получатель", representativeIdentity) : ""}
        ${patientDataProcessingBasisNote(patient) ? row("Основание/комментарий клиники", patientDataProcessingBasisNote(patient) ?? "") : ""}
        ${row("Трансграничная передача", payload.crossBorderTransferAllowed ? "разрешена в пределах указанных целей и получателей" : "не разрешена")}
        ${row("Автоматизированные решения", payload.automatedDecisionMakingAllowed ? "разрешены только без юридически значимых решений без участия сотрудника" : "не разрешены")}
        ${row("Срок хранения", payload.retentionPeriod)}
        ${row("Порядок отзыва согласия", payload.revocationChannel)}
        ${row("Дата и время согласия", payload.consentGivenAt)}
      </table>
      <h2>Цели обработки</h2>
      ${bulletList(payload.processingPurposes)}
      <h2>Категории персональных данных</h2>
      ${bulletList(payload.personalDataCategories)}
      <h2>Действия с данными</h2>
      ${bulletList(payload.processingActions)}
      <h2>Передача третьим лицам</h2>
      <p>${escapeHtml(payload.thirdPartyTransferRules)}</p>
      ${checkList([
				"пациент подтвердил добровольное согласие без принуждения",
				"пациент отдельно уведомлен об обработке медицинских данных и сведений о здоровье",
				"оператор обязан прекратить новые необязательные обработки после отзыва согласия, если нет законного основания продолжать хранение",
				"маркетинг, публикации и передача вне медицинского процесса требуют отдельного основания или отдельной отметки пациента",
			])}
      ${signatureBlock("Пациент/законный представитель", "Оператор/представитель клиники")}`;
	}

	return `<h2>Согласие на обработку персональных данных</h2>
    <p>Пациент дает согласие на обработку персональных данных и медицинской информации в целях оказания медицинской помощи, ведения медицинской документации, расчетов, связи и выполнения требований законодательства.</p>
    <table>
      ${row("Субъект персональных данных", patient.fullName)}
      ${patientIdentityDocument(patient) ? row("Документ пациента", patientIdentityDocument(patient) ?? "") : ""}
      ${patientTaxpayerInn(patient) ? row("ИНН пациента", patientTaxpayerInn(patient) ?? "") : ""}
      ${patientRegistrationAddress(patient) ? row("Адрес регистрации", patientRegistrationAddress(patient) ?? "") : ""}
      ${patientResidentialAddress(patient) ? row("Адрес проживания", patientResidentialAddress(patient) ?? "") : ""}
      ${patientInsurancePolicyNumber(patient) ? row("Полис/ДМС", patientInsurancePolicyNumber(patient) ?? "") : ""}
      ${patientSnils(patient) ? row("СНИЛС", patientSnils(patient) ?? "") : ""}
      ${row("Законный представитель/получатель", representativeIdentityLine(patient))}
      ${patientDataProcessingBasisNote(patient) ? row("Основание/комментарий клиники", patientDataProcessingBasisNote(patient) ?? "") : ""}
    </table>
    <h2>Категории данных</h2>
    ${checkList([
			"ФИО, дата рождения, контакты, документы, адрес",
			"медицинские сведения, диагнозы, снимки, планы лечения, назначения",
			"платежи, договоры, акты, налоговые документы",
			"история обращений, коммуникации и записи согласий",
		])}
    <h2>Ограничения</h2>
    <p>Перед использованием шаблона клиника должна указать оператора ПДн, цели, сроки хранения, способы обработки, передачу третьим лицам и порядок отзыва согласия.</p>
    ${signatureBlock("Пациент/законный представитель", "Оператор/представитель клиники")}`;
}

export function minorLegalRepresentativeConsent(
	document: GeneratedDocument,
	patient: Patient,
) {
	const payload = document.payload?.minorLegalRepresentativeConsent as
		| MinorLegalRepresentativeConsentPayload
		| undefined;
	if (payload) {
		return `<h2>Согласие законного представителя несовершеннолетнего</h2>
      <div class="notice">
        Документ фиксирует согласие законного представителя на конкретное стоматологическое вмешательство.
        Основание: информирование о целях, методах, рисках, альтернативах и предполагаемом результате медицинской помощи.
      </div>
      <table>
        ${row("Несовершеннолетний пациент", `${payload.minorFullName}, дата рождения: ${payload.minorBirthDate}`)}
        ${row("Законный представитель", payload.representativeFullName)}
        ${row("Родство/статус", payload.representativeRelationship)}
        ${row("Документ представителя", payload.representativeIdentityDocument)}
        ${row("Основание полномочий", payload.authorityDocument)}
        ${row("Контакт представителя", payload.representativePhone?.trim() || "контакт хранится в карте пациента")}
        ${row("Вмешательство", payload.interventionScope)}
        ${row("Диагноз/показание", payload.diagnosisOrIndication)}
        ${row("Врач", payload.doctorFullName)}
        ${row("Дата и время согласия", payload.signedAt)}
      </table>
      <h2>Разъясненные риски</h2>
      ${bulletList(payload.explainedRisks)}
      <h2>Альтернативы</h2>
      ${bulletList(payload.alternativesExplained)}
      ${checkList([
				"личность законного представителя проверена",
				"полномочия представителя подтверждены документом",
				"представитель получил понятное объяснение плана, рисков, альтернатив и ожидаемого результата",
				"согласие будет храниться в медицинской документации пациента",
				"ребенку дано объяснение по возрасту и состоянию",
			])}
      ${signatureBlock("Законный представитель", signatureParty("Администратор/врач", payload.doctorFullName))}`;
	}
	return `<h2>Согласие законного представителя</h2>
    <table>
      ${row("Пациент", patient.fullName)}
      ${row("Законный представитель", representativeDisplayLine(patient))}
      ${row("Основание полномочий", representativeAuthorityLine(patient))}
      ${row("Контакт представителя", representativeContactLine(patient))}
      ${row("Кому выдавать документы", documentRecipientLine(patient))}
    </table>
    ${checkList([
			"личность представителя проверена",
			"полномочия представителя подтверждены",
			"анамнез ребенка заполнен отдельно: аллергии, лекарства, хронические заболевания, прививки/инфекции по необходимости",
			"представитель получил объяснение плана лечения, рисков, альтернатив и стоимости",
			"при необходимости ребенок получил понятное возрасту объяснение процедуры",
		])}
    ${signatureBlock("Законный представитель", "Администратор/врач")}`;
}

export function consentFlag(value: boolean) {
	return value ? "разрешено" : "не разрешено";
}

export function photoVideoConsent(document: GeneratedDocument) {
	const payload = document.payload?.photoVideoConsent;
	if (payload) {
		const materialLabels: Record<string, string> = {
			intraoral_photo: "внутриротовые фото",
			face_photo: "фото лица",
			video: "видео",
			xray: "рентген-снимки",
			cbct: "КЛКТ/КТ",
			scan: "цифровые сканы",
			other: "иные материалы",
		};
		return `<h2>Согласие на фото-, видео- и рентген-материалы</h2>
      <div class="notice">
        Согласие разделяет медицинское использование, передачу подрядчикам, обучение и публикацию. Публикация узнаваемых материалов не считается разрешенной по умолчанию.
      </div>
      <table>
        ${row("Материалы", payload.materials.map((material) => materialLabels[material] ?? material).join(", "))}
        ${row("Медицинская карта и контроль лечения", payload.clinicalRecordUse ? "да, обязательно для медицинской документации" : "нет")}
        ${row("Передача зуботехнической лаборатории", consentFlag(payload.labTransferAllowed))}
        ${row("Консультация коллег / консилиум", consentFlag(payload.colleagueConsultationAllowed))}
        ${row("Обучение и профессиональные разборы", consentFlag(payload.educationUseAllowed))}
        ${row("Маркетинг клиники", consentFlag(payload.marketingUseAllowed))}
        ${row("Узнаваемая публикация лица/улыбки", consentFlag(payload.recognizablePublicationAllowed))}
        ${row("Обезличивание", payload.anonymizationRequired ? "обязательно; ФИО, телефон и лишние признаки не публиковать" : "не подтверждено")}
        ${row("Порядок отзыва", payload.revocationChannel)}
        ${present(payload.scopeNotes) ? row("Ограничения пациента", present(payload.scopeNotes) ?? "") : ""}
      </table>
      ${checkList([
				"использовать материалы только в отмеченных целях",
				"для маркетинга и узнаваемой публикации нужна отдельная явная отметка пациента",
				"после отзыва прекратить новые публикации и зафиксировать дату отзыва в карте/CRM",
				"рентген, КТ и сканы остаются частью медицинской документации и не удаляются из карты без законного основания",
			])}
      ${signatureBlock("Пациент/законный представитель", "Представитель клиники")}`;
	}

	return `<h2>Согласие на фото-, видео- и рентген-материалы</h2>
    <p>Стоматологические фото, видео, сканы и рентген-материалы используются для диагностики, планирования, контроля качества и ведения медицинской документации.</p>
    <table>
      ${row("Разрешенное использование", "медицинская карта / консультация коллег / лаборатория / обучение / маркетинг")}
      ${row("Маркетинг", "только при отдельной явной отметке пациента")}
      ${row("Обезличивание", "лицо, ФИО и контакты не публиковать без отдельного разрешения")}
      ${row("Отзыв согласия", "пациент может отозвать согласие в порядке, указанном клиникой")}
    </table>
    ${checkList([
			"отдельно отметить, разрешено ли использовать материалы вне медицинской карты",
			"проверить, что передача лаборатории/консилиуму соответствует согласию на ПДн",
			"не публиковать до/после с узнаваемым лицом без отдельной письменной отметки",
			"рентген/КТ остаются частью медицинской документации и не должны удаляться из карты без законного основания",
		])}
    ${signatureBlock("Пациент/законный представитель", "Представитель клиники")}`;
}

export function medicalInterventionRefusal(document: GeneratedDocument) {
	const payload = document.payload?.medicalInterventionRefusal as
		| MedicalInterventionRefusalPayload
		| undefined;
	if (!payload) {
		return `<h2>Отказ от медицинского вмешательства</h2>
      <p>Пациенту разъяснены характер предложенного вмешательства, возможные последствия отказа, альтернативы и право обратиться за медицинской помощью повторно.</p>
      <table>
        ${row("Предложенное вмешательство", "заполнить врачом")}
        ${row("Причина отказа со слов пациента", "заполнить при наличии")}
        ${row("Возможные последствия", "заполнить врачом: прогрессирование заболевания, боль, инфекция, потеря зуба, осложнения")}
      </table>
      <p>Пациент подтверждает, что последствия отказа понятны.</p>
      ${signatureBlock("Пациент/законный представитель", "Врач")}`;
	}

	return `<h2>Отказ от медицинского вмешательства</h2>
    <p>Пациенту разъяснены характер предложенного вмешательства, медицинские показания, возможные последствия отказа, альтернативы и право обратиться за медицинской помощью повторно.</p>
    <table>
      ${row("Предложенное вмешательство", payload.refusedIntervention)}
      ${row("Клиническое показание", payload.clinicalIndication)}
      ${row("Причина отказа со слов пациента", present(payload.patientReason) ?? "пациент причину не указал")}
      ${row("Врач, проводивший разъяснение", payload.doctorFullName)}
      ${row("Дата и время подтверждения отказа", payload.refusalConfirmedAt)}
    </table>
    <h2>Разъясненные последствия отказа</h2>
    ${bulletList(payload.explainedRisks)}
    <h2>Предложенные альтернативы</h2>
    ${bulletList(payload.alternativesOffered)}
    <h2>Когда срочно обратиться за помощью</h2>
    ${bulletList(payload.urgentWarningSigns)}
    ${checkList([
			"пациент подтвердил, что понял возможные последствия отказа",
			"пациенту предложено получить второе мнение или повторную консультацию",
			"пациенту объяснено, что при ухудшении состояния можно обратиться за экстренной помощью",
		])}
    ${signatureBlock("Пациент/законный представитель", "Врач")}`;
}
