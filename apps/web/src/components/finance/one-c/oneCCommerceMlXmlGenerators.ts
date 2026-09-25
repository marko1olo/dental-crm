/**
 * DENTE Dental CRM — 1C:Enterprise (1С:Предприятие 8.3 / Бухгалтерия 3.0 / EnterpriseData)
 * XML Generators for CommerceML 2.09 & EnterpriseData 1.13 statutory packages.
 */

import { escapeXml } from "@dental/shared";
import {
	COMMERCEML_VERSION_209,
	ENTERPRISEDATA_VERSION_113,
	TAX_EXEMPTION_ARTICLE_149_RU,
	DEFAULT_OKEI_PIECE_CODE,
	DEFAULT_OKEI_PIECE_NAME,
	formatKopToRub,
	type OneCCommerceMlPackage,
	type OneCMaterialWriteoffItem,
	type OneCPayrollEmployeeItem,
	type OneCPaymentBreakdownItem,
	type OneCRetailSaleItem,
} from "./oneCCommerceMlTypes.js";

// ═══════════════════════════════════════════════════════════════════════════
// XML GENERATOR: COMMERCEML 2.09 PACKAGE
// ═══════════════════════════════════════════════════════════════════════════

function renderRetailSalesItemsCommerceMl(items: readonly OneCRetailSaleItem[]): string {
	return items
		.map((it) => {
			const unitCode = it.unitCode || DEFAULT_OKEI_PIECE_CODE;
			const unitName = it.unitName || DEFAULT_OKEI_PIECE_NAME;
			const toothSuffix = it.toothNumber ? ` (Зуб ${it.toothNumber})` : "";
			const fullName = `${it.name}${toothSuffix}`;
			const vatRate = it.vatRate || "Без НДС";
			const vatAmountRub = formatKopToRub(it.vatAmountKopecks ?? 0);
			const priceRub = formatKopToRub(it.priceKopecks);
			const totalRub = formatKopToRub(it.totalKopecks);

			return `\t\t\t\t<Товар>
\t\t\t\t\t<Ид>${escapeXml(it.id)}</Ид>
\t\t\t\t\t<Артикул>${escapeXml(it.code804n || it.id)}</Артикул>
\t\t\t\t\t<Код804н>${escapeXml(it.code804n || "")}</Код804н>
\t\t\t\t\t<Наименование>${escapeXml(fullName)}</Наименование>
\t\t\t\t\t<БазоваяЕдиница Код="${escapeXml(unitCode)}" НаименованиеПолное="${escapeXml(unitName)}">${escapeXml(unitName)}</БазоваяЕдиница>
\t\t\t\t\t<СтавкаНДС>${escapeXml(vatRate)}</СтавкаНДС>
\t\t\t\t\t<ЦенаЗаЕдиницу>${priceRub}</ЦенаЗаЕдиницу>
\t\t\t\t\t<Количество>${it.quantity}</Количество>
\t\t\t\t\t<Сумма>${totalRub}</Сумма>
\t\t\t\t\t<СуммаНДС>${vatAmountRub}</СуммаНДС>
\t\t\t\t\t<НоменклатурнаяГруппа>${escapeXml(it.nomenclatureGroup || "Стоматологические услуги")}</НоменклатурнаяГруппа>
\t\t\t\t\t<ВрачФИО>${escapeXml(it.doctorName || "")}</ВрачФИО>
\t\t\t\t</Товар>`;
		})
		.join("\n");
}

function renderRetailSalesPaymentsCommerceMl(
	payments: readonly OneCPaymentBreakdownItem[],
): string {
	return payments
		.map((p) => {
			const sumRub = formatKopToRub(p.amountKopecks);
			const acquiringInfo = p.acquiringBankName
				? `\n\t\t\t\t\t<Эквайер>${escapeXml(p.acquiringBankName)}</Эквайер>`
				: "";
			const terminalInfo = p.acquiringTerminalId
				? `\n\t\t\t\t\t<Терминал>${escapeXml(p.acquiringTerminalId)}</Терминал>`
				: "";

			return `\t\t\t\t<Оплата>
\t\t\t\t\t<Ид>${escapeXml(p.id)}</Ид>
\t\t\t\t\t<ВидОплаты>${escapeXml(p.tenderTitleRu)}</ВидОплаты>
\t\t\t\t\t<ТипОплаты>${escapeXml(p.tenderType)}</ТипОплаты>
\t\t\t\t\t<Сумма>${sumRub}</Сумма>
\t\t\t\t\t<СчетУчета>${escapeXml(p.accountCode)}</СчетУчета>${acquiringInfo}${terminalInfo}
\t\t\t\t</Оплата>`;
		})
		.join("\n");
}

