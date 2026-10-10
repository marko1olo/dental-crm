/**
 * @dental/shared/hardware/escpos — Layer 3: Fiscal, Clinical & Payment Thermal Receipt Formatters
 *
 * Implements pre-built thermal slip templates:
 * 1. 54-FZ Fiscal Receipt (Rubles) with FNS QR Code, tax breakdown, and 804n medical codes.
 * 2. 54-FZ Kopeck-Exact Fiscal Receipt (avoids floating point rounding drifts).
 * 3. Doctor Appointment & Queue Ticket (chairside / kiosk check-in slip).
 * 4. SBP Dynamic QR Payment Slip (instant Fast Payment System voucher).
 * 5. Hardware Diagnostics & Self-Test Pattern Receipt.
 */

import { EscPosBufferBuilder } from "./byteCommands.js";
import type {
	EscPosAppointmentTicketPayload,
	EscPosFiscalReceiptItem,
	EscPosFiscalReceiptPayload,
	EscPosKopeckReceiptPayload,
	EscPosSbpPaymentPayload,
	EscPosTestPatternOptions,
} from "./types.js";

// ============================================================================
// 1. 54-FZ FISCAL RECEIPT BUFFER (RUBLES)
// ============================================================================

/**
 * Builds standard 54-FZ compliant thermal receipt binary buffer with CP866 encoding.
 */
