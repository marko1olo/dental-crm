import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LanKktDriverService } from "../lanKktDriverService.js";
import { FiscalReceiptFactory } from "../../kkt/FiscalReceiptFactory.js";
import type { Ffd12ReceiptPayload } from "../../kkt/FiscalReceiptFactory.js";

describe("LanKktDriverService — Statutory Framing, Error Codes & Network Diagnostics", () => {
	it("should map ATOL Driver v10 response codes to Russian status descriptions", () => {
		assert.equal(LanKktDriverService.mapAtolErrorCode(0), "Ошибок нет (OK)");
		assert.equal(LanKktDriverService.mapAtolErrorCode(1), "Нет связи с фискальным регистратором (порт недоступен)");
		assert.equal(LanKktDriverService.mapAtolErrorCode(2), "Закончилась чековая лента (Out of Paper)");
		assert.equal(LanKktDriverService.mapAtolErrorCode(3), "Открыта крышка фискального регистратора");
		assert.equal(LanKktDriverService.mapAtolErrorCode(4), "Смена превысила 24 часа (требуется снятие Z-отчета)");
		assert.equal(LanKktDriverService.mapAtolErrorCode(5), "Ошибка фискального накопителя (ФН)");
		assert.equal(LanKktDriverService.mapAtolErrorCode(6), "Неверный пароль кассира/администратора");
		assert.equal(LanKktDriverService.mapAtolErrorCode(7), "Недопустимый режим налогообложения");
		assert.ok(LanKktDriverService.mapAtolErrorCode(99).includes("0x63"));
	});

	it("should map Shtrikh-M protocol return codes to Russian status descriptions", () => {
		assert.equal(LanKktDriverService.mapShtrikhErrorCode(0x00), "Ошибок нет (OK)");
		assert.equal(LanKktDriverService.mapShtrikhErrorCode(0x01), "Выдача данных: нет данных");
		assert.equal(LanKktDriverService.mapShtrikhErrorCode(0x02), "Команда не поддерживается в данном режиме");
		assert.equal(LanKktDriverService.mapShtrikhErrorCode(0x03), "Ошибка контрольной ленты или датчика бумаги");
		assert.equal(LanKktDriverService.mapShtrikhErrorCode(0x04), "Отсутствует бумага (Out of Paper)");
		assert.equal(LanKktDriverService.mapShtrikhErrorCode(0x05), "Снята крышка принтера");
		assert.equal(LanKktDriverService.mapShtrikhErrorCode(0x08), "Исчерпан ресурс фискального накопителя");
		assert.equal(LanKktDriverService.mapShtrikhErrorCode(0x4a), "Ошибка контрольной суммы XOR пакета");
	});

	it("should format valid Shtrikh-M command packet with correct STX, length, password, and XOR checksum", () => {
		const commandCode = 0x11; // Print line
		const textPayload = Buffer.from("ДЕНТЕ КЛИНИКА", "utf8");
		const packet = LanKktDriverService.formatShtrikhMCommandPacket(commandCode, textPayload, 30);

		// Format: [STX(0x02), Length, Command(0x11), Password(4 bytes LE), Payload..., CRC]
		assert.equal(packet[0], 0x02); // STX
		const length = packet[1]!;
		assert.equal(length, 1 + 4 + textPayload.length);
		assert.equal(packet[2], 0x11); // Command

		// Checksum verification: XOR of all bytes from index 1 to packet.length - 2
		let computedCrc = 0;
		for (let i = 1; i < packet.length - 1; i++) {
			computedCrc ^= packet[i]!;
		}
		const packetCrc = packet[packet.length - 1]!;
		assert.equal(packetCrc, computedCrc);
	});

	it("should format valid ATOL Driver v10 JSON task payload according to FFD 1.2", () => {
		const sampleReceipt = FiscalReceiptFactory.buildFfd12Receipt({
			patientId: "11111111-1111-1111-1111-111111111111",
			operationType: "income",
			taxationSystem: "usn_income",
			cashierFullName: "Иванова А. С.",
			cashierInn: "770123456789",
			customerContact: "+79261234567",
			cashKopecks: 200000,
			electronicCardKopecks: 300000,
			sbpKopecks: 0,
			prepaidKopecks: 0,
			creditKopecks: 0,
			totalKopecks: 500000,
			taxDeductionSummaryCode: "code_1_standard",
			isCorrection: false,
			addendumConfirmed: false,
			items: [
				{
					name: "Профессиональная гигиена полости рта",
					priceKopecks: 500000,
					quantity: 1,
					amountKopecks: 500000,
					method: "full_payment",
					subject: "service",
					vatRate: "vat_none",
					measure: "piece",
					taxDeductionCode: "code_1_standard",
					medicalServiceCode804n: "A16.07.051",
					isUpsell: false,
					requiresAddendum: false,
					addendumConfirmed: false,
				},
			],
		});

		const atolTask = LanKktDriverService.formatAtolJsonTask(sampleReceipt);

		assert.equal(atolTask.type, "sell");
		assert.equal(atolTask.taxationType, "usnIncome");
		assert.equal((atolTask.operator as { name: string }).name, "Иванова А. С.");
		assert.equal(atolTask.total, 5000);
		assert.equal(Array.isArray(atolTask.items), true);
		assert.equal((atolTask.items as unknown[]).length, 1);
	});
});
