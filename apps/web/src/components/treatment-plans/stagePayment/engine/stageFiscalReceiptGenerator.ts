import type { Kopecks } from "@dental/shared";
import { getStagePresetByKind } from "../stagePaymentPresets.js";
import type { FiscalReceiptItem, MilestoneStage, StageFiscalReceipt54Fz } from "./types";

/**
 * Формирование фискального чека 54-ФЗ для этапа оплаты
 */
export function generate54FzStageFiscalReceipt(
	stage: MilestoneStage,
	paymentType: "advance" | "completion" | "full",
	paymentMethod: "CASH" | "BANK_CARD" | "PATIENT_DEPOSIT" | "SBP_QR" = "BANK_CARD",
	clinicInn = "",
	patientName = "Пациент",
	clinicName = "ООО 'ДЕНТЕ СТОМАТОЛОГИЯ'",
): StageFiscalReceipt54Fz {
	const now = new Date();
	const timestamp = now.toISOString();
	const _preset = getStagePresetByKind(stage.kind);
	void _preset;

	let calculationSign: "ПРЕДОПЛАТА 100%" | "ПРЕДОПЛАТА" | "ПОЛНЫЙ РАСЧЕТ";
	let fiscalTag1214: string;
	let fiscalTag1212: string;
	let amountKopecks: Kopecks;

	if (paymentType === "advance") {
		if (stage.advanceRequiredKopecks === stage.totalKopecks) {
			calculationSign = "ПРЕДОПЛАТА 100%";
			fiscalTag1214 = "1";
		} else {
			calculationSign = "ПРЕДОПЛАТА";
			fiscalTag1214 = "2";
		}
		fiscalTag1212 = "10";
		amountKopecks = stage.advancePaidKopecks > 0 ? stage.advancePaidKopecks : stage.advanceRequiredKopecks;
	} else if (paymentType === "completion") {
		calculationSign = "ПОЛНЫЙ РАСЧЕТ";
		fiscalTag1214 = "4";
		fiscalTag1212 = "4";
		amountKopecks = Math.max(0, stage.totalKopecks - stage.advancePaidKopecks);
	} else {
		calculationSign = "ПОЛНЫЙ РАСЧЕТ";
		fiscalTag1214 = "4";
		fiscalTag1212 = "4";
		amountKopecks = stage.totalKopecks;
	}

	const itemName =
		paymentType === "advance"
			? `Аванс за медицинские услуги: ${stage.title}`
			: `Окончательный расчет: ${stage.title}`;

	const receiptItem: FiscalReceiptItem = {
		name: itemName,
		priceKopecks: amountKopecks,
		quantity: 1,
		totalKopecks: amountKopecks,
		fiscalTag1212,
		fiscalTag1214,
	};

	const stageDigits = stage.id.replace(/\D/g, "").slice(0, 4) || "0001";
	const receiptId = `CHK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${stageDigits.padStart(4, "0")}`;
	const fnNumber = "9960440301824912";
	const fdNumber = String(10000 + (Number(stageDigits) % 89999));
	const fpd = String(1000000000 + (Number(stageDigits) * 111111111));

	const qrPayload = `t=${now.toISOString().replace(/[-:T]/g, "").slice(0, 15)}&s=${(amountKopecks / 100).toFixed(2)}&fn=${fnNumber}&i=${fdNumber}&fp=${fpd}&n=1`;

	return {
		receiptId,
		timestamp,
		patientName,
		clinicInn,
		clinicName,
		stageTitle: stage.title,
		stageKind: stage.kind,
		calculationSign,
		taxationSystem: "УСН Доходы",
		vatRate: "НДС не облагается (ст. 149 НК РФ пп. 2 п. 2)",
		totalAmountKopecks: amountKopecks,
		paymentMethod,
		items: [receiptItem],
		qrPayload,
		fnNumber,
		fdNumber,
		fpd,
	};
}