function renderMaterialWriteoffItemsCommerceMl(
	items: readonly OneCMaterialWriteoffItem[],
): string {
	return items
		.map((it) => {
			const unitCostRub = formatKopToRub(it.unitCostKopecks);
			const totalCostRub = formatKopToRub(it.totalCostKopecks);
			const batchInfo = it.batchNumber
				? `\n\t\t\t\t\t<Партия>${escapeXml(it.batchNumber)}</Партия>`
				: "";
			const expInfo = it.expirationDateIso
				? `\n\t\t\t\t\t<СрокГодности>${escapeXml(it.expirationDateIso)}</СрокГодности>`
				: "";

			return `\t\t\t\t<Материал>
\t\t\t\t\t<Ид>${escapeXml(it.id)}</Ид>
\t\t\t\t\t<Артикул>${escapeXml(it.article || it.id)}</Артикул>
\t\t\t\t\t<Наименование>${escapeXml(it.name)}</Наименование>
\t\t\t\t\t<БазоваяЕдиница Код="${escapeXml(it.unitCode)}" НаименованиеПолное="${escapeXml(it.unitName)}">${escapeXml(it.unitName)}</БазоваяЕдиница>
\t\t\t\t\t<Количество>${it.quantity}</Количество>
\t\t\t\t\t<СебестоимостьЗаЕдиницу>${unitCostRub}</СебестоимостьЗаЕдиницу>
\t\t\t\t\t<Сумма>${totalCostRub}</Сумма>
\t\t\t\t\t<СчетДебета>${escapeXml(it.debitAccount)}</СчетДебета>
\t\t\t\t\t<СчетКредита>${escapeXml(it.creditAccount)}</СчетКредита>
\t\t\t\t\t<СтатьяЗатрат>${escapeXml(it.costItemTitleRu)}</СтатьяЗатрат>${batchInfo}${expInfo}
\t\t\t\t</Материал>`;
		})
		.join("\n");
}

function renderPayrollEmployeesCommerceMl(
	employees: readonly OneCPayrollEmployeeItem[],
): string {
	return employees
		.map((emp) => {
			const grossRub = formatKopToRub(emp.grossEarnedKopecks);
			const ndflRub = formatKopToRub(emp.ndfl13Kopecks);
			const socialRub = formatKopToRub(emp.socialInsuranceTaxesKopecks);
			const netRub = formatKopToRub(emp.netPayoutKopecks);

			return `\t\t\t\t<Сотрудник>
\t\t\t\t\t<Ид>${escapeXml(emp.id)}</Ид>
\t\t\t\t\t<ТабельныйНомер>${escapeXml(emp.employeeTabNumber)}</ТабельныйНомер>
\t\t\t\t\t<ФИО>${escapeXml(emp.employeeName)}</ФИО>
\t\t\t\t\t<Должность>${escapeXml(emp.positionTitleRu)}</Должность>
\t\t\t\t\t<Специальность>${escapeXml(emp.specialtyRu)}</Специальность>
\t\t\t\t\t<ВидНачисления>${escapeXml(emp.calculationTypeTitleRu)}</ВидНачисления>
\t\t\t\t\t<СуммаНачислено>${grossRub}</СуммаНачислено>
\t\t\t\t\t<СуммаНДФЛ>${ndflRub}</СуммаНДФЛ>
\t\t\t\t\t<СуммаСтраховыеВзносы>${socialRub}</СуммаСтраховыеВзносы>
\t\t\t\t\t<СуммаКВыплате>${netRub}</СуммаКВыплате>
\t\t\t\t\t<СчетДебета>${escapeXml(emp.debitAccount)}</СчетДебета>
\t\t\t\t\t<СчетКредитаЗарплата>${escapeXml(emp.creditAccountPayroll)}</СчетКредитаЗарплата>
\t\t\t\t\t<СчетКредитаНДФЛ>${escapeXml(emp.creditAccountNdfl)}</СчетКредитаНДФЛ>
\t\t\t\t\t<СчетКредитаВзносы>${escapeXml(emp.creditAccountSocial)}</СчетКредитаВзносы>
\t\t\t\t\t<СтатьяЗатрат>${escapeXml(emp.costItemTitleRu)}</СтатьяЗатрат>
\t\t\t\t</Сотрудник>`;
		})
		.join("\n");
}

