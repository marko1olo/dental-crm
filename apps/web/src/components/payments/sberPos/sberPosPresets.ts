/**
 * DENTE Dental CRM — Sberbank POS Terminal Presets & Hardware Profiles
 */

import {
	type SberPosHardwareModel,
	type SberPosTerminalConfig,
	type SberPosTransactionResponse,
} from "./sberPosEngine";

export interface SberPosHardwareProfileInfo {
	readonly id: SberPosHardwareModel;
	readonly modelName: string;
	readonly vendor: string;
	readonly formFactor: "desktop" | "wireless_handheld" | "smart_pos";
	readonly connectionTypes: readonly string[];
	readonly defaultPort: number;
	readonly defaultProtocol: "pilot_nt" | "arcus_d" | "dual_connector" | "sberpay_direct_api";
	readonly supportsFacePay: boolean;
	readonly supportsQrDisplay: boolean;
	readonly supportsContactless: boolean;
	readonly hasIntegratedPrinter: boolean;
	readonly descriptionRu: string;
}

export const SBER_HARDWARE_PROFILES: readonly SberPosHardwareProfileInfo[] = [
	{
		id: "sber_smartpos",
		modelName: "Sber SmartPOS (Android 11 / FacePay)",
		vendor: "ПАО Сбербанк / Эвотор",
		formFactor: "smart_pos",
		connectionTypes: ["Wi-Fi", "4G LTE", "Ethernet"],
		defaultPort: 4000,
		defaultProtocol: "pilot_nt",
		supportsFacePay: true,
		supportsQrDisplay: true,
		supportsContactless: true,
		hasIntegratedPrinter: true,
		descriptionRu: "Флагманский смарт-терминал Сбера с 3D биометрической камерой Оплаты улыбкой и цветным экраном для динамического QR.",
	},
	{
		id: "pax_d230",
		modelName: "PAX D230 (Wireless 4G / Wi-Fi)",
		vendor: "PAX Technology",
		formFactor: "wireless_handheld",
		connectionTypes: ["Wi-Fi 5GHz", "4G LTE / SIM", "Bluetooth"],
		defaultPort: 4000,
		defaultProtocol: "pilot_nt",
		supportsFacePay: false,
		supportsQrDisplay: true,
		supportsContactless: true,
		hasIntegratedPrinter: true,
		descriptionRu: "Компактный беспроводной терминал для мобильного расчета пациентов в кабинетах и на ресепшн.",
	},
	{
		id: "ingenico_move5000",
		modelName: "Ingenico Move / Lane 5000 Color",
		vendor: "Ingenico Group",
		formFactor: "desktop",
		connectionTypes: ["Ethernet (LAN)", "USB DualConnector", "RS-232"],
		defaultPort: 4000,
		defaultProtocol: "dual_connector",
		supportsFacePay: false,
		supportsQrDisplay: true,
		supportsContactless: true,
		hasIntegratedPrinter: true,
		descriptionRu: "Скоростной стационарный POS-терминал с поддержкой протокола DualConnector и моментальной печатью чеков.",
	},
	{
		id: "verifone_vx520",
		modelName: "Verifone VX520 Contactless",
		vendor: "Verifone Systems",
		formFactor: "desktop",
		connectionTypes: ["Ethernet 10/100", "RS-232 COM-порт", "Dial-up"],
		defaultPort: 4000,
		defaultProtocol: "arcus_d",
		supportsFacePay: false,
		supportsQrDisplay: false,
		supportsContactless: true,
		hasIntegratedPrinter: true,
		descriptionRu: "Надежный классический банковский терминал с поддержкой протокола Arcus-D и пин-падов серии 1000SE.",
	},
];

export const DEFAULT_SBER_TERMINAL_CONFIG: SberPosTerminalConfig = {
	terminalId: "19827340",
	merchantId: "981273948192031",
	hostIp: "127.0.0.1",
	hostPort: 4000,
	protocol: "pilot_nt",
	hardwareModel: "sber_smartpos",
	timeoutMs: 45000,
	retryCount: 2,
	clinicName: "СТОМАТОЛОГИЯ «ДЕНТЕ»",
	clinicAddress: "г. Москва, ул. Арбат, д. 24",
	clinicInn: "770412345678",
};

