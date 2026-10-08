/**
 * DENTE CRM — Offline CRDT Synchronization Engine: Lamport Logical Clock
 * Layer 1: Monotonic Lamport Clock with tie-breaking and node identity.
 */

import { getAdjustedNowIso } from "../crdt.js";

export class LamportClock {
	private counter: number;
	private readonly nodeId: string;

	constructor(nodeId = "default-node", initialCounter = 0) {
		this.nodeId = nodeId.trim() || "default-node";
		this.counter = Number.isFinite(initialCounter) && initialCounter >= 0
			? Math.floor(initialCounter)
			: 0;
	}

	public tick(): number {
		this.counter += 1;
		return this.counter;
	}

	public witness(remoteCounter: number): number {
		const safeRemote = Number.isFinite(remoteCounter) && remoteCounter >= 0
			? Math.floor(remoteCounter)
			: 0;
		this.counter = Math.max(this.counter, safeRemote) + 1;
		return this.counter;
	}

	public getTime(): number {
		return this.counter;
	}

	public getNodeId(): string {
		return this.nodeId;
	}

	public formatTimestamp(wallTimeIso?: string): string {
		const iso = wallTimeIso || getAdjustedNowIso();
		return `L${this.counter}@${iso}#${this.nodeId}`;
	}

	public static parseTimestamp(stamp: string): {
		lamport: number;
		wallTimeIso: string;
		nodeId: string;
	} | null {
		if (typeof stamp !== "string" || !stamp.startsWith("L")) return null;
		const match = /^L(\d+)@([^#]+)#(.+)$/.exec(stamp);
		if (!match || !match[1] || !match[2] || !match[3]) return null;
		return {
			lamport: parseInt(match[1], 10),
			wallTimeIso: match[2],
			nodeId: match[3],
		};
	}
}
