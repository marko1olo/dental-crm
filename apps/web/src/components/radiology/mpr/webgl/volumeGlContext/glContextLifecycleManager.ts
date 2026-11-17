export class GlContextLifecycleManager {
	public contextLostState = false;
	public contextLossCount = 0;
	private contextRestoredListeners = new Set<() => void>();
	private contextLostListeners = new Set<() => void>();

	public getContextLossCount(): number {
		return this.contextLossCount;
	}

	public resetContextLossCount(): void {
		this.contextLossCount = 0;
	}

	public addContextRestoredListener(listener: () => void): () => void {
		this.contextRestoredListeners.add(listener);
		return () => { this.contextRestoredListeners.delete(listener); };
	}

	public addContextLostListener(listener: () => void): () => void {
		this.contextLostListeners.add(listener);
		return () => { this.contextLostListeners.delete(listener); };
	}

	public notifyContextLost(): void {
		this.contextLostState = true;
		this.contextLossCount++;
		for (const cb of this.contextLostListeners) {
			try { cb(); } catch (err) { console.error("[CbctVolumeGlContext] contextLostListener error:", err); }
		}
	}

	public notifyContextRestored(): void {
		this.contextLostState = false;
		for (const cb of this.contextRestoredListeners) {
			try { cb(); } catch (err) { console.error("[CbctVolumeGlContext] contextRestoredListener error:", err); }
		}
	}

	public simulateContextLost(canvas: HTMLCanvasElement | null, onDirect: () => void): void {
		if (canvas && typeof canvas.dispatchEvent === "function" && typeof Event !== "undefined") {
			const evt = new Event("webglcontextlost", { cancelable: true });
			canvas.dispatchEvent(evt);
		} else {
			onDirect();
		}
	}

	public simulateContextRestored(canvas: HTMLCanvasElement | null, onDirect: () => void): void {
		if (canvas && typeof canvas.dispatchEvent === "function" && typeof Event !== "undefined") {
			const evt = new Event("webglcontextrestored");
			canvas.dispatchEvent(evt);
		} else {
			onDirect();
		}
	}

	public clear(): void {
		this.contextRestoredListeners.clear();
		this.contextLostListeners.clear();
	}
}
