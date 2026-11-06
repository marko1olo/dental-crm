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

	it("should format valid ATOL Driver v10 shift payloads for openShift, closeShift, and reportX", () => {
		const openTask = LanKktDriverService.formatAtolShiftTask("openShift", {
			name: "Петрова Е. В.",
			vatin: "770123456789",
		});
		assert.equal(openTask.type, "openShift");
		assert.equal((openTask.operator as { name: string; vatin: string }).name, "Петрова Е. В.");
		assert.equal((openTask.operator as { name: string; vatin: string }).vatin, "770123456789");

		const closeTask = LanKktDriverService.formatAtolShiftTask("closeShift", {
			name: "Петрова Е. В.",
		});
		assert.equal(closeTask.type, "closeShift");
		assert.equal((closeTask.operator as { name: string }).name, "Петрова Е. В.");

		const xTask = LanKktDriverService.formatAtolShiftTask("reportX");
		assert.equal(xTask.type, "reportX");
		assert.equal((xTask.operator as { name: string }).name, "Кассир");
	});

	it("should format valid Shtrikh-M shift command packets (0xE0, 0x21, 0x20)", () => {
		const openPacket = LanKktDriverService.formatShtrikhShiftPacket("openShift", 30);
		assert.equal(openPacket[0], 0x02); // STX
		assert.equal(openPacket[2], 0xe0); // Open shift command code

		const closePacket = LanKktDriverService.formatShtrikhShiftPacket("closeShift", 30);
		assert.equal(closePacket[0], 0x02); // STX
		assert.equal(closePacket[2], 0x21); // Z-report command code

		const xPacket = LanKktDriverService.formatShtrikhShiftPacket("reportX", 30);
		assert.equal(xPacket[0], 0x02); // STX
		assert.equal(xPacket[2], 0x20); // X-report command code
	});

	it("should open and close shift with Z-report and X-report on emulator with valid 54-FZ data", async () => {
		const openRes = await LanKktDriverService.openShift(
			{ cashierName: "Иванова А. С.", shiftNumber: 42 },
			{ model: "emulator" },
		);
		assert.equal(openRes.success, true);
		assert.equal(openRes.status, "opened");
		assert.equal(openRes.shiftNumber, 42);
		assert.ok(openRes.fiscalDocumentNumber);

		const xRes = await LanKktDriverService.printXReport(
			{ cashierName: "Иванова А. С.", shiftNumber: 42 },
			{ model: "emulator" },
		);
		assert.equal(xRes.success, true);
		assert.equal(xRes.status, "printed");

		const closeRes = await LanKktDriverService.closeShift(
			{ cashierName: "Иванова А. С.", shiftNumber: 42 },
			{ model: "emulator" },
		);
		assert.equal(closeRes.success, true);
		assert.equal(closeRes.status, "closed");
		assert.equal(closeRes.shiftNumber, 42);
		assert.ok(closeRes.fiscalDocumentNumber);
		assert.ok(closeRes.fiscalSign);
		assert.ok(closeRes.qrString?.startsWith("t="));

		const zRes = await LanKktDriverService.printZReport(
			{ cashierName: "Иванова А. С.", shiftNumber: 43 },
			{ model: "emulator" },
		);
		assert.equal(zRes.success, true);
		assert.equal(zRes.status, "closed");
		assert.equal(zRes.shiftNumber, 43);
	});
});
