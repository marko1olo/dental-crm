import { escapeXml } from "../../cda/c14n.js";
import { formatKopToRub, reqVal, computeCommerceMlSha256 } from "./xmlUtils.js";
import {
	OneCCommerceMlPackage, OneCRetailSaleItem, OneCPaymentBreakdownItem,
	OneCMedicalActItem, OneCMedicalActDocument, OneCClinicProfile, OneCChartOfAccounts,
	OneCMaterialWriteoffItem, OneCPayrollEmployeeItem,
	COMMERCEML_XMLNS, COMMERCEML_VERSION_209, DEFAULT_OKEI_PIECE_CODE, DEFAULT_OKEI_PIECE_NAME,
	TAX_EXEMPTION_ARTICLE_149_RU, DEFAULT_1C_CHART_OF_ACCOUNTS, ENTERPRISEDATA_XMLNS
} from "./types.js";

function renderRetailSalesItemsCommerceMl(items: readonly OneCRetailSaleItem[]): string {
	return items.map((it) => {
		const unitCode = it.unitCode || DEFAULT_OKEI_PIECE_CODE;
		const unitName = it.unitName || DEFAULT_OKEI_PIECE_NAME;
		const fullName = `${it.name}${it.toothNumber ? ` (Зуб ${it.toothNumber})` : ""}`;
		const discountPercent = it.priceKopecks > 0 ? Math.round((it.discountKopecks / it.priceKopecks) * 100) : 0;
		return `\t\t\t\t<Товар>
\t\t\t\t\t<Ид>${escapeXml(it.id)}</Ид>
\t\t\t\t\t<Артикул>${escapeXml(it.code804n || it.id)}</Артикул>
\t\t\t\t\t<Код804н>${escapeXml(it.code804n || "")}</Код804н>
\t\t\t\t\t<Наименование>${escapeXml(fullName)}</Наименование>
\t\t\t\t\t<БазоваяЕдиница Код="${escapeXml(unitCode)}" НаименованиеПолное="${escapeXml(unitName)}">${escapeXml(unitName)}</БазоваяЕдиница>
\t\t\t\t\t<СтавкаНДС>${escapeXml(it.vatRate || "Без НДС")}</СтавкаНДС>
\t\t\t\t\t<ЦенаЗаЕдиницу>${formatKopToRub(it.priceKopecks)}</ЦенаЗаЕдиницу>
\t\t\t\t\t<Количество>${it.quantity}</Количество>
\t\t\t\t\t<Сумма>${formatKopToRub(it.totalKopecks)}</Сумма>
\t\t\t\t\t<СуммаНДС>${formatKopToRub(it.vatAmountKopecks ?? 0)}</СуммаНДС>
\t\t\t\t\t<Скидки>
\t\t\t\t\t\t<Скидка>
\t\t\t\t\t\t\t<Процент>${discountPercent}</Процент>
\t\t\t\t\t\t\t<УчтеноВСумме>true</УчтеноВСумме>
\t\t\t\t\t\t</Скидка>
\t\t\t\t\t</Скидки>
\t\t\t\t\t<НоменклатурнаяГруппа>${escapeXml(it.nomenclatureGroup || "Стоматологические услуги")}</НоменклатурнаяГруппа>
\t\t\t\t\t<ВрачФИО>${escapeXml(it.doctorName || "")}</ВрачФИО>
\t\t\t\t</Товар>`;
	}).join("\n");
}

function renderRetailSalesPaymentsCommerceMl(payments: readonly OneCPaymentBreakdownItem[]): string {
	return payments.map((p) => {
		const acq = p.acquiringBankName ? `\n\t\t\t\t\t<Эквайер>${escapeXml(p.acquiringBankName)}</Эквайер>` : "";
		const term = p.acquiringTerminalId ? `\n\t\t\t\t\t<Терминал>${escapeXml(p.acquiringTerminalId)}</Терминал>` : "";
		const fisc = p.fiscalReceiptNumber ? `\n\t\t\t\t\t<Чек54ФЗ>${escapeXml(p.fiscalReceiptNumber)}</Чек54ФЗ>` : "";
		return `\t\t\t\t<Оплата>
\t\t\t\t\t<Ид>${escapeXml(p.id)}</Ид>
\t\t\t\t\t<ВидОплаты>${escapeXml(p.tenderTitleRu)}</ВидОплаты>
\t\t\t\t\t<ТипОплаты>${escapeXml(p.tenderType)}</ТипОплаты>
\t\t\t\t\t<Сумма>${formatKopToRub(p.amountKopecks)}</Сумма>
\t\t\t\t\t<СчетУчета>${escapeXml(p.accountCode)}</СчетУчета>${acq}${term}${fisc}
\t\t\t\t</Оплата>`;
	}).join("\n");
}

