/**
 * Channel Adapter Registry
 *
 * Process-wide singleton registry for pluggable channel adapters (WhatsApp Kapso,
 * Telegram, SMS, Email, etc.). Allows multi-vendor extensions and clean runtime
 * activation/uninstallation without modifying core dispatch pipelines.
 */

import type { Channel, ChannelAdapter } from "./types.js";

export class ChannelRegistry {
	private readonly adapters: Map<string, ChannelAdapter> = new Map();

	/**
	 * Register an adapter into the registry. Idempotent on identical instance/type.
	 */
	public register(adapter: ChannelAdapter): void {
		const name = adapter.adapterName;
		const existing = this.adapters.get(name);
		if (existing && existing.constructor === adapter.constructor) {
			return;
		}
		this.adapters.set(name, adapter);
	}

	/**
	 * Unregister an adapter by its unique name (e.g. on plugin uninstall).
	 */
	public unregister(adapterName: string): void {
		this.adapters.delete(adapterName);
	}

	/**
	 * Get the active adapter for a given channel.
	 * If multiple adapters match the channel, returns the most recently registered one.
	 */
	public getForChannel(channel: Channel | string): ChannelAdapter | null {
		const all = Array.from(this.adapters.values());
		for (let i = all.length - 1; i >= 0; i--) {
			const candidate = all[i];
			if (candidate && candidate.channel === channel) {
				return candidate;
			}
		}
		return null;
	}

	/**
	 * Lookup an adapter by exact name.
	 */
	public getByName(adapterName: string): ChannelAdapter | null {
		return this.adapters.get(adapterName) ?? null;
	}

	/**
	 * List all unique channels supported by registered adapters.
	 */
	public availableChannels(): Channel[] {
		const channels = new Set<Channel>();
		for (const adapter of this.adapters.values()) {
			channels.add(adapter.channel);
		}
		return Array.from(channels);
	}

	/**
	 * Clear all adapters (useful for testing).
	 */
	public clear(): void {
		this.adapters.clear();
	}
}

export const channelRegistry = new ChannelRegistry();
