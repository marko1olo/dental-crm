/**
 * DENTE CRM — CBCT Slice Request Queue & In-Flight Tracking Manager (FEAT-010)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Tracks in-flight workers by plane, maintains pending rotation queues,
 * and handles superseding of obsolete MPR slices during rapid scrubbing.
 */

import type { MprPlane } from "../../cbctMprMath";
import {
	type InFlightMultiTask,
	type InFlightSingleTask,
	type QueuedMultiPlane,
	type QueuedSingleSlice,
	StaleSliceRequestError,
} from "./types";

export class SliceQueueManager {
	private inFlightSingleByPlane = new Map<MprPlane, InFlightSingleTask>();
	private queuedSingleByPlane = new Map<MprPlane, QueuedSingleSlice>();

	private inFlightMulti: InFlightMultiTask | null = null;
	private queuedMulti: QueuedMultiPlane | null = null;

	public getQueuedSingle(plane: MprPlane): QueuedSingleSlice | undefined {
		return this.queuedSingleByPlane.get(plane);
	}

	public setQueuedSingle(plane: MprPlane, entry: QueuedSingleSlice): void {
		this.queuedSingleByPlane.set(plane, entry);
	}

	public deleteQueuedSingle(plane: MprPlane): void {
		this.queuedSingleByPlane.delete(plane);
	}

	public getInFlightSingle(plane: MprPlane): InFlightSingleTask | undefined {
		return this.inFlightSingleByPlane.get(plane);
	}

	public setInFlightSingle(plane: MprPlane, entry: InFlightSingleTask): void {
		this.inFlightSingleByPlane.set(plane, entry);
	}

	public deleteInFlightSingle(plane: MprPlane): void {
		this.inFlightSingleByPlane.delete(plane);
	}

	public getInFlightMulti(): InFlightMultiTask | null {
		return this.inFlightMulti;
	}

	public setInFlightMulti(entry: InFlightMultiTask | null): void {
		this.inFlightMulti = entry;
	}

	public getQueuedMulti(): QueuedMultiPlane | null {
		return this.queuedMulti;
	}

	public setQueuedMulti(entry: QueuedMultiPlane | null): void {
		this.queuedMulti = entry;
	}

	public getQueuedSingleCount(): number {
		return this.queuedSingleByPlane.size;
	}

	public getInFlightSingleCount(): number {
		return this.inFlightSingleByPlane.size;
	}

	public isPlaneInFlight(plane: MprPlane): boolean {
		return this.inFlightSingleByPlane.has(plane);
	}

	public isPlaneQueued(plane: MprPlane): boolean {
		return this.queuedSingleByPlane.has(plane);
	}

	public getQueuedSingleEntries(): IterableIterator<[MprPlane, QueuedSingleSlice]> {
		return this.queuedSingleByPlane.entries();
	}

	public supersedeQueuedSingle(
		plane: MprPlane,
		currentRequestId: number,
	): QueuedSingleSlice | null {
		const queued = this.queuedSingleByPlane.get(plane);
		if (queued && queued.requestId < currentRequestId) {
			this.queuedSingleByPlane.delete(plane);
			return queued;
		}
		return null;
	}

	public checkInFlightSingleObsolete(
		plane: MprPlane,
		currentRequestId: number,
	): number | null {
		const inFlight = this.inFlightSingleByPlane.get(plane);
		if (inFlight && inFlight.requestId < currentRequestId) {
			return inFlight.requestId;
		}
		return null;
	}

	public supersedeQueuedMulti(currentRequestId: number): QueuedMultiPlane | null {
		if (this.queuedMulti && this.queuedMulti.requestId < currentRequestId) {
			const q = this.queuedMulti;
			this.queuedMulti = null;
			return q;
		}
		return null;
	}

	public checkInFlightMultiObsolete(currentRequestId: number): number | null {
		if (this.inFlightMulti && this.inFlightMulti.requestId < currentRequestId) {
			return this.inFlightMulti.requestId;
		}
		return null;
	}

	public abortQueued(requestId: number, plane?: MprPlane): void {
		if (plane) {
			const queued = this.queuedSingleByPlane.get(plane);
			if (queued && queued.requestId === requestId) {
				this.queuedSingleByPlane.delete(plane);
				queued.onAbortCleanup?.();
				queued.reject(new StaleSliceRequestError(requestId, plane));
			}
		} else {
			for (const [p, queued] of this.queuedSingleByPlane) {
				if (queued.requestId === requestId) {
					this.queuedSingleByPlane.delete(p);
					queued.onAbortCleanup?.();
					queued.reject(new StaleSliceRequestError(requestId, p));
				}
			}
		}

		if (this.queuedMulti && this.queuedMulti.requestId === requestId) {
			const q = this.queuedMulti;
			this.queuedMulti = null;
			q.onAbortCleanup?.();
			q.reject(new StaleSliceRequestError(requestId));
		}
	}

	public clearAll(): void {
		for (const [, q] of this.queuedSingleByPlane) {
			q.onAbortCleanup?.();
			q.reject(new Error("CbctWorkerBridge disposed."));
		}
		if (this.queuedMulti) {
			this.queuedMulti.onAbortCleanup?.();
			this.queuedMulti.reject(new Error("CbctWorkerBridge disposed."));
			this.queuedMulti = null;
		}
		this.queuedSingleByPlane.clear();
		this.inFlightSingleByPlane.clear();
		this.inFlightMulti = null;
	}
}
