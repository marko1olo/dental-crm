/**
 * @file hardwareMcpBridge.ts
 * @description Локальный MCP-мост (Model Context Protocol Bridge) для медицинского оборудования.
 */

import type { LocalMcpToolInfo } from "./desktopTypes.js";
import { handleAtolCall, handleShtrihCall } from "./mcpFiscalHandlers.js";
import { ALL_LOCAL_MCP_TOOLS } from "./mcpRegistry.js";
import { handleScannerCall, handleTwainCall } from "./mcpSensorHandlers.js";

export class LocalMcpBridgeManager {
	private static instance: LocalMcpBridgeManager;

	private constructor() {}

	public static getInstance(): LocalMcpBridgeManager {
		if (!LocalMcpBridgeManager.instance) {
			LocalMcpBridgeManager.instance = new LocalMcpBridgeManager();
		}
		return LocalMcpBridgeManager.instance;
	}

	public listTools(serverNameFilter?: string): LocalMcpToolInfo[] {
		if (serverNameFilter) {
			return ALL_LOCAL_MCP_TOOLS.filter(
				(t) => t.serverName.toLowerCase() === serverNameFilter.toLowerCase(),
			);
		}
		return [...ALL_LOCAL_MCP_TOOLS];
	}

	public async callTool(
		serverName: string,
		toolName: string,
		args: Record<string, unknown>,
	): Promise<{ success: boolean; data?: unknown; error?: string }> {
		const name = serverName.toLowerCase();
		if (name === "kkt_atol") {
			const res = handleAtolCall(toolName, args);
			if (res) return res;
		}
		if (name === "shtrih_m") {
			const res = handleShtrihCall(toolName, args);
			if (res) return res;
		}
		if (name === "datamatrix_scanner") {
			const res = handleScannerCall(toolName, args);
			if (res) return res;
		}
		if (name === "twain_sensor") {
			const res = handleTwainCall(toolName, args);
			if (res) return res;
		}
		return {
			success: false,
			error: `Инструмент '${toolName}' на сервере MCP '${serverName}' не поддерживается или не зарегистрирован.`,
		};
	}

	public async readResource(
		serverName: string,
		uri: string,
	): Promise<{ success: boolean; uri: string; mimeType: string; content: string; error?: string }> {
		const name = serverName.toLowerCase();
		if (name === "kkt_atol" && uri.includes("status")) {
			return {
				success: true,
				uri,
				mimeType: "application/json",
				content: JSON.stringify({ model: "ATOL 25F", status: "READY", fnState: "ACTIVE", cashDrawerOpen: false }),
			};
		}
		if (name === "datamatrix_scanner" && uri.includes("buffer")) {
			return { success: true, uri, mimeType: "text/plain", content: "010460123456789021AB1234XYZ" };
		}
		return { success: false, uri, mimeType: "text/plain", content: "", error: `Ресурс '${uri}' на сервере '${serverName}' не найден.` };
	}
}

export const localMcpBridge = LocalMcpBridgeManager.getInstance();