export function buildEscPosFiscalReceiptBuffer(
	payload: EscPosFiscalReceiptPayload,
): Uint8Array {
	const paperWidth = payload.paperWidthMm ?? 58;
	const builder = new EscPosBufferBuilder(paperWidth);

	builder.init();

	// 1. Clinic Header
	builder.align("center");
	builder.doubleBoth(true);
	builder.line(payload.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»");
	builder.doubleBoth(false);

	builder.line(payload.clinicAddress || "г. Москва, Ломоносовский пр-т, 24");
	if (payload.inn) {
		builder.line(`ИНН: ${payload.inn}${payload.kpp ? ` КПП: ${payload.kpp}` : ""}`);
	}
	builder.line(`Лицензия: № ${payload.licenseNumber || "ЛО41-01137-77/00368421"}`);
	builder.separator("-");

	// 2. Receipt Operation Title
	builder.bold(true);
	if (payload.operationType === "income_return") {
		builder.line("КАССОВЫЙ ЧЕК / ВОЗВРАТ ПРИХОДА");
	} else {
		builder.line("КАССОВЫЙ ЧЕК / ПРИХОД (54-ФЗ)");
	}
	builder.bold(false);

	const dateObj =
		payload.timestamp instanceof Date
			? payload.timestamp
			: typeof payload.timestamp === "string"
				? new Date(payload.timestamp)
				: new Date();
	const dateFormatted = `${dateObj.toLocaleDateString("ru-RU")} ${dateObj.toLocaleTimeString("ru-RU")}`;

	builder.align("left");
	builder.line(`Дата: ${dateFormatted}`);
	builder.line(`Кассир: ${payload.cashierFullName}`);
	if (payload.cashierInn) {
		builder.line(`ИНН кассира: ${payload.cashierInn}`);
	}
	if (payload.customerContact) {
		builder.line(`Покупатель: ${payload.customerContact}`);
	}
	builder.separator("-");

	// 3. Line Items
	payload.items.forEach((item, idx) => {
		builder.bold(true);
		builder.line(`${idx + 1}. ${item.name}`);
		builder.bold(false);

		if (item.medicalServiceCode804n) {
			builder.line(`   Код 804н: ${item.medicalServiceCode804n}`);
		}
		if (item.markingCode) {
			builder.line(`   [М] DataMatrix: ${item.markingCode.slice(0, 16)}...`);
		}

		const qtyStr = `${item.quantity} шт. x ${item.priceRub.toFixed(2)}`;
		const totalStr = `${item.amountRub.toFixed(2)} ₽`;
		builder.twoColumns(`   ${qtyStr}`, totalStr);
	});

	builder.separator("-");

	// 4. Totals & Payment Methods
	builder.align("right");
	builder.doubleBoth(true);
	builder.line(`ИТОГ: ${payload.totalRub.toFixed(2)} ₽`);
	builder.doubleBoth(false);

	builder.align("left");
	if (payload.electronicRub && payload.electronicRub > 0) {
		builder.twoColumns("БЕЗНАЛИЧНЫМИ (КАРТА):", `${payload.electronicRub.toFixed(2)} ₽`);
	}
	if (payload.cashRub && payload.cashRub > 0) {
		builder.twoColumns("НАЛИЧНЫМИ:", `${payload.cashRub.toFixed(2)} ₽`);
	}
	if (payload.sbpRub && payload.sbpRub > 0) {
		builder.twoColumns("СБП QR (0.7%):", `${payload.sbpRub.toFixed(2)} ₽`);
	}
	if (payload.prepaidRub && payload.prepaidRub > 0) {
		builder.twoColumns("ПРЕДОПЛАТА (ДЕПОЗИТ):", `${payload.prepaidRub.toFixed(2)} ₽`);
	}

	builder.twoColumns("СНО: УСН Доходы", "Без НДС (0%)");
	builder.separator("-");

	// 5. Fiscal Attributes & FNS QR Code
	const fn = payload.fnSerial || "9960440302145896";
	const fd = payload.fiscalDocNum || "10042";
	const fpd = payload.fiscalSign || "1234567890";

	builder.line(`ФН: ${fn}`);
	builder.line(`ФД: ${fd}   ФПД: ${fpd}`);
	builder.line("Сайт ФНС: www.nalog.gov.ru");

	const qrStr =
		payload.fnsQrString ||
		`t=${dateObj.toISOString().slice(0, 19).replace(/[-:T]/g, "")}&s=${payload.totalRub.toFixed(2)}&fn=${fn}&i=${fd}&fp=${fpd}&n=${payload.operationType === "income_return" ? "2" : "1"}`;

	builder.feed(1);
	builder.align("center");
	builder.qrCode(qrStr, { moduleSize: paperWidth === 80 ? 5 : 4, centerAlign: true });
	builder.feed(1);

	builder.line("Спасибо за доверие!");
	builder.line("Здоровья вашим зубам!");

	// 6. Paper Feed & Cut
	builder.feed(4);
	if (payload.autoCut !== false) {
		builder.cut(true);
	}

	return builder.build();
}

// ============================================================================
// 2. DOCTOR APPOINTMENT & QUEUE TICKET BUFFER
// ============================================================================

/**
 * Builds Doctor Appointment / Patient Queue Slip thermal ticket with CP866 encoding.
 * Used on iPad / Mobile terminals in dental operatory and reception.
 */
export function buildEscPosAppointmentTicketBuffer(
	payload: EscPosAppointmentTicketPayload,
): Uint8Array {
	const paperWidth = payload.paperWidthMm ?? 58;
	const builder = new EscPosBufferBuilder(paperWidth);

	builder.init();

	// 1. Clinic Header
	builder.align("center");
	builder.bold(true);
	builder.line(payload.clinicName || "DENTE СТОМАТОЛОГИЯ");
	builder.bold(false);
	builder.line("ТАЛОН ПРИЕМА / ПАМЯТКА");
	builder.separator("=");

	// 2. Large Ticket Number
	builder.align("center");
	builder.doubleBoth(true);
	builder.line(payload.ticketNumber);
	builder.doubleBoth(false);
	builder.separator("-");

	// 3. Appointment Details
	builder.align("left");
	builder.twoColumns("Кабинет:", payload.cabinetName);
	builder.twoColumns("Дата приема:", payload.appointmentDateRu);
	builder.twoColumns("Время приема:", payload.appointmentTimeRu);
	builder.separator("-");

	// 4. Doctor & Patient
	builder.bold(true);
	builder.line(`Врач: ${payload.doctorFullName}`);
	builder.bold(false);
	if (payload.doctorSpecialtyRu) {
		builder.line(`Специальность: ${payload.doctorSpecialtyRu}`);
	}
	builder.line(`Пациент: ${payload.patientFullName}`);

	if (payload.toothCodes && payload.toothCodes.length > 0) {
		builder.line(`Зубы (FDI): ${payload.toothCodes.join(", ")}`);
	}

	if (payload.plannedProcedures && payload.plannedProcedures.length > 0) {
		builder.separator("-");
		builder.bold(true);
		builder.line("Планируемые процедуры:");
		builder.bold(false);
		payload.plannedProcedures.forEach((proc, i) => {
			builder.line(`${i + 1}. ${proc}`);
		});
	}

	if (payload.note) {
		builder.separator("-");
		builder.line(`Примечание: ${payload.note}`);
	}

	// 5. Express Check-in 2D QR Code / 1D Barcode
	if (payload.checkInQrPayload) {
		builder.separator("-");
		builder.align("center");
		builder.line("QR-КОД ДЛЯ РЕГИСТРАЦИИ В КЛИНИКЕ:");
		builder.feed(1);
		builder.qrCode(payload.checkInQrPayload || "DENTE:CHECKIN", {
			moduleSize: paperWidth === 80 ? 5 : 4,
			centerAlign: true,
		});
		builder.feed(1);
	} else if (payload.barcode128Value) {
		builder.separator("-");
		builder.align("center");
		builder.barcode128(payload.barcode128Value, { centerAlign: true });
		builder.feed(1);
	}

	builder.align("center");
	builder.line("Пожалуйста, приходите за 10 мин до начала");
	if (payload.clinicPhone) {
		builder.line(`тел. клиники: ${payload.clinicPhone}`);
	}

	// 6. Paper Feed & Cut
	builder.feed(4);
	if (payload.autoCut !== false) {
		builder.cut(true);
	}

	return builder.build();
}

// ============================================================================
// 3. SBP (СБП) DYNAMIC QR PAYMENT BUFFER
// ============================================================================

/**
 * Builds an ESC/POS slip with dynamic SBP QR code for fast chairside payment.
 */
export function buildEscPosSbpPaymentBuffer(payload: EscPosSbpPaymentPayload): Uint8Array {
	const paperWidth = payload.paperWidthMm ?? 58;
	const builder = new EscPosBufferBuilder(paperWidth);

	builder.init();

	// 1. Header
	builder.align("center");
	builder.bold(true);
	builder.line(payload.clinicName || "DENTE СТОМАТОЛОГИЯ");
	builder.bold(false);
	builder.line("ОПЛАТА ПО QR-КОДУ (СБП)");
	builder.separator("=");

	// 2. Bill & Patient Details
	builder.align("left");
	if (payload.billNumber) {
		builder.twoColumns("Счет №:", payload.billNumber);
	}
	if (payload.doctorFullName) {
		builder.line(`Врач: ${payload.doctorFullName}`);
	}
	if (payload.patientFullName) {
		builder.line(`Пациент: ${payload.patientFullName}`);
	}
	if (payload.appointmentSummary) {
		builder.line(`Услуги: ${payload.appointmentSummary}`);
	}
	builder.separator("-");

	// 3. Exact Total in Rubles & Kopecks
	const rubles = (payload.totalKopecks / 100).toFixed(2);
	builder.align("right");
	builder.doubleBoth(true);
	builder.line(`К ОПЛАТЕ: ${rubles} ₽`);
	builder.doubleBoth(false);
	builder.separator("-");

	// 4. SBP QR Code
	builder.align("center");
	builder.feed(1);
	builder.qrCode(payload.sbpQrUrl, {
		moduleSize: paperWidth === 80 ? 6 : 5,
		centerAlign: true,
	});
	builder.feed(1);

	builder.bold(true);
	builder.line("ОТСКАНИРУЙТЕ В ПРИЛОЖЕНИИ БАНКА");
	builder.bold(false);
	builder.line("Система Быстрых Платежей (СБП)");
	builder.line("Комиссия для пациента: 0%");

	if (payload.expiresAtIso) {
		const expDate = new Date(payload.expiresAtIso);
		if (!Number.isNaN(expDate.getTime())) {
			builder.line(`Действителен до: ${expDate.toLocaleTimeString("ru-RU")}`);
		}
	}

	if (payload.clinicPhone) {
		builder.separator("-");
		builder.line(`Справки по тел.: ${payload.clinicPhone}`);
	}

	// 5. Paper Feed & Cut
	builder.feed(4);
	if (payload.autoCut !== false) {
		builder.cut(true);
	}

	return builder.build();
}

// ============================================================================
// 4. KOPECK-EXACT 54-FZ RECEIPT BUFFER
// ============================================================================

/**
 * Builds a kopeck-exact 54-FZ thermal receipt buffer to prevent floating point inaccuracies.
 */
export function buildEscPosKopeckReceiptBuffer(payload: EscPosKopeckReceiptPayload): Uint8Array {
	const convertedItems: EscPosFiscalReceiptItem[] = payload.items.map((item) => ({
		name: item.name,
		priceRub: item.priceKopecks / 100,
		quantity: item.quantity,
		amountRub: item.amountKopecks / 100,
		medicalServiceCode804n: item.medicalServiceCode804n,
		markingCode: item.markingCode,
	}));

	return buildEscPosFiscalReceiptBuffer({
		clinicName: payload.clinicName,
		clinicAddress: payload.clinicAddress,
		inn: payload.inn,
		kpp: payload.kpp,
		licenseNumber: payload.licenseNumber,
		cashierFullName: payload.cashierFullName,
		cashierInn: payload.cashierInn,
		customerContact: payload.customerContact,
		operationType: payload.operationType,
		items: convertedItems,
		totalRub: payload.totalKopecks / 100,
		cashRub: payload.cashKopecks !== undefined ? payload.cashKopecks / 100 : undefined,
		electronicRub: payload.electronicKopecks !== undefined ? payload.electronicKopecks / 100 : undefined,
		sbpRub: payload.sbpKopecks !== undefined ? payload.sbpKopecks / 100 : undefined,
		prepaidRub: payload.prepaidKopecks !== undefined ? payload.prepaidKopecks / 100 : undefined,
		fnSerial: payload.fnSerial,
		fiscalDocNum: payload.fiscalDocNum,
		fiscalSign: payload.fiscalSign,
		fnsQrString: payload.fnsQrString,
		paperWidthMm: payload.paperWidthMm,
		autoCut: payload.autoCut,
		timestamp: payload.timestamp,
	});
}

// ============================================================================
// 5. HARDWARE TEST PATTERN GENERATOR
// ============================================================================

/**
 * Builds a comprehensive hardware test pattern receipt for ESC/POS thermal printers.
 */
export function buildEscPosHardwareTestPatternBuffer(
	options: EscPosTestPatternOptions = {},
): Uint8Array {
	const paperWidth = options.paperWidthMm ?? 58;
	const builder = new EscPosBufferBuilder(paperWidth);

	builder.init();

	// 1. Header
	builder.align("center");
	builder.doubleBoth(true);
	builder.line("DENTE CRM");
	builder.doubleBoth(false);
	builder.bold(true);
	builder.line("ТЕСТ ТЕРМОПРИНТЕРА ESC/POS");
	builder.bold(false);
	builder.separator("=");

	// 2. Hardware Info
	builder.align("left");
	builder.twoColumns("Устройство:", options.deviceName || "Thermal ESC/POS");
	builder.twoColumns("Интерфейс:", options.interfaceName || "USB / TCP 9100");
	builder.twoColumns("Ширина ленты:", `${paperWidth} мм`);
	builder.twoColumns("Кодовая страница:", "CP866 (Russian)");
	const now = new Date();
	builder.twoColumns("Время теста:", `${now.toLocaleDateString("ru-RU")} ${now.toLocaleTimeString("ru-RU")}`);
	builder.separator("-");

	// 3. Russian Cyrillic CP866 Alphabet Verification
	builder.line("ТЕСТ РУССКОГО ШРИФТА CP866:");
	builder.line("АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ");
	builder.line("абвгдеёжзийклмнопрстуфхцчшщъыьэюя");
	builder.line("Символы: № !\"#$%&'()*+,-./0123456789 ₽");
	builder.separator("-");

	// 4. Styles Verification
	builder.line("СТИЛИ ПЕЧАТИ:");
	builder.bold(true);
	builder.line("• Жирный текст (Bold ON)");
	builder.bold(false);
	builder.underline(1);
	builder.line("• Подчеркнутый текст (Underline ON)");
	builder.underline(0);
	builder.invert(true);
	builder.line("• Инверсный белый на черном (Invert)");
	builder.invert(false);
	builder.doubleHeight(true);
	builder.line("• Двойная высота (2x Height)");
	builder.doubleHeight(false);
	builder.doubleWidth(true);
	builder.line("• Двойная ширина (2x Width)");
	builder.doubleWidth(false);
	builder.separator("-");

	// 5. 2D QR Code & 1D Barcode
	builder.align("center");
	builder.line("2D QR-КОД (СБП / 54-ФЗ):");
	builder.feed(1);
	builder.qrCode("https://dente.clinic/hardware/test", {
		moduleSize: paperWidth === 80 ? 5 : 4,
		centerAlign: true,
	});
	builder.feed(1);

	builder.line("1D ШТРИХКОД (CODE 128):");
	builder.barcode128("DENTE-TEST-01", { centerAlign: true, heightDots: 48 });
	builder.feed(1);

	// 6. Test Result
	builder.align("center");
	builder.bold(true);
	builder.line("ТЕСТ УСПЕШНО ЗАВЕРШЕН [OK]");
	builder.bold(false);
	builder.line("Оборудование готово к работе");

	// 7. Cut
	builder.feed(4);
	builder.cut(true);

	return builder.build();
}
