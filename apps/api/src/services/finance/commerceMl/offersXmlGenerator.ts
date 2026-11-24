/**
 * DENTE Dental CRM — 1C:Enterprise (CommerceML 2.09) Offers XML Generator.
 * Layer 1: Pure Statutory XML Serialization for Clinical Inventory & Stock Balances.
 */

import { and, eq } from "drizzle-orm";
import {
	COMMERCEML_VERSION_209,
	COMMERCEML_XMLNS,
	DEFAULT_OKEI_PIECE_CODE,
	DEFAULT_OKEI_PIECE_NAME,
	computeCommerceMlSha256,
	escapeXml,
	kopecksToNumericString,
	rublesToKopecks,
} from "@dental/shared";
import { withTenantCtx } from "../../../db/rls.js";
import { inventoryItems, organizations, warehouses } from "../../../db/schema.js";
import type { ExportOffersParams, OneCOffersXmlResult } from "./types.js";

/**
 * Builds CommerceML 2.09 `offers.xml` package with inventory stocks and material offers.
 */
export async function buildOffersXml(params: ExportOffersParams): Promise<OneCOffersXmlResult> {
	const orgId = params.organizationId;
	const generatedAtIso = new Date().toISOString();

	const { org, items, defaultWarehouse } = await withTenantCtx(orgId, async (tx) => {
		const [foundOrg] = await tx
			.select()
			.from(organizations)
			.where(eq(organizations.id, orgId))
			.limit(1);

		const foundItems = await tx
			.select({
				id: inventoryItems.id,
				sku: inventoryItems.sku,
				name: inventoryItems.name,
				currentQty: inventoryItems.currentQty,
				unitCostRub: inventoryItems.unitCostRub,
				unitCostKopecks: inventoryItems.unitCostKopecks,
				unit: inventoryItems.unit,
				lotNumber: inventoryItems.lotNumber,
				expirationDate: inventoryItems.expirationDate,
				category: inventoryItems.category,
			})
			.from(inventoryItems)
			.where(eq(inventoryItems.organizationId, orgId));

		const [foundWh] = await tx
			.select({ id: warehouses.id, name: warehouses.name })
			.from(warehouses)
			.where(and(eq(warehouses.organizationId, orgId), eq(warehouses.isDefault, true)))
			.limit(1);

		return {
			org: foundOrg ?? null,
			items: foundItems,
			defaultWarehouse: foundWh ?? null,
		};
	});

	const orgName = org?.name || "";
	const orgInn = org?.inn || "";
	const orgKpp = org?.kpp || "";
	const warehouseId = defaultWarehouse?.id || "wh-main";
	const warehouseName = params.warehouseName || defaultWarehouse?.name || "Основной склад клиники";

	const classifierId = `classifier-${orgId}`;
	const catalogId = `catalog-${orgId}`;
	const packageId = `offers-${orgId}`;

	let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
	xml += `<КоммерческаяИнформация xmlns="${COMMERCEML_XMLNS}" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ВерсияСхемы="${COMMERCEML_VERSION_209}" ДатаФормирования="${generatedAtIso}">\n`;

	xml += `  <ПакетПредложений СодержитТолькоИзменения="false">\n`;
	xml += `    <Ид>${escapeXml(packageId)}</Ид>\n`;
	xml += `    <Наименование>Пакет предложений и складских остатков материалов</Наименование>\n`;
	xml += `    <ИдКаталога>${escapeXml(catalogId)}</ИдКаталога>\n`;
	xml += `    <ИдКлассификатора>${escapeXml(classifierId)}</ИдКлассификатора>\n`;
	xml += `    <Владелец>\n`;
	xml += `      <Ид>${escapeXml(orgId)}</Ид>\n`;
	xml += `      <Наименование>${escapeXml(orgName)}</Наименование>\n`;
	xml += `      <ОфициальноеНаименование>${escapeXml(orgName ? `ООО «${orgName}»` : "")}</ОфициальноеНаименование>\n`;
	xml += `      <ИНН>${escapeXml(orgInn)}</ИНН>\n`;
	xml += `      <КПП>${escapeXml(orgKpp)}</КПП>\n`;
	xml += `    </Владелец>\n`;

	xml += `    <ТипыЦен>\n`;
	xml += `      <ТипЦены>\n`;
	xml += `        <Ид>price-cost</Ид>\n`;
	xml += `        <Наименование>${escapeXml(params.priceTypeTitle)}</Наименование>\n`;
	xml += `        <Валюта>RUB</Валюта>\n`;
	xml += `      </ТипЦены>\n`;
	xml += `    </ТипыЦен>\n`;

	xml += `    <Склады>\n`;
	xml += `      <Склад>\n`;
	xml += `        <Ид>${escapeXml(warehouseId)}</Ид>\n`;
	xml += `        <Наименование>${escapeXml(warehouseName)}</Наименование>\n`;
	xml += `      </Склад>\n`;
	xml += `    </Склады>\n`;

	xml += `    <Предложения>\n`;
	let offersCount = 0;
	let totalStockQty = 0;

	for (const item of items) {
		const qty = Number(item.currentQty) || 0;
		if (params.includeZeroStock === false && qty <= 0) continue;

		const unitCostKopCol = item.unitCostKopecks != null ? Number(item.unitCostKopecks) : 0;
		const unitCostKop = unitCostKopCol !== 0 ? unitCostKopCol : rublesToKopecks(Number(item.unitCostRub) || 0);
		const article = item.sku || item.id.slice(0, 8).toUpperCase();
		const unitName = item.unit || DEFAULT_OKEI_PIECE_NAME;

		xml += `      <Предложение>\n`;
		xml += `        <Ид>${escapeXml(item.id)}</Ид>\n`;
		xml += `        <Артикул>${escapeXml(article)}</Артикул>\n`;
		xml += `        <Наименование>${escapeXml(item.name)}</Наименование>\n`;
		xml += `        <БазоваяЕдиница Код="${DEFAULT_OKEI_PIECE_CODE}" НаименованиеПолное="${escapeXml(unitName)}">${escapeXml(unitName)}</БазоваяЕдиница>\n`;

		xml += `        <Цены>\n`;
		xml += `          <Цена>\n`;
		xml += `            <ИдТипаЦены>price-cost</ИдТипаЦены>\n`;
		xml += `            <ЦенаЗаЕдиницу>${kopecksToNumericString(Math.max(0, unitCostKop))}</ЦенаЗаЕдиницу>\n`;
		xml += `            <Валюта>RUB</Валюта>\n`;
		xml += `            <Единица>${escapeXml(unitName)}</Единица>\n`;
		xml += `            <Коэффициент>1</Коэффициент>\n`;
		xml += `          </Цена>\n`;
		xml += `        </Цены>\n`;

		xml += `        <Количество>${qty}</Количество>\n`;
		xml += `        <ОстаткиПоСкладам>\n`;
		xml += `          <Остаток>\n`;
		xml += `            <ИдСклада>${escapeXml(warehouseId)}</ИдСклада>\n`;
		xml += `            <Количество>${qty}</Количество>\n`;
		xml += `          </Остаток>\n`;
		xml += `        </ОстаткиПоСкладам>\n`;

		xml += `        <ЗначенияРеквизитов>\n`;
		if (item.lotNumber) {
			xml += `          <ЗначениеРеквизита>\n`;
			xml += `            <Наименование>СерияНоменклатуры</Наименование>\n`;
			xml += `            <Значение>${escapeXml(item.lotNumber)}</Значение>\n`;
			xml += `          </ЗначениеРеквизита>\n`;
		}
		if (item.expirationDate) {
			xml += `          <ЗначениеРеквизита>\n`;
			xml += `            <Наименование>СрокГодности</Наименование>\n`;
			xml += `            <Значение>${escapeXml(item.expirationDate)}</Значение>\n`;
			xml += `          </ЗначениеРеквизита>\n`;
		}
		if (item.category) {
			xml += `          <ЗначениеРеквизита>\n`;
			xml += `            <Наименование>СкладскаяКатегория</Наименование>\n`;
			xml += `            <Значение>${escapeXml(item.category)}</Значение>\n`;
			xml += `          </ЗначениеРеквизита>\n`;
		}
		xml += `        </ЗначенияРеквизитов>\n`;

		xml += `      </Предложение>\n`;
		offersCount++;
		totalStockQty += qty;
	}

	xml += `    </Предложения>\n`;
	xml += `  </ПакетПредложений>\n`;
	xml += `</КоммерческаяИнформация>\n`;

	const sha256 = computeCommerceMlSha256(xml);

	return {
		xml,
		sha256,
		offersCount,
		totalStockQty,
		generatedAtIso,
	};
}