function renderMedicalActItemsCommerceMl(items: readonly OneCMedicalActItem[]): string {
	return items.map((it) => {
		const unitCode = it.unitCode || DEFAULT_OKEI_PIECE_CODE;
		const unitName = it.unitName || DEFAULT_OKEI_PIECE_NAME;
		const toothSuffix = it.toothNumber ? ` (Зуб ${it.toothNumber})` : "";
		const toothTag = it.toothNumber ? `\n\t\t\t\t\t<Зуб>${it.toothNumber}</Зуб>\n\t\t\t\t\t<НомерЗуба>${it.toothNumber}</НомерЗуба>` : "";
		return `\t\t\t\t<Товар>
\t\t\t\t\t<Ид>${escapeXml(it.id)}</Ид>
\t\t\t\t\t<Артикул>${escapeXml(it.code804n || it.id)}</Артикул>
\t\t\t\t\t<Код804н>${escapeXml(it.code804n || "")}</Код804н>${toothTag}
\t\t\t\t\t<Наименование>${escapeXml(`${it.name}${toothSuffix}`)}</Наименование>
\t\t\t\t\t<БазоваяЕдиница Код="${escapeXml(unitCode)}" НаименованиеПолное="${escapeXml(unitName)}">${escapeXml(unitName)}</БазоваяЕдиница>
\t\t\t\t\t<СтавкаНДС>${escapeXml(it.vatRate || "Без НДС")}</СтавкаНДС>
\t\t\t\t\t<ЦенаЗаЕдиницу>${formatKopToRub(it.priceKopecks)}</ЦенаЗаЕдиницу>
\t\t\t\t\t<Количество>${it.quantity}</Количество>
\t\t\t\t\t<Сумма>${formatKopToRub(it.totalKopecks)}</Сумма>
\t\t\t\t\t<СуммаНДС>${formatKopToRub(it.vatAmountKopecks ?? 0)}</СуммаНДС>
\t\t\t\t\t<ВрачФИО>${escapeXml(it.attendingDoctorName || "")}</ВрачФИО>
\t\t\t\t</Товар>`;
	}).join("\n");
}

function renderMedicalActDocumentCommerceMl(act: OneCMedicalActDocument, clinic: OneCClinicProfile, chartOfAccounts: OneCChartOfAccounts): string {
	const actSha = act.sha256Hash || computeCommerceMlSha256(act);
	const contractReq = act.contractNumber ? `\n${reqVal("Договор", `Договор № ${escapeXml(act.contractNumber)}${act.contractDateIso ? ` от ${escapeXml(act.contractDateIso)}` : ""}`)}` : "";
	const docReq = act.attendingDoctorName ? `\n${reqVal("ВрачФИО", escapeXml(act.attendingDoctorName))}` : "";
	const p = act.patient;
	const innTag = p.inn ? `\t\t\t\t<ИНН>${escapeXml(p.inn)}</ИНН>\n` : "";
	const addrTag = p.address ? `\t\t\t\t<Адрес>${escapeXml(p.address)}</Адрес>\n` : "";
	const phoneTag = p.phone ? `\t\t\t\t<Контакты><Контакт><Тип>ТелефонРабочий</Тип><Значение>${escapeXml(p.phone)}</Значение></Контакт></Контакты>\n` : "";

	return `\t<!-- Акт выполненных медицинских услуг: № ${escapeXml(act.actNumber)} -->
\t<Документ>
\t\t<Ид>${escapeXml(act.id)}</Ид>
\t\t<Номер>${escapeXml(act.actNumber)}</Номер>
\t\t<Дата>${escapeXml(act.documentDateIso)}</Дата>
\t\t<Время>${escapeXml(act.documentTime)}</Время>
\t\t<ХозяйственнаяОперация>Акт об оказании медицинских услуг</ХозяйственнаяОперация>
\t\t<Роль>Продавец</Роль>
\t\t<Валюта>руб</Валюта>
\t\t<Курс>1</Курс>
\t\t<Сумма>${formatKopToRub(act.totalKopecks)}</Сумма>
\t\t<ХэшТранзакцииSHA256>${actSha}</ХэшТранзакцииSHA256>
\t\t<Контрагенты>
\t\t\t<Контрагент>
\t\t\t\t<Ид>${escapeXml(p.id)}</Ид>
\t\t\t\t<Наименование>${escapeXml(p.name)}</Наименование>
\t\t\t\t<ПолноеНаименование>${escapeXml(p.fullName || p.name)}</ПолноеНаименование>
\t\t\t\t<Роль>Покупатель</Роль>
${innTag}${addrTag}${phoneTag}\t\t\t</Контрагент>
\t\t</Контрагенты>
\t\t<Товары>
${renderMedicalActItemsCommerceMl(act.items)}
\t\t</Товары>
\t\t<ЗначенияРеквизитов>
${reqVal("ОсвобождениеОтНДС", TAX_EXEMPTION_ARTICLE_149_RU)}
${reqVal("СчетРасчетовСПокупателем", escapeXml(chartOfAccounts.accountBuyersSettlement))}
${reqVal("СчетДоходов", escapeXml(chartOfAccounts.accountSalesRevenue))}${contractReq}${docReq}
${reqVal("Проведен", "true")}
\t\t</ЗначенияРеквизитов>
\t</Документ>`;
}

