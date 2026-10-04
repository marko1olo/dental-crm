import { denteTelegramWebhookUpdateSchema } from "@dental/shared";

export type TelegramPollingConfig = {
	botToken: string;
	organizationId: string;
	botConfigId?: string;
	pollIntervalMs?: number;
	timeoutSeconds?: number;
	onUpdate: (update: unknown) => Promise<void>;
	onError?: (error: Error) => void;
	onLog?: (message: string) => void;
};

/**
 * Автономный фоновый Long Polling раннер для Telegram-ботов.
 * Используется как отказоустойчивый fallback при отсутствии внешнего Webhook URL (за NAT, на dev VPS или в изолированных контурах клиник).
 */
export class TelegramPollingRunner {
	private isRunning = false;
	private lastUpdateId = 0;
	private abortController: AbortController | null = null;
	private currentTimeoutId: NodeJS.Timeout | null = null;

	constructor(private readonly config: TelegramPollingConfig) {}

	public start(): void {
		if (this.isRunning) return;
		this.isRunning = true;
		this.abortController = new AbortController();
		this.config.onLog?.(
			`[TelegramPollingRunner] Запуск Long Polling для организации ${this.config.organizationId}...`,
		);
		void this.pollLoop();
	}

	public stop(): void {
		if (!this.isRunning) return;
		this.isRunning = false;
		if (this.currentTimeoutId) {
			clearTimeout(this.currentTimeoutId);
			this.currentTimeoutId = null;
		}
		if (this.abortController) {
			this.abortController.abort();
			this.abortController = null;
		}
		this.config.onLog?.(
			`[TelegramPollingRunner] Остановка Long Polling для организации ${this.config.organizationId}.`,
		);
	}

	public isActive(): boolean {
		return this.isRunning;
	}

	private async pollLoop(): Promise<void> {
		while (this.isRunning) {
			try {
				const updates = await this.fetchUpdates();
				if (updates && updates.length > 0) {
					for (const update of updates) {
						if (!this.isRunning) break;
						try {
							await this.config.onUpdate(update);
						} catch (processErr: unknown) {
							this.config.onError?.(
								processErr instanceof Error
									? processErr
									: new Error(String(processErr)),
							);
						}
					}
				}
			} catch (fetchErr: unknown) {
				if (!this.isRunning) break;
				this.config.onError?.(
					fetchErr instanceof Error ? fetchErr : new Error(String(fetchErr)),
				);
				// Задержка перед повторной попыткой при сетевой ошибке
				await new Promise((resolve) => {
					this.currentTimeoutId = setTimeout(
						resolve,
						this.config.pollIntervalMs || 3000,
					);
				});
			}
		}
	}

	private async fetchUpdates(): Promise<Array<{ update_id: number }> | null> {
		const offset = this.lastUpdateId > 0 ? this.lastUpdateId + 1 : 0;
		const timeout = this.config.timeoutSeconds || 20;

		const url = new URL(
			`https://api.telegram.org/bot${encodeURIComponent(this.config.botToken)}/getUpdates`,
		);
		url.searchParams.set("offset", String(offset));
		url.searchParams.set("timeout", String(timeout));
		url.searchParams.set("limit", "50");

		const controller = new AbortController();
		// Общий таймаут запроса = timeout + 5 сек запас
		const timer = setTimeout(() => controller.abort(), (timeout + 5) * 1000);

		try {
			const res = await fetch(url.toString(), {
				method: "GET",
				signal: controller.signal,
			});
			clearTimeout(timer);

			if (!res.ok) {
				throw new Error(
					`Telegram getUpdates вернул статус ${res.status}: ${res.statusText}`,
				);
			}

			const data = (await res.json()) as {
				ok: boolean;
				result?: Array<{ update_id: number }>;
				description?: string;
			};

			if (!data.ok || !Array.isArray(data.result)) {
				throw new Error(
					data.description || "getUpdates вернул некорректный ответ.",
				);
			}

			if (data.result.length > 0) {
				const maxId = Math.max(...data.result.map((u) => u.update_id));
				if (maxId > this.lastUpdateId) {
					this.lastUpdateId = maxId;
				}
			}

			return data.result;
		} catch (err) {
			clearTimeout(timer);
			throw err;
		}
	}
}
