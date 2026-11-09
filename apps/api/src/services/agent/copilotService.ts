/**
 * copilotService.ts — SSE Streaming and Proactive Alert Manager.
 */

export interface ProactiveAlertCard {
	id: string;
	urgency?: string;
	title: string;
	subtitle?: string;
	description?: string;
	timestamp?: string;
	patientId?: string;
	patientName?: string;
	patientPhone?: string;
	category?: string;
	actions?: Array<{
		id: string;
		label: string;
		kind?: string;
		actionType?: string;
		payload?: Record<string, unknown>;
	}>;
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
					console.warn("[CopilotStreamManager] Error delivering alert to subscriber:", err);
				}
			}
		}
	}

	public subscribe(organizationId: string, callback: (alert: ProactiveAlertCard) => void): () => void {
		if (!this.subscribers.has(organizationId)) {
			this.subscribers.set(organizationId, new Set());
		}
		this.subscribers.get(organizationId)!.add(callback);
		return () => {
			this.subscribers.get(organizationId)?.delete(callback);
		};
	}
}

export const defaultCopilotStreamManager = new CopilotStreamManager();