function renderMaterialWriteoffItemsCommerceMl(items: readonly OneCMaterialWriteoffItem[]): string {
	return items.map((it) => {
		const batchInfo = it.batchNumber ? `\n\t\t\t\t\t<Партия>${escapeXml(it.batchNumber)}</Партия>` : "";
		const expInfo = it.expirationDateIso ? `\n\t\t\t\t\t<СрокГодности>${escapeXml(it.expirationDateIso)}</СрокГодности>` : "";
		const csoCycleInfo = it.sterilizerCycleNumber ? `\n\t\t\t\t\t<ЦиклЦСО>${escapeXml(it.sterilizerCycleNumber)}</ЦиклЦСО>` : "";
		return `\t\t\t\t<Материал>
\t\t\t\t\t<Ид>${escapeXml(it.id)}</Ид>
\t\t\t\t\t<Артикул>${escapeXml(it.article || it.id)}</Артикул>
\t\t\t\t\t<Наименование>${escapeXml(it.name)}</Наименование>
\t\t\t\t\t<БазоваяЕдиница Код="${escapeXml(it.unitCode)}" НаименованиеПолное="${escapeXml(it.unitName)}">${escapeXml(it.unitName)}</БазоваяЕдиница>
\t\t\t\t\t<Количество>${it.quantity}</Количество>
\t\t\t\t\t<СебестоимостьЗаЕдиницу>${formatKopToRub(it.unitCostKopecks)}</СебестоимостьЗаЕдиницу>
\t\t\t\t\t<Сумма>${formatKopToRub(it.totalCostKopecks)}</Сумма>
\t\t\t\t\t<СчетДебета>${escapeXml(it.debitAccount)}</СчетДебета>
\t\t\t\t\t<СчетКредита>${escapeXml(it.creditAccount)}</СчетКредита>
\t\t\t\t\t<СтатьяЗатрат>${escapeXml(it.costItemTitleRu)}</СтатьяЗатрат>${batchInfo}${expInfo}${csoCycleInfo}
\t\t\t\t</Материал>`;
	}).join("\n");
}

