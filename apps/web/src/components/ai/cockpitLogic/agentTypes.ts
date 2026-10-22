/**
 * agentTypes.ts — Legacy agent chat message and tool interfaces
 */

import type { ToolMeta } from "./toolMeta";

export interface ToolCallItem {
	name: string;
	title: string;
	isWorkstation?: boolean;
	iconName?: ToolMeta["iconName"];
	args?: Record<string, unknown> | undefined;
	status: "running" | "done" | "failed";
	result?: unknown;
}

export interface AgentChatMessage {
	id: string;
	role: "user" | "assistant" | "system";
	text: string;
	streaming?: boolean | undefined;
	toolCalls?: ToolCallItem[] | undefined;
	timestamp: string;
}

export interface DentalAgentCockpitProps {
	isOpen?: boolean | undefined;
	onClose?: (() => void) | undefined;
	initialPatientId?: string | null | undefined;
	initialToothNumber?: number | string | null | undefined;
}