/**
 * Generates official 1C:Enterprise CommerceML 2.09 Multi-Document Package XML.
 */
export function generateCommerceMl209Xml(pkg: OneCCommerceMlPackage): string {
	const clinic = pkg.clinic;
	const salesDoc = pkg.retailSalesDocument;
	const writeoffDoc = pkg.materialWriteoffDocument;
	const payrollDoc = pkg.payrollDocument;

	const salesTotalRub = formatKopToRub(salesDoc.totalRevenueKopecks);
	const writeoffTotalRub = formatKopToRub(writeoffDoc.totalCostKopecks);
	const payrollTotalRub = formatKopToRub(payrollDoc.totalGrossKopecks);

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

	return `<?xml version="1.0" encoding="UTF-8"?>
<КоммерческаяИнформация
	xmlns="urn:1C.ru:commerceml_2"
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

	<!-- Документ 1: Отчет о розничных продажах -->
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
			<ЗначениеРеквизита>
				<Наименование>ОсвобождениеОтНДС</Наименование>
				<Значение>${TAX_EXEMPTION_ARTICLE_149_RU}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>СчетДоходов</Наименование>
				<Значение>${escapeXml(pkg.chartOfAccounts.accountSalesRevenue)}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>СчетРасходов</Наименование>
				<Значение>${escapeXml(pkg.chartOfAccounts.accountSalesCost)}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>Проведен</Наименование>
				<Значение>true</Значение>
			</ЗначениеРеквизита>
		</ЗначенияРеквизитов>
	</Документ>

	<!-- Документ 2: Требование-накладная / Списание материалов по нормам BOM -->
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
		<Материалы>
${renderMaterialWriteoffItemsCommerceMl(writeoffDoc.items)}
		</Материалы>
		<ЗначенияРеквизитов>
			<ЗначениеРеквизита>
				<Наименование>ОснованиеСписания</Наименование>
				<Значение>${escapeXml(writeoffDoc.reasonRu || "Автоматическое списание по нормам BOM")}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>СчетЗатратДебет</Наименование>
				<Значение>${escapeXml(pkg.chartOfAccounts.accountProductionCost)}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>СчетМатериаловКредит</Наименование>
				<Значение>${escapeXml(pkg.chartOfAccounts.accountMaterials)}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>Проведен</Наименование>
				<Значение>true</Значение>
			</ЗначениеРеквизита>
		</ЗначенияРеквизитов>
	</Документ>

	<!-- Документ 3: Отражение зарплаты в бухучете -->
	<Документ>
		<Ид>${escapeXml(payrollDoc.id)}</Ид>
		<Номер>${escapeXml(payrollDoc.documentNumber)}</Номер>
		<Дата>${escapeXml(payrollDoc.documentDateIso)}</Дата>
		<Время>${escapeXml(payrollDoc.documentTime)}</Время>
		<ХозяйственнаяОперация>Отражение зарплаты в бухучете</ХозяйственнаяОперация>
		<ПериодРегистрации>${escapeXml(payrollDoc.registrationPeriodIso)}</ПериодРегистрации>
		<Валюта>руб</Валюта>
		<Курс>1</Курс>
		<Сумма>${payrollTotalRub}</Сумма>
		<Начисления>
${renderPayrollEmployeesCommerceMl(payrollDoc.employees)}
		</Начисления>
		<ЗначенияРеквизитов>
			<ЗначениеРеквизита>
				<Наименование>Основание</Наименование>
				<Значение>Расчетная ведомость по форме Т-51 (${escapeXml(payrollDoc.periodLabelRu)})</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>СчетЗарплатыКт</Наименование>
				<Значение>${escapeXml(pkg.chartOfAccounts.accountPayroll)}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>СчетНдфлКт</Наименование>
				<Значение>${escapeXml(pkg.chartOfAccounts.accountNdfl)}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>СчетВзносовКт</Наименование>
				<Значение>${escapeXml(pkg.chartOfAccounts.accountSocialTaxes)}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>Проведен</Наименование>
				<Значение>true</Значение>
			</ЗначениеРеквизита>
		</ЗначенияРеквизитов>
	</Документ>
</КоммерческаяИнформация>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// XML GENERATOR: ENTERPRISEDATA v1.13 XML
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates official 1C:Enterprise EnterpriseData v1.13 XML Package.
 */
export function generateEnterpriseData113Xml(pkg: OneCCommerceMlPackage): string {
	const clinic = pkg.clinic;
	const salesDoc = pkg.retailSalesDocument;
	const writeoffDoc = pkg.materialWriteoffDocument;
	const payrollDoc = pkg.payrollDocument;

	return `<?xml version="1.0" encoding="UTF-8"?>
<Message
	xmlns="http://v8.1c.ru/edi/edi_stnd/EnterpriseData/${ENTERPRISEDATA_VERSION_113}"
	xmlns:xs="http://www.w3.org/2001/XMLSchema"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<Header>
		<Format>http://v8.1c.ru/edi/edi_stnd/EnterpriseData/${ENTERPRISEDATA_VERSION_113}</Format>
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
${salesDoc.items
	.map(
		(it) => `				<Item>
					<Code804n>${escapeXml(it.code804n || "")}</Code804n>
					<Name>${escapeXml(it.name)}</Name>
					<Tooth>${it.toothNumber || ""}</Tooth>
					<Quantity>${it.quantity}</Quantity>
					<Price>${formatKopToRub(it.priceKopecks)}</Price>
					<Total>${formatKopToRub(it.totalKopecks)}</Total>
					<Doctor>${escapeXml(it.doctorName || "")}</Doctor>
				</Item>`,
	)
	.join("\n")}
			</Items>
			<Payments>
${salesDoc.payments
	.map(
		(p) => `				<Payment>
					<Type>${escapeXml(p.tenderType)}</Type>
					<Title>${escapeXml(p.tenderTitleRu)}</Title>
					<Amount>${formatKopToRub(p.amountKopecks)}</Amount>
					<Account>${escapeXml(p.accountCode)}</Account>
				</Payment>`,
	)
	.join("\n")}
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
${writeoffDoc.items
	.map(
		(it) => `				<Material>
					<Article>${escapeXml(it.article)}</Article>
					<Name>${escapeXml(it.name)}</Name>
					<Unit>${escapeXml(it.unitName)}</Unit>
					<Quantity>${it.quantity}</Quantity>
					<CostPrice>${formatKopToRub(it.unitCostKopecks)}</CostPrice>
					<TotalCost>${formatKopToRub(it.totalCostKopecks)}</TotalCost>
					<Batch>${escapeXml(it.batchNumber || "")}</Batch>
					<DebitAccount>${escapeXml(it.debitAccount)}</DebitAccount>
					<CreditAccount>${escapeXml(it.creditAccount)}</CreditAccount>
				</Material>`,
	)
	.join("\n")}
			</Materials>
		</Document.ТребованиеНакладная>

		<Document.ОтражениеЗарплатыВБухучете>
			<KeyFields>
				<Number>${escapeXml(payrollDoc.documentNumber)}</Number>
				<Date>${escapeXml(payrollDoc.documentDateIso)}T${escapeXml(payrollDoc.documentTime)}</Date>
			</KeyFields>
			<RegistrationPeriod>${escapeXml(payrollDoc.registrationPeriodIso)}</RegistrationPeriod>
			<TotalGross>${formatKopToRub(payrollDoc.totalGrossKopecks)}</TotalGross>
			<TotalNdfl>${formatKopToRub(payrollDoc.totalNdflKopecks)}</TotalNdfl>
			<TotalSocial>${formatKopToRub(payrollDoc.totalSocialTaxesKopecks)}</TotalSocial>
			<TotalNet>${formatKopToRub(payrollDoc.totalNetPayoutKopecks)}</TotalNet>
			<Employees>
${payrollDoc.employees
	.map(
		(emp) => `				<Employee>
					<TabNumber>${escapeXml(emp.employeeTabNumber)}</TabNumber>
					<FullName>${escapeXml(emp.employeeName)}</FullName>
					<Position>${escapeXml(emp.positionTitleRu)}</Position>
					<GrossEarned>${formatKopToRub(emp.grossEarnedKopecks)}</GrossEarned>
					<Ndfl13>${formatKopToRub(emp.ndfl13Kopecks)}</Ndfl13>
					<SocialInsurance>${formatKopToRub(emp.socialInsuranceTaxesKopecks)}</SocialInsurance>
					<NetPayout>${formatKopToRub(emp.netPayoutKopecks)}</NetPayout>
					<DebitAccount>${escapeXml(emp.debitAccount)}</DebitAccount>
					<CreditAccountPayroll>${escapeXml(emp.creditAccountPayroll)}</CreditAccountPayroll>
				</Employee>`,
	)
	.join("\n")}
			</Employees>
		</Document.ОтражениеЗарплатыВБухучете>
	</Body>
</Message>`;
}
