/**
 * @file mcpRegistry.ts
 * @description Реестр инструментов локальных серверов MCP клиники (Атол, Штрих-М, Честный Знак, TWAIN).
 */

import type { LocalMcpToolInfo } from "./desktopTypes.js";

export const ALL_LOCAL_MCP_TOOLS: readonly LocalMcpToolInfo[] = [
	{
		serverName: "kkt_atol",
		toolName: "get_kkt_status",
		description: "Опрос статуса фискального регистратора Атол (смена, бумага, ФН, связь с ОФД)",
		parameters: { type: "object", properties: { comPort: { type: "string" } } },
	},
	{
		serverName: "kkt_atol",
		toolName: "open_shift",
		description: "Открытие фискальной смены на кассе Атол",
		parameters: {
			type: "object",
			properties: { cashierName: { type: "string" } },
			required: ["cashierName"],
		},
	},
	{
		serverName: "kkt_atol",
		toolName: "print_receipt",
		description: "Фискализация чека 54-ФЗ на кассе Атол (нал/безнал/СБП/аванс)",
		parameters: {
			type: "object",
			properties: {
				items: { type: "array" },
				totalKopecks: { type: "number" },
				paymentType: { type: "string", enum: ["cash", "card", "sbp", "advance"] },
			},
			required: ["items", "totalKopecks", "paymentType"],
		},
	},
	{
		serverName: "kkt_atol",
		toolName: "close_z_report",
		description: "Закрытие смены с гашением (Z-отчет) на кассе Атол",
		parameters: { type: "object", properties: {} },
	},
	{
		serverName: "shtrih_m",
		toolName: "get_device_metrics",
		description: "Снятие показателей питания, напряжения и связи кассы Штрих-М",
		parameters: { type: "object", properties: { baudRate: { type: "number" } } },
	},
	{
		serverName: "shtrih_m",
		toolName: "fiscal_sale",
		description: "Пробитие чека продажи по протоколу Штрих-М",
		parameters: {
			type: "object",
			properties: { totalRub: { type: "number" } },
			required: ["totalRub"],
		},
	},
	{
		serverName: "datamatrix_scanner",
		toolName: "parse_chestny_znak",
		description: "Парсинг штрихкода GS1 DataMatrix лекарств и анестетиков (GTIN, серийный номер)",
		parameters: {
			type: "object",
			properties: { rawBarcode: { type: "string" } },
			required: ["rawBarcode"],
		},
	},
	{
		serverName: "datamatrix_scanner",
		toolName: "get_last_scanned_barcode",
		description: "Получение последнего события сканирования из буфера HID/USB",
		parameters: { type: "object", properties: {} },
	},
	{
		serverName: "twain_sensor",
		toolName: "list_devices",
		description: "Опрос подключенных TWAIN радиовизиографов и сканеров",
		parameters: { type: "object", properties: {} },
	},
	{
		serverName: "twain_sensor",
		toolName: "acquire_frame",
		description: "Захват сырого радиовизиографического кадра с USB-датчика",
		parameters: {
			type: "object",
			properties: { deviceId: { type: "string" } },
			required: ["deviceId"],
		},
	},
];