export const SAMPLE_SUCCESS_RESPONSE: SberPosTransactionResponse = {
	success: true,
	responseCode: "00",
	responseMessageRu: "Одобрено: Транзакция успешно проведена и подтверждена банком-эквайером",
	terminalId: "19827340",
	merchantId: "981273948192031",
	rrn: "423891028471",
	authCode: "982310",
	cardHash: "2200********4819",
	cardIssuer: "МИР",
	aid: "A0000006581010",
	tvr: "0000008000",
	amountKop: 1960000,
	transactionDateTime: "22.08.2026 14:35:12",
	operationType: "sale",
	customerSlip: [
		"========================================",
		"         СТОМАТОЛОГИЯ «ДЕНТЕ»",
		"    г. Москва, ул. Арбат, д. 24",
		"          ИНН: 770412345678",
		"----------------------------------------",
		"ТЕРМИНАЛ (TID): 19827340",
		"МЕРЧАНТ  (MID): 981273948192031",
		"ДАТА/ВРЕМЯ:     22.08.2026 14:35:12",
		"ЗАКАЗ №:        CHK-2026-891",
		"----------------------------------------",
		"ОПЕРАЦИЯ:       ОПЛАТА УСЛУГ (БЕЗНАЛИЧНЫЙ РАСЧЕТ)",
		"ПЛАТ. СИСТЕМА:  МИР",
		"КАРТА / СЧЕТ:   2200********4819",
		"СУММА:          19600.00 РУБ.",
		"КОМИССИЯ:       0.00 РУБ.",
		"ИТОГО К ОПЛАТЕ: 19600.00 РУБ.",
		"----------------------------------------",
		"КОД АВТОР. (AUTH): 982310",
		"НОМЕР RRN:         423891028471",
		"EMV AID:           A0000006581010",
		"EMV TVR:           0000008000",
		"----------------------------------------",
		"СТАТУС: [ ОДОБРЕНО / SUCCESS ]",
		"ПОДПИСЬ НЕ ТРЕБУЕТСЯ (ВВЕДЕН ПИН / КРИПТОГРАММА)",
		"",
		"               ЧЕК КЛИЕНТА",
		"         СПАСИБО, ЧТО ВЫБРАЛИ НАС!",
		"========================================",
	].join("\n"),
	merchantSlip: [
		"========================================",
		"         СТОМАТОЛОГИЯ «ДЕНТЕ»",
		"    г. Москва, ул. Арбат, д. 24",
		"          ИНН: 770412345678",
		"----------------------------------------",
		"ТЕРМИНАЛ (TID): 19827340",
		"МЕРЧАНТ  (MID): 981273948192031",
		"ДАТА/ВРЕМЯ:     22.08.2026 14:35:12",
		"ЗАКАЗ №:        CHK-2026-891",
		"----------------------------------------",
		"ОПЕРАЦИЯ:       ОПЛАТА УСЛУГ (БЕЗНАЛИЧНЫЙ РАСЧЕТ)",
		"ПЛАТ. СИСТЕМА:  МИР",
		"КАРТА / СЧЕТ:   2200********4819",
		"СУММА:          19600.00 РУБ.",
		"КОМИССИЯ:       0.00 РУБ.",
		"ИТОГО К ОПЛАТЕ: 19600.00 РУБ.",
		"----------------------------------------",
		"КОД АВТОР. (AUTH): 982310",
		"НОМЕР RRN:         423891028471",
		"EMV AID:           A0000006581010",
		"EMV TVR:           0000008000",
		"----------------------------------------",
		"СТАТУС: [ ОДОБРЕНО / SUCCESS ]",
		"ПОДПИСЬ КАССИРА: _______________________",
		"",
		"   ЧЕК ТЕРМИНАЛА (КОПИЯ ДЛЯ БУХГАЛТЕРИИ)",
		"         СПАСИБО, ЧТО ВЫБРАЛИ НАС!",
		"========================================",
	].join("\n"),
};

export const SAMPLE_FAILURE_RESPONSE: SberPosTransactionResponse = {
	success: false,
	responseCode: "51",
	responseMessageRu: "Недостаточно средств: На счете карты недостаточно денежных средств для оплаты услуги",
	terminalId: "19827340",
	merchantId: "981273948192031",
	rrn: "423891028472",
	authCode: "000000",
	cardHash: "2200********4819",
	cardIssuer: "МИР",
	aid: "A0000006581010",
	tvr: "0000008000",
	amountKop: 1960000,
	transactionDateTime: "22.08.2026 14:36:00",
	operationType: "sale",
	customerSlip: "",
	merchantSlip: "",
};