function renderPayrollEmployeesCommerceMl(employees: readonly OneCPayrollEmployeeItem[]): string {
	return employees.map((emp) => `\t\t\t\t<Сотрудник>
\t\t\t\t\t<Ид>${escapeXml(emp.id)}</Ид>
\t\t\t\t\t<ТабельныйНомер>${escapeXml(emp.employeeTabNumber)}</ТабельныйНомер>
\t\t\t\t\t<ФИО>${escapeXml(emp.employeeName)}</ФИО>
\t\t\t\t\t<Должность>${escapeXml(emp.positionTitleRu)}</Должность>
\t\t\t\t\t<Специальность>${escapeXml(emp.specialtyRu)}</Специальность>
\t\t\t\t\t<ВидНачисления>${escapeXml(emp.calculationTypeTitleRu)}</ВидНачисления>
\t\t\t\t\t<СуммаНачислено>${formatKopToRub(emp.grossEarnedKopecks)}</СуммаНачислено>
\t\t\t\t\t<СуммаНДФЛ>${formatKopToRub(emp.ndfl13Kopecks)}</СуммаНДФЛ>
\t\t\t\t\t<СуммаСтраховыеВзносы>${formatKopToRub(emp.socialInsuranceTaxesKopecks)}</СуммаСтраховыеВзносы>
\t\t\t\t\t<СуммаКВыплате>${formatKopToRub(emp.netPayoutKopecks)}</СуммаКВыплате>
\t\t\t\t\t<СчетДебета>${escapeXml(emp.debitAccount)}</СчетДебета>
\t\t\t\t\t<СчетКредитаЗарплата>${escapeXml(emp.creditAccountPayroll)}</СчетКредитаЗарплата>
\t\t\t\t\t<СчетКредитаНДФЛ>${escapeXml(emp.creditAccountNdfl)}</СчетКредитаНДФЛ>
\t\t\t\t\t<СчетКредитаВзносы>${escapeXml(emp.creditAccountSocial)}</СчетКредитаВзносы>
\t\t\t\t\t<СтатьяЗатрат>${escapeXml(emp.costItemTitleRu)}</СтатьяЗатрат>
\t\t\t\t</Сотрудник>`).join("\n");
}

