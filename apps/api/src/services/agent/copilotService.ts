/**
 * copilotService.ts — SSE Streaming and Proactive Alert Manager.
 */

import { createApiLogger, safeLogError } from "../../observability/logger.js";

const logger = createApiLogger("copilotService");

export interface ProactiveAlertCard {
	id: string;
	urgency?: string | undefined;
	title: string;
	subtitle?: string | undefined;
	description?: string | undefined;
	timestamp?: string | undefined;
	patientId?: string | undefined;
	patientName?: string | undefined;
	patientPhone?: string | undefined;
	category?: string | undefined;
	actions?: Array<{
		id: string;
		label: string;
		kind?: string | undefined;
		actionType?: string | undefined;
		payload?: Record<string, unknown> | undefined;
	}> | undefined;
}

export class CopilotStreamManager {
	private subscribers = new Map<string, Set<(alert: ProactiveAlertCard) => void>>();

	public broadcastProactiveAlert(organizationId: string, alertCard: ProactiveAlertCard): void {
		const orgSubs = this.subscribers.get(organizationId);
		if (orgSubs) {
			for (const sub of orgSubs) {
				try {
					sub(alertCard);
				} catch (err) {
					logger.warn(
						{ err: safeLogError(err), organizationId, alertId: alertCard.id },
						"Error delivering alert to subscriber",
					);
				}
			}
		}
	}

	public subscribe(organizationId: string, callback: (alert: ProactiveAlertCard) => void): () => void {
		let orgSubs = this.subscribers.get(organizationId);
		if (!orgSubs) {
			orgSubs = new Set();
			this.subscribers.set(organizationId, orgSubs);
		}
		orgSubs.add(callback);
		return () => {
			this.subscribers.get(organizationId)?.delete(callback);
		};
	}
}

export const defaultCopilotStreamManager = new CopilotStreamManager();
