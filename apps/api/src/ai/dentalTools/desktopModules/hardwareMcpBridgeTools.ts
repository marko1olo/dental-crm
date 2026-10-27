/**
 * @file hardwareMcpBridgeTools.ts
 * @description Инструменты MCP-моста для работы с кассами 54-ФЗ, сканерами DataMatrix и TWAIN.
 */

import { z } from "zod";
import {
	createOpenAIToolDefinition,
	type DentalToolContext,
	type DentalToolEntry,
} from "../types.js";
import {
	checkIsLocalWorkstation,
	DESKTOP_DENIED_RESPONSE,
} from "./desktopSecurity.js";
import { localMcpBridge } from "./hardwareMcpBridge.js";

export const callLocalMcpToolSchema = z.object({
	serverName: z.string().min(1).describe("Имя MCP сервера оборудования"),
	toolName: z.string().min(1).describe("Имя инструмента на сервере MCP"),
	arguments: z.record(z.unknown()).default({}).describe("Входные аргументы вызова инструмента"),
});
export type CallLocalMcpToolInput = z.infer<typeof callLocalMcpToolSchema>;

export async function handleCallLocalMcpTool(args: CallLocalMcpToolInput, context: DentalToolContext) {
	if (!checkIsLocalWorkstation(context)) return DESKTOP_DENIED_RESPONSE;
	try {
		const res = await localMcpBridge.callTool(args.serverName, args.toolName, args.arguments);
		return { ...res, serverName: args.serverName, toolName: args.toolName };
	} catch (err) {
		return { success: false, serverName: args.serverName, toolName: args.toolName, error: `Ошибка MCP-моста: ${(err as Error).message}` };
	}
}

export const callLocalMcpToolTool: DentalToolEntry<typeof callLocalMcpToolSchema> = {
	name: "call_local_mcp_tool",
	description:
		"Вызов инструментов локальных MCP-серверов медицинского оборудования (кассы 54-ФЗ, сканеры DataMatrix, TWAIN) (desktop_native).",
	schema: callLocalMcpToolSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition("call_local_mcp_tool", "Вызов инструментов локальных MCP-серверов.", callLocalMcpToolSchema),
	handler: handleCallLocalMcpTool,
};

export const listLocalMcpToolsSchema = z.object({
	serverName: z.string().optional().describe("Опциональная фильтрация по имени MCP-сервера"),
});
export type ListLocalMcpToolsInput = z.infer<typeof listLocalMcpToolsSchema>;

export async function handleListLocalMcpTools(args: ListLocalMcpToolsInput, context: DentalToolContext) {
	if (!checkIsLocalWorkstation(context)) return DESKTOP_DENIED_RESPONSE;
	const tools = localMcpBridge.listTools(args.serverName);
	return { success: true, totalTools: tools.length, tools, message: `Доступно ${tools.length} инструментов локальных MCP-серверов.` };
}

export const listLocalMcpToolsTool: DentalToolEntry<typeof listLocalMcpToolsSchema> = {
	name: "list_local_mcp_tools",
	description: "Список доступных инструментов локальных серверов MCP (кассы 54-ФЗ, сканеры, визиографы) (desktop_native).",
	schema: listLocalMcpToolsSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition("list_local_mcp_tools", "Получение списка инструментов локальных серверов MCP.", listLocalMcpToolsSchema),
	handler: handleListLocalMcpTools,
};

export const readLocalMcpResourceSchema = z.object({
	serverName: z.string().min(1).describe("Имя MCP сервера оборудования"),
	uri: z.string().min(1).describe("URI запрашиваемого ресурса"),
});
export type ReadLocalMcpResourceInput = z.infer<typeof readLocalMcpResourceSchema>;

export async function handleReadLocalMcpResource(args: ReadLocalMcpResourceInput, context: DentalToolContext) {
	if (!checkIsLocalWorkstation(context)) return DESKTOP_DENIED_RESPONSE;
	return await localMcpBridge.readResource(args.serverName, args.uri);
}

export const readLocalMcpResourceTool: DentalToolEntry<typeof readLocalMcpResourceSchema> = {
	name: "read_local_mcp_resource",
	description: "Чтение телеметрии и ресурсов с локальных MCP-серверов медицинского оборудования (desktop_native).",
	schema: readLocalMcpResourceSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition("read_local_mcp_resource", "Чтение телеметрии локального MCP-ресурса оборудования.", readLocalMcpResourceSchema),
	handler: handleReadLocalMcpResource,
};