export function generateCommerceMl209PackageXml(pkg: OneCCommerceMlPackage): string {
	const clinic = pkg.clinic;
	const accounts = pkg.chartOfAccounts || DEFAULT_1C_CHART_OF_ACCOUNTS;
	const salesDoc = pkg.retailSalesDocument;
	const writeoffDoc = pkg.materialWriteoffDocument;
	const payrollDoc = pkg.payrollDocument;
	const medicalActs = pkg.medicalActs || [];

	const salesTotalRub = formatKopToRub(salesDoc.totalRevenueKopecks);
	const writeoffTotalRub = formatKopToRub(writeoffDoc.totalCostKopecks);
	const salesSha = salesDoc.sha256Hash || computeCommerceMlSha256(salesDoc);
	const writeoffSha = writeoffDoc.sha256Hash || computeCommerceMlSha256(writeoffDoc);

	const bankSection = clinic.bankAccount
		? `<РасчетныеСчета>
				<РасчетныйСчет>
					<НомерСчета>${escapeXml(clinic.bankAccount)}</НомерСчета>
					<Банк>
						<БИК>${escapeXml(clinic.bankBik || "")}</БИК>
						<Наименование>${escapeXml(clinic.bankName || "")}</Наименование>
						<КорСчет>${escapeXml(clinic.bankCorrAccount || "")}</КорСчет>
					</Банк>
				</РасчетныйСчет>
			</РасчетныеСчета>`
		: "";

	const medicalActsXml = medicalActs.length > 0
		? `\n${medicalActs.map((act) => renderMedicalActDocumentCommerceMl(act, clinic, accounts)).join("\n")}`
		: "";

	const payrollDocXml = payrollDoc
		? `\n\t<!-- Документ: Отражение зарплаты в бухучете (Форма Т-51 / Т-13) -->
\t<Документ>
\t\t<Ид>${escapeXml(payrollDoc.id)}</Ид>
\t\t<Номер>${escapeXml(payrollDoc.documentNumber)}</Номер>
\t\t<Дата>${escapeXml(payrollDoc.documentDateIso)}</Дата>
\t\t<Время>${escapeXml(payrollDoc.documentTime)}</Время>
\t\t<ХозяйственнаяОперация>Отражение зарплаты в бухучете</ХозяйственнаяОперация>
\t\t<ПериодРегистрации>${escapeXml(payrollDoc.registrationPeriodIso)}</ПериодРегистрации>
\t\t<Валюта>руб</Валюта>
\t\t<Курс>1</Курс>
\t\t<Сумма>${formatKopToRub(payrollDoc.totalGrossKopecks)}</Сумма>
\t\t<ХэшТранзакцииSHA256>${payrollDoc.sha256Hash || computeCommerceMlSha256(payrollDoc)}</ХэшТранзакцииSHA256>
\t\t<Начисления>
${renderPayrollEmployeesCommerceMl(payrollDoc.employees)}
\t\t</Начисления>
\t\t<ЗначенияРеквизитов>
${reqVal("Основание", `Расчетная ведомость по форме Т-51 (${escapeXml(payrollDoc.periodLabelRu)})`)}
${reqVal("СчетЗарплатыКт", escapeXml(accounts.accountPayroll))}
${reqVal("СчетНдфлКт", escapeXml(accounts.accountNdfl))}
${reqVal("СчетВзносовКт", escapeXml(accounts.accountSocialTaxes))}
${reqVal("Проведен", "true")}
\t\t</ЗначенияРеквизитов>
\t</Документ>`
		: "";

	return `<?xml version="1.0" encoding="UTF-8"?>
<КоммерческаяИнформация
	xmlns="${COMMERCEML_XMLNS}"
	xmlns:xs="http://www.w3.org/2001/XMLSchema"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	ВерсияСхемы="${COMMERCEML_VERSION_209}"
	ДатаФормирования="${escapeXml(pkg.generatedAtIso)}"
	ПериодС="${escapeXml(pkg.exportPeriodStartIso)}"
	ПериодПо="${escapeXml(pkg.exportPeriodEndIso)}">
	<Классификатор>
		<Ид>${escapeXml(clinic.id)}</Ид>
		<Наименование>${escapeXml(clinic.name)}</Наименование>
		<Владелец>
			<Ид>${escapeXml(clinic.id)}</Ид>
			<Наименование>${escapeXml(clinic.name)}</Наименование>
			<ПолноеНаименование>${escapeXml(clinic.fullName || clinic.name)}</ПолноеНаименование>
			<ИНН>${escapeXml(clinic.inn)}</ИНН>
			<КПП>${escapeXml(clinic.kpp || "")}</КПП>
			<ОГРН>${escapeXml(clinic.ogrn || "")}</ОГРН>
			<Адрес>${escapeXml(clinic.address)}</Адрес>
			<Контакты>
				<Контакт>
					<Тип>ТелефонРабочий</Тип>
					<Значение>${escapeXml(clinic.phone)}</Значение>
				</Контакт>
			</Контакты>
			${bankSection}
		</Владелец>
	</Классификатор>

	<!-- Документ 1: Отчет о розничных продажах и кассовых сменах 54-ФЗ -->
	<Документ>
		<Ид>${escapeXml(salesDoc.id)}</Ид>
		<Номер>${escapeXml(salesDoc.documentNumber)}</Номер>
		<Дата>${escapeXml(salesDoc.documentDateIso)}</Дата>
		<Время>${escapeXml(salesDoc.documentTime)}</Время>
		<ХозяйственнаяОперация>Отчет о розничных продажах</ХозяйственнаяОперация>
		<Роль>Продавец</Роль>
		<Валюта>руб</Валюта>
		<Курс>1</Курс>
		<Сумма>${salesTotalRub}</Сумма>
		<Касса>${escapeXml(salesDoc.cashRegisterName)}</Касса>
		<Склад>${escapeXml(salesDoc.warehouseName)}</Склад>
		<ХэшТранзакцииSHA256>${salesSha}</ХэшТранзакцииSHA256>
		<Контрагенты>
			<Контрагент>
				<Ид>retail-population</Ид>
				<Наименование>Розничные покупатели</Наименование>
				<ПолноеНаименование>Розничные покупатели медицинских услуг (физические лица)</ПолноеНаименование>
				<Роль>Покупатель</Роль>
			</Контрагент>
		</Контрагенты>
		<Товары>
${renderRetailSalesItemsCommerceMl(salesDoc.items)}
		</Товары>
		<Оплаты>
${renderRetailSalesPaymentsCommerceMl(salesDoc.payments)}
		</Оплаты>
		<ЗначенияРеквизитов>
${reqVal("ОсвобождениеОтНДС", TAX_EXEMPTION_ARTICLE_149_RU)}
${reqVal("СчетДоходов", escapeXml(accounts.accountSalesRevenue))}
${reqVal("СчетРасходов", escapeXml(accounts.accountSalesCost))}
${reqVal("СчетКасса", escapeXml(accounts.accountCashDesk))}
${reqVal("СчетЭквайринг", escapeXml(accounts.accountAcquiringTransit))}
${reqVal("СчетРасчетный", escapeXml(accounts.accountBankCurrent))}
${reqVal("СчетРасчетов", escapeXml(accounts.accountRetailBuyers))}
${reqVal("Проведен", "true")}
		</ЗначенияРеквизитов>
	</Документ>${medicalActsXml}

	<!-- Документ: Требование-накладная / Списание материалов ЦСО и склада (Счет 10) -->
	<Документ>
		<Ид>${escapeXml(writeoffDoc.id)}</Ид>
		<Номер>${escapeXml(writeoffDoc.documentNumber)}</Номер>
		<Дата>${escapeXml(writeoffDoc.documentDateIso)}</Дата>
		<Время>${escapeXml(writeoffDoc.documentTime)}</Время>
		<ХозяйственнаяОперация>Требование-накладная</ХозяйственнаяОперация>
		<Роль>Склад</Роль>
		<Валюта>руб</Валюта>
		<Курс>1</Курс>
		<Сумма>${writeoffTotalRub}</Сумма>
		<СкладОтправитель>${escapeXml(writeoffDoc.senderWarehouseName)}</СкладОтправитель>
		<ПодразделениеПолучатель>${escapeXml(writeoffDoc.recipientDepartmentName)}</ПодразделениеПолучатель>
		<ХэшТранзакцииSHA256>${writeoffSha}</ХэшТранзакцииSHA256>
		<Материалы>
${renderMaterialWriteoffItemsCommerceMl(writeoffDoc.items)}
		</Материалы>
		<ЗначенияРеквизитов>
${reqVal("ОснованиеСписания", escapeXml(writeoffDoc.reasonRu || "Автоматическое списание по нормам BOM и ЦСО"))}
${reqVal("СчетЗатратДебет", escapeXml(accounts.accountProductionCost))}
${reqVal("СчетМатериаловКредит", escapeXml(accounts.accountMaterials))}
${reqVal("Проведен", "true")}
		</ЗначенияРеквизитов>
	</Документ>${payrollDocXml}
</КоммерческаяИнформация>`;
}

