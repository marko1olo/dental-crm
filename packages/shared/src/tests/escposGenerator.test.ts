/**
 * @dental/shared/tests — ESC/POS Binary Buffer & Russian CP866 Generator Unit Tests
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildEscPosAppointmentTicketBuffer,
	buildEscPosBarcode128Buffer,
	buildEscPosFiscalReceiptBuffer,
	buildEscPosQrCodeBuffer,
	decodeCp866,
	encodeCp866,
	ESC_POS_COMMANDS,
	EscPosBufferBuilder,
} from "../hardware/escposGenerator.js";

describe("ESC/POS Binary Buffer & CP866 Engine Suite", () => {
	it("1. Russian CP866 character table encoding and decoding round-trip", () => {
		const text = "Стоматологическая клиника ДЕНТЕ №1 — Лечение кариеса 24 500 ₽ (134°C × 5 мин «Стерильно»)";
		const encoded = encodeCp866(text);

		assert.ok(encoded instanceof Uint8Array);
		assert.ok(encoded.length > 0);

		// Verify specific byte codes
		// 'А' -> 0x80
		const capA = encodeCp866("А");
		assert.equal(capA[0], 0x80);

		// 'п' -> 0xAF
		const smallP = encodeCp866("п");
		assert.equal(smallP[0], 0xaf);

		// 'р' -> 0xE0
		const smallR = encodeCp866("р");
		assert.equal(smallR[0], 0xe0);

		// 'я' -> 0xEF
		const smallYa = encodeCp866("я");
		assert.equal(smallYa[0], 0xef);

		// 'Ё' -> 0xF0
		const capYo = encodeCp866("Ё");
		assert.equal(capYo[0], 0xf0);

		// 'ё' -> 0xF1
		const smallYo = encodeCp866("ё");
		assert.equal(smallYo[0], 0xf1);

		// '№' -> 0xFC
		const numSign = encodeCp866("№");
		assert.equal(numSign[0], 0xfc);

		// '°' (Degree) -> 0xF8
		const degree = encodeCp866("°");
		assert.equal(degree[0], 0xf8);

		// '₽' (Ruble) -> 0xE0 (Russian small 'р')
		const ruble = encodeCp866("₽");
		assert.equal(ruble[0], 0xe0);

		// Quotes « » -> '"' (0x22)
		const quotes = encodeCp866("«»");
		assert.equal(quotes[0], 0x22);
		assert.equal(quotes[1], 0x22);

		// Decoding roundtrip
		const decoded = decodeCp866(encoded);
		assert.ok(decoded.includes("Стоматологическая"));
		assert.ok(decoded.includes("ДЕНТЕ"));
		assert.ok(decoded.includes("№1"));
		assert.ok(decoded.includes("24 500"));
	});

	it("2. Fluent EscPosBufferBuilder generates valid command streams", () => {
		const builder = new EscPosBufferBuilder(58);
		builder
			.init()
			.align("center")
			.doubleBoth(true)
			.line("ООО «ДЕНТЕ»")
			.doubleBoth(false)
			.bold(true)
			.line("ЧЕК ПРИХОДА")
			.bold(false)
			.align("left")
			.twoColumns("Консультация:", "1500.00 ₽")
			.feed(2)
			.cut(true);

		const buffer = builder.build();
		assert.ok(buffer instanceof Uint8Array);
		assert.ok(buffer.length > 20);

		// Check ESC @ init (0x1B, 0x40)
		assert.equal(buffer[0], 0x1b);
		assert.equal(buffer[1], 0x40);

		// Check ESC t 17 CP866 (0x1B, 0x74, 0x11)
		assert.equal(buffer[2], 0x1b);
		assert.equal(buffer[3], 0x74);
		assert.equal(buffer[4], 0x11);

		// Check paper cut command at the end (0x1D, 0x56, 0x01)
		assert.equal(buffer[buffer.length - 3], 0x1d);
		assert.equal(buffer[buffer.length - 2], 0x56);
		assert.equal(buffer[buffer.length - 1], 0x01);
	});

	it("3. EscPosBufferBuilder multi-column formatting and table row alignment", () => {
		const builder = new EscPosBufferBuilder(80); // 48 chars
		builder.tableRow([
			{ text: "1. Пломба", width: 24, align: "left" },
			{ text: "1 шт", width: 10, align: "center" },
			{ text: "4500.00 ₽", width: 14, align: "right" },
		]);

		const buffer = builder.build();
		const decoded = decodeCp866(buffer);
		assert.ok(decoded.includes("Пломба"));
		assert.ok(decoded.includes("4500.00"));
	});

	it("4. 2D QR Code generator builds Model 2 GS ( k commands", () => {
		const qrPayload = "t=20260901T180000&s=15000.00&fn=9960440302145896&i=1042&fp=3948572810&n=1";
		const qrBuffer = buildEscPosQrCodeBuffer(qrPayload, {
			moduleSize: 4,
			errorCorrection: "M",
			centerAlign: true,
		});

		assert.ok(qrBuffer instanceof Uint8Array);
		assert.ok(qrBuffer.length > qrPayload.length);

		// Center align check
		assert.equal(qrBuffer[0], 0x1b);
		assert.equal(qrBuffer[1], 0x61);
		assert.equal(qrBuffer[2], 0x01);

		// GS ( k Model 2 check (0x1D, 0x28, 0x6B)
		assert.equal(qrBuffer[3], 0x1d);
		assert.equal(qrBuffer[4], 0x28);
		assert.equal(qrBuffer[5], 0x6b);
	});

	it("5. 1D Barcode 128 generator builds GS k commands with Code Set B prefix", () => {
		const barcode = buildEscPosBarcode128Buffer("VISIT-1042-PAT-99", {
			heightDots: 64,
			moduleWidth: 2,
			hriPosition: 2,
			centerAlign: true,
		});

		assert.ok(barcode instanceof Uint8Array);
		// GS h 64 (height)
		assert.equal(barcode[3], 0x1d);
		assert.equal(barcode[4], 0x68);
		assert.equal(barcode[5], 64);
	});

	it("6. buildEscPosFiscalReceiptBuffer generates full 54-FZ compliant receipt", () => {
		const receiptBuffer = buildEscPosFiscalReceiptBuffer({
			clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
			cashierFullName: "Иванова А. С.",
			cashierInn: "770123456789",
			customerContact: "+7 (999) 111-22-33",
			operationType: "income",
			items: [
				{
					name: "Лечение пульпита (FDI 26)",
					priceRub: 8500.0,
					quantity: 1,
					amountRub: 8500.0,
					medicalServiceCode804n: "A16.07.002.001",
				},
				{
					name: "Анестезия Ультракаин Д-С",
					priceRub: 900.0,
					quantity: 1,
					amountRub: 900.0,
					markingCode: "010460123456789021ABC12345919293",
				},
			],
			totalRub: 9400.0,
			electronicRub: 9400.0,
			fnSerial: "9960440302145896",
			fiscalDocNum: "10042",
			fiscalSign: "3948572810",
			paperWidthMm: 58,
			autoCut: true,
		});

		assert.ok(receiptBuffer instanceof Uint8Array);
		assert.ok(receiptBuffer.length > 200);

		const decoded = decodeCp866(receiptBuffer);
		assert.ok(decoded.includes("ДЕНТЕ СТОМАТОЛОГИЯ"));
		assert.ok(decoded.includes("КАССОВЫЙ ЧЕК / ПРИХОД (54-ФЗ)"));
		assert.ok(decoded.includes("Лечение пульпита"));
		assert.ok(decoded.includes("A16.07.002.001"));
		assert.ok(decoded.includes("Ультракаин"));
		assert.ok(decoded.includes("ИТОГ: 9400.00"));
		assert.ok(decoded.includes("БЕЗНАЛИЧНЫМИ"));
		assert.ok(decoded.includes("ФН: 9960440302145896"));
		assert.ok(decoded.includes("ФД: 10042"));
		assert.ok(decoded.includes("ФПД: 3948572810"));
	});

	it("7. buildEscPosAppointmentTicketBuffer generates doctor visit & queue slip", () => {
		const ticketBuffer = buildEscPosAppointmentTicketBuffer({
			clinicName: "DENTE КЛИНИКА",
			ticketNumber: "A-042",
			patientFullName: "Смирнов Алексей Викторович",
			doctorFullName: "Барабаш С. В.",
			doctorSpecialtyRu: "Стоматолог-ортопед",
			cabinetName: "Кабинет №3 (Ортопедия)",
			appointmentDateRu: "02.09.2026",
			appointmentTimeRu: "14:30",
			toothCodes: ["11", "21", "22"],
			plannedProcedures: ["Препарирование под циркониевую коронку", "Снятие 3D оптического слепка"],
			checkInQrPayload: "DENTE:CHECKIN:vis-1042-pat-99",
			note: "Пациент с аллергией на пенициллин",
			paperWidthMm: 58,
			autoCut: true,
		});

		assert.ok(ticketBuffer instanceof Uint8Array);
		assert.ok(ticketBuffer.length > 150);

		const decoded = decodeCp866(ticketBuffer);
		assert.ok(decoded.includes("ТАЛОН ПРИЕМА"));
		assert.ok(decoded.includes("A-042"));
		assert.ok(decoded.includes("Смирнов Алексей Викторович"));
		assert.ok(decoded.includes("Барабаш С. В."));
		assert.ok(decoded.includes("Кабинет №3"));
		assert.ok(decoded.includes("14:30"));
		assert.ok(decoded.includes("11, 21, 22"));
		assert.ok(decoded.includes("циркониевую коронку"));
		assert.ok(decoded.includes("QR-КОД"));
	});
});
