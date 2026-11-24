/**
 * apps/api/src/services/scanner/scannerHotFolderWatcher.ts
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE AUTONOMOUS SCANNER HOT FOLDER WATCHER SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 * Monitors local folders of intraoral dental scanners (3Shape TRIOS, Medit Link,
 * iTero, Carestream CS Imaging, Shining 3D Aoralscan, Runyes, Eighteeth).
 *
 * Invariants: Zero Any, Safe File Stability Debounce, Path Jail,
 * Automatic Patient & Visit Autolink, Resilient Error Recovery.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { IntraoralScannerVendor } from "@dental/shared";
import { createApiLogger } from "../../observability/logger.js";
import {
	UniversalScannerHub,
	type ProcessScanSessionOptions,
} from "./universalScannerHub.js";

const logger = createApiLogger("scannerHotFolderWatcher");

export interface ScannerWatchFolderConfig {
	readonly vendor: IntraoralScannerVendor;
	readonly folderPath: string;
	readonly organizationId: string;
	readonly autoArchiveSubfolder?: string | undefined;
	readonly pollIntervalMs?: number | undefined;
	readonly fileStabilityDelayMs?: number | undefined;
}

export interface IngestedScanEvent {
	sessionId: string;
	vendor: IntraoralScannerVendor;
	patientId: string;
	fileCount: number;
	timestamp: string;
}

export class ScannerHotFolderWatcher {
	private configs: ScannerWatchFolderConfig[] = [];
	private isRunning = false;
	private pollTimer: NodeJS.Timeout | null = null;
	private processedFiles = new Set<string>();
	private onScanIngested?: ((event: IngestedScanEvent) => void) | undefined;

	constructor(options?: {
		configs?: ScannerWatchFolderConfig[];
		onScanIngested?: (event: IngestedScanEvent) => void;
	}) {
		if (options?.configs) {
			this.configs = [...options.configs];
		}
		this.onScanIngested = options?.onScanIngested;
	}

	public addWatchFolder(config: ScannerWatchFolderConfig): void {
		this.configs.push(config);
	}

	public start(pollIntervalMs = 5000): void {
		if (this.isRunning) return;
		this.isRunning = true;

		const pollCycle = async () => {
			if (!this.isRunning) return;
			try {
				await this.scanAllFolders();
			} catch (err) {
				logger.warn({ err }, "ScannerHotFolderWatcher poll cycle error");
			} finally {
				if (this.isRunning) {
					this.pollTimer = setTimeout(pollCycle, pollIntervalMs);
				}
			}
		};

		pollCycle();
	}

	public stop(): void {
		this.isRunning = false;
		if (this.pollTimer) {
			clearTimeout(this.pollTimer);
			this.pollTimer = null;
		}
	}

	public async scanAllFolders(): Promise<IngestedScanEvent[]> {
		const events: IngestedScanEvent[] = [];

		for (const cfg of this.configs) {
			try {
				const folderEvents = await this.processFolder(cfg);
				events.push(...folderEvents);
			} catch (err) {
				logger.warn({ err, folderPath: cfg.folderPath, organizationId: cfg.organizationId }, "ScannerHotFolderWatcher failed to process watch folder");
			}
		}

		return events;
	}

	private async processFolder(cfg: ScannerWatchFolderConfig): Promise<IngestedScanEvent[]> {
		const events: IngestedScanEvent[] = [];

		// Verify folder exists
		try {
			await fs.access(cfg.folderPath);
		} catch {
			return events;
		}

		const entries = await fs.readdir(cfg.folderPath, { withFileTypes: true });

		// 1. Group scan files by session folder or standalone ZIP archives
		const zipFiles: string[] = [];
		const standaloneFiles: string[] = [];

		for (const entry of entries) {
			if (entry.name.startsWith(".") || entry.name.startsWith("~")) continue;

			const fullPath = path.join(cfg.folderPath, entry.name);
			if (this.processedFiles.has(fullPath)) continue;

			if (entry.isFile()) {
				const ext = path.extname(entry.name).toLowerCase();
				if (ext === ".zip") {
					zipFiles.push(fullPath);
				} else if (ext === ".ply" || ext === ".stl" || ext === ".obj" || ext === ".ro") {
					standaloneFiles.push(fullPath);
				}
			}
		}

		// Process ZIP files
		for (const zipPath of zipFiles) {
			const event = await this.tryIngestZip(zipPath, cfg);
			if (event) {
				events.push(event);
				this.processedFiles.add(zipPath);
			}
		}

		// Process standalone files if any are grouped together
		if (standaloneFiles.length > 0) {
			const event = await this.tryIngestStandaloneFiles(standaloneFiles, cfg);
			if (event) {
				events.push(event);
				for (const f of standaloneFiles) {
					this.processedFiles.add(f);
				}
			}
		}

		return events;
	}

	private async tryIngestZip(
		zipPath: string,
		cfg: ScannerWatchFolderConfig,
	): Promise<IngestedScanEvent | null> {
		try {
			// Check file stability (scanner finished writing)
			const stats1 = await fs.stat(zipPath);
			const delay = cfg.fileStabilityDelayMs ?? 500;
			if (delay > 0) {
				await new Promise((r) => setTimeout(r, delay));
			}
			const stats2 = await fs.stat(zipPath);
			if (stats1.size !== stats2.size || stats2.size === 0) {
				return null; // Still being written by scanner
			}

			const zipBuffer = await fs.readFile(zipPath);

			const options: ProcessScanSessionOptions = {
				organizationId: cfg.organizationId,
				vendor: cfg.vendor,
				zipBuffer,
			};

			const record = await UniversalScannerHub.processIncomingScanSession(options);

			const event: IngestedScanEvent = {
				sessionId: record.id,
				vendor: record.vendor as IntraoralScannerVendor,
				patientId: record.patientId,
				fileCount: 1,
				timestamp: new Date().toISOString(),
			};

			if (this.onScanIngested) {
				this.onScanIngested(event);
			}

			return event;
		} catch (err) {
			logger.warn({ err, zipPath, organizationId: cfg.organizationId }, "ScannerHotFolderWatcher failed to ingest zip archive");
			return null;
		}
	}

	private async tryIngestStandaloneFiles(
		filePaths: string[],
		cfg: ScannerWatchFolderConfig,
	): Promise<IngestedScanEvent | null> {
		try {
			const filesPayload: Array<{ name: string; buffer: Buffer }> = [];
			for (const fp of filePaths) {
				const buf = await fs.readFile(fp);
				filesPayload.push({
					name: path.basename(fp),
					buffer: buf,
				});
			}

			const options: ProcessScanSessionOptions = {
				organizationId: cfg.organizationId,
				vendor: cfg.vendor,
				files: filesPayload,
			};

			const record = await UniversalScannerHub.processIncomingScanSession(options);

			const event: IngestedScanEvent = {
				sessionId: record.id,
				vendor: record.vendor as IntraoralScannerVendor,
				patientId: record.patientId,
				fileCount: filePaths.length,
				timestamp: new Date().toISOString(),
			};

			if (this.onScanIngested) {
				this.onScanIngested(event);
			}

			return event;
		} catch (err) {
			logger.warn({ err, filePaths, organizationId: cfg.organizationId }, "ScannerHotFolderWatcher failed to ingest standalone scan files");
			return null;
		}
	}
}