export const generateCommerceMl209Xml = generateCommerceMl209PackageXml;

export function generateEnterpriseData113Xml(pkg: OneCCommerceMlPackage): string {
	const clinic = pkg.clinic;
	const salesDoc = pkg.retailSalesDocument;
	const writeoffDoc = pkg.materialWriteoffDocument;
	const payrollDoc = pkg.payrollDocument;

	const payrollSection = payrollDoc
		? `\n\t\t<Document.ОтражениеЗарплатыВБухучете>
\t\t\t<KeyFields>
\t\t\t\t<Number>${escapeXml(payrollDoc.documentNumber)}</Number>
\t\t\t\t<Date>${escapeXml(payrollDoc.documentDateIso)}T${escapeXml(payrollDoc.documentTime)}</Date>
\t\t\t</KeyFields>
\t\t\t<RegistrationPeriod>${escapeXml(payrollDoc.registrationPeriodIso)}</RegistrationPeriod>
\t\t\t<TotalGross>${formatKopToRub(payrollDoc.totalGrossKopecks)}</TotalGross>
\t\t\t<TotalNdfl>${formatKopToRub(payrollDoc.totalNdflKopecks)}</TotalNdfl>
\t\t\t<TotalSocial>${formatKopToRub(payrollDoc.totalSocialTaxesKopecks)}</TotalSocial>
\t\t\t<TotalNet>${formatKopToRub(payrollDoc.totalNetPayoutKopecks)}</TotalNet>
\t\t\t<Employees>
${payrollDoc.employees.map((emp) => `\t\t\t\t<Employee>
\t\t\t\t\t<TabNumber>${escapeXml(emp.employeeTabNumber)}</TabNumber>
\t\t\t\t\t<FullName>${escapeXml(emp.employeeName)}</FullName>
\t\t\t\t\t<Position>${escapeXml(emp.positionTitleRu)}</Position>
\t\t\t\t\t<GrossEarned>${formatKopToRub(emp.grossEarnedKopecks)}</GrossEarned>
\t\t\t\t\t<Ndfl13>${formatKopToRub(emp.ndfl13Kopecks)}</Ndfl13>
\t\t\t\t\t<SocialInsurance>${formatKopToRub(emp.socialInsuranceTaxesKopecks)}</SocialInsurance>
\t\t\t\t\t<NetPayout>${formatKopToRub(emp.netPayoutKopecks)}</NetPayout>
\t\t\t\t\t<DebitAccount>${escapeXml(emp.debitAccount)}</DebitAccount>
\t\t\t\t\t<CreditAccountPayroll>${escapeXml(emp.creditAccountPayroll)}</CreditAccountPayroll>
\t\t\t\t</Employee>`).join("\n")}
\t\t\t</Employees>
\t\t</Document.ОтражениеЗарплатыВБухучете>`
		: "";

	return `<?xml version="1.0" encoding="UTF-8"?>
<Message
	xmlns="${ENTERPRISEDATA_XMLNS}"
	xmlns:xs="http://www.w3.org/2001/XMLSchema"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<Header>
		<Format>${ENTERPRISEDATA_XMLNS}</Format>
		<CreationDate>${escapeXml(pkg.generatedAtIso)}</CreationDate>
		<Source>CRM_DENTE</Source>
		<Destination>1C_ACCOUNTING_30</Destination>
		<Prefix>${escapeXml(clinic.prefix1C || "DN")}</Prefix>
	</Header>
	<Body>
		<Document.ОтчетОРозничныхПродажах>
			<KeyFields>
				<Number>${escapeXml(salesDoc.documentNumber)}</Number>
				<Date>${escapeXml(salesDoc.documentDateIso)}T${escapeXml(salesDoc.documentTime)}</Date>
			</KeyFields>
			<Organization>
				<INN>${escapeXml(clinic.inn)}</INN>
				<KPP>${escapeXml(clinic.kpp || "")}</KPP>
				<Name>${escapeXml(clinic.name)}</Name>
			</Organization>
			<CashRegister>${escapeXml(salesDoc.cashRegisterName)}</CashRegister>
			<Warehouse>${escapeXml(salesDoc.warehouseName)}</Warehouse>
			<Amount>${formatKopToRub(salesDoc.totalRevenueKopecks)}</Amount>
			<TaxExemption>${TAX_EXEMPTION_ARTICLE_149_RU}</TaxExemption>
			<Items>
${salesDoc.items.map((it) => `				<Item>
					<Code804n>${escapeXml(it.code804n || "")}</Code804n>
					<Name>${escapeXml(it.name)}</Name>
					<Tooth>${it.toothNumber || ""}</Tooth>
					<Quantity>${it.quantity}</Quantity>
					<Price>${formatKopToRub(it.priceKopecks)}</Price>
					<Total>${formatKopToRub(it.totalKopecks)}</Total>
					<Doctor>${escapeXml(it.doctorName || "")}</Doctor>
				</Item>`).join("\n")}
			</Items>
			<Payments>
${salesDoc.payments.map((p) => `				<Payment>
					<Type>${escapeXml(p.tenderType)}</Type>
					<Title>${escapeXml(p.tenderTitleRu)}</Title>
					<Amount>${formatKopToRub(p.amountKopecks)}</Amount>
					<Account>${escapeXml(p.accountCode)}</Account>
				</Payment>`).join("\n")}
			</Payments>
		</Document.ОтчетОРозничныхПродажах>

		<Document.ТребованиеНакладная>
			<KeyFields>
				<Number>${escapeXml(writeoffDoc.documentNumber)}</Number>
				<Date>${escapeXml(writeoffDoc.documentDateIso)}T${escapeXml(writeoffDoc.documentTime)}</Date>
			</KeyFields>
			<Organization>
				<INN>${escapeXml(clinic.inn)}</INN>
			</Organization>
			<SenderWarehouse>${escapeXml(writeoffDoc.senderWarehouseName)}</SenderWarehouse>
			<RecipientDepartment>${escapeXml(writeoffDoc.recipientDepartmentName)}</RecipientDepartment>
			<TotalCost>${formatKopToRub(writeoffDoc.totalCostKopecks)}</TotalCost>
			<Reason>${escapeXml(writeoffDoc.reasonRu || "Списание материалов BOM")}</Reason>
			<Materials>
${writeoffDoc.items.map((it) => `				<Material>
					<Article>${escapeXml(it.article)}</Article>
					<Name>${escapeXml(it.name)}</Name>
					<Unit>${escapeXml(it.unitName)}</Unit>
					<Quantity>${it.quantity}</Quantity>
					<CostPrice>${formatKopToRub(it.unitCostKopecks)}</CostPrice>
					<TotalCost>${formatKopToRub(it.totalCostKopecks)}</TotalCost>
					<Batch>${escapeXml(it.batchNumber || "")}</Batch>
					<DebitAccount>${escapeXml(it.debitAccount)}</DebitAccount>
					<CreditAccount>${escapeXml(it.creditAccount)}</CreditAccount>
				</Material>`).join("\n")}
			</Materials>
		</Document.ТребованиеНакладная>${payrollSection}
	</Body>
</Message>`;
}
