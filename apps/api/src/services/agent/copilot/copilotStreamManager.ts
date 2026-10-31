/**
 * copilotStreamManager.ts — SSE Streaming & Proactive Alert Subscriber Manager.
 *
 * Sweet Spot: ~120 lines.
 */

import type { TurnEvent } from "../types.js";

/**
 * Formats a TurnEvent or proactive event into standard SSE protocol chunk.
 */
export function formatSseEvent(
	event: TurnEvent | { type: string; [key: string]: unknown },
): string {
	let eventName: string = event.type;
	if (event.type === "tool_call_started") eventName = "tool_call";
	else if (event.type === "tool_call_finished") eventName = "tool_result";
	else if (event.type === "confirmation_required")
		eventName = "tool_confirmation_required";
	else if (event.type === "final") eventName = "done";
	else if (event.type === "proactive_alert") eventName = "proactive_alert";

	const payload = JSON.stringify(event);
	return `event: ${eventName}\ndata: ${payload}\n\n`;
}

export interface CopilotStreamSubscriber {
	readonly id: string;
	readonly organizationId: string;
	readonly userId?: string | undefined;
	readonly sessionId?: string | undefined;
	readonly send: (chunk: string) => boolean;
	readonly close?: (() => void) | undefined;
	readonly write?: ((chunk: string) => void) | undefined;
}

/**
 * Manages active SSE streaming connections for real-time Server-Initiated Proactive Messages.
 */
export class CopilotStreamManager {
	private readonly subscribers = new Map<string, CopilotStreamSubscriber>();

	public subscribe(
		subOrId: CopilotStreamSubscriber | string,
		maybeSub?:
			| {
					organizationId?: string | undefined;
					userId?: string | undefined;
					sessionId?: string | undefined;
					send?: ((chunk: string) => boolean) | undefined;
					write?: ((chunk: string) => void) | undefined;
					close?: (() => void) | undefined;
			  }
			| undefined,
	): () => void {
		let sub: CopilotStreamSubscriber;
		if (typeof subOrId === "string") {
			const id = subOrId;
			const organizationId = maybeSub?.organizationId || "default";
			const writeFn = maybeSub?.write;
			const sendFn =
				maybeSub?.send ||
				((chunk: string) => {
					if (writeFn) {
						writeFn(chunk);
						return true;
					}
					return true;
				});
			sub = {
				id,
				organizationId,
				send: sendFn,
				...(maybeSub?.userId !== undefined ? { userId: maybeSub.userId } : {}),
				...(maybeSub?.sessionId !== undefined
					? { sessionId: maybeSub.sessionId }
					: {}),
				...(writeFn !== undefined ? { write: writeFn } : {}),
				...(maybeSub?.close !== undefined ? { close: maybeSub.close } : {}),
			};
		} else {
			sub = subOrId;
		}

		this.subscribers.set(sub.id, sub);
		return () => {
			this.subscribers.delete(sub.id);
		};
	}

	public broadcastToOrganization(
		organizationId: string,
		eventName: string,
		data: unknown,
	): number {
		const chunk = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
		let count = 0;
		for (const [id, sub] of this.subscribers.entries()) {
			if (sub.organizationId === organizationId) {
				const ok = sub.send(chunk);
				if (ok) {
					count++;
				} else {
					this.subscribers.delete(id);
				}
			}
		}
		return count;
	}

	public broadcastProactiveAlert(
		organizationId: string,
		alert: unknown,
	): number {
		return this.broadcastToOrganization(
			organizationId,
			"proactive_alert",
			alert,
		);
	}

	public getSubscriberCount(organizationId?: string): number {
		if (!organizationId) return this.subscribers.size;
		let count = 0;
		for (const sub of this.subscribers.values()) {
			if (sub.organizationId === organizationId) count++;
		}
		return count;
	}

	public getActiveSubscribersCount(organizationId?: string): number {
		return this.getSubscriberCount(organizationId);
	}
}

export const defaultCopilotStreamManager = new CopilotStreamManager();
