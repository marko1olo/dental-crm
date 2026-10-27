import { kopecksToRub, parseKopecks } from "@dental/shared";
import { Decimal } from "decimal.js";
import { and, eq } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { serviceCatalogItems } from "../../../db/schema.js";
import { FamilyWalletError, type FamilyDebitParams } from "../familyWalletTypes.js";

export async function verifyServicePriceIntegrity(params: {
	readonly tx: PgTransaction<any, any, any>;
	readonly organizationId: string;
	readonly debitParams: FamilyDebitParams;
	readonly debitKopecks: number;
}): Promise<void> {
	const { tx, organizationId, debitParams, debitKopecks } = params;
	const targetServiceId = debitParams.serviceId || debitParams.catalogItemId;
	if (!targetServiceId) return;

	const [serviceItem] = await tx
		.select()
		.from(serviceCatalogItems)
		.where(
			and(
				eq(serviceCatalogItems.id, targetServiceId),
				eq(serviceCatalogItems.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!serviceItem) {
		throw new FamilyWalletError(
			`Услуга с ID «${targetServiceId}» не найдена в каталоге клиники`,
			404,
			"SERVICE_NOT_FOUND",
		);
	}

	const catalogPriceKopecks = parseKopecks(serviceItem.priceRub);
	let discountKopecks = 0;
	if (debitParams.discountRub !== undefined && debitParams.discountRub !== null) {
		discountKopecks = parseKopecks(debitParams.discountRub);
	} else if (debitParams.discountPercent !== undefined && debitParams.discountPercent !== null) {
		discountKopecks = new Decimal(catalogPriceKopecks)
			.times(new Decimal(debitParams.discountPercent))
			.div(100)
			.toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
			.toNumber();
	}

	const verifiedAmountKopecks = Math.max(
		0,
		new Decimal(catalogPriceKopecks).minus(discountKopecks).toNumber(),
	);
	if (debitKopecks !== verifiedAmountKopecks) {
		throw new FamilyWalletError(
			`Попытка подмены стоимости услуги «${serviceItem.title}»: в каталоге клиники ${kopecksToRub(catalogPriceKopecks)} ₽ (к списанию с учетом скидки: ${kopecksToRub(verifiedAmountKopecks)} ₽), получено ${kopecksToRub(debitKopecks)} ₽`,
			400,
			"PRICE_SPOOFING_DETECTED",
		);
	}
}
