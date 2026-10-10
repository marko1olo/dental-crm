/**
 * ═══════════════════════════════════════════════════════════════════════════
 * N3.HEALTH VIPNET CLIENTS (SOAP GATEWAY, EVENTLOG REST & FHIR TERMINOLOGY)
 * (ПРИКАЗ МИНЗДРАВА РФ 911Н / 555-ПП / ГОСТ Р 34.10-2012 / VIPNET ENCRYPTION)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	n3HealthVipnetConfigSchema,
	type N3HealthVipnetConfig,
	type EmkAddDocumentPayload,
	type EmkSendDocumentPayload,
	type EmkCloseCasePayload,
	type PixPatientPayload,
	type PixFindPatientsCriteria,
	type SoapResponseResult,
	type EventLogDocumentStatusRecord,
	type EventLogQueueStats,
	type FhirTerminologyResponse,
} from "./types.js";
import { formatEventLogAuthHeader } from "./vipnetAuthHelpers.js";
import {
	buildEmkAddDocumentSoapXml,
	buildEmkSendDocumentSoapXml,
	buildEmkCloseCaseSoapXml,
	buildPixAddPatientSoapXml,
	buildPixUpdatePatientSoapXml,
	buildPixFindPatientsSoapXml,
} from "./n3HealthPayloadBuilders.js";

// ─── 1. SOAP Ответы и парсеры ───────────────────────────────────────────────

/**
 * Парсер ответа WCF SOAP сервисов N3.Health (без тяжелых внешних XML библиотек).
 */
export function parseN3SoapResponse(
	rawXml: string,
	httpStatus: number,
): SoapResponseResult {
	if (httpStatus >= 400) {
		const faultMatch = rawXml.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/i);
		const faultString = faultMatch ? faultMatch[1]?.trim() : `HTTP Error ${httpStatus}`;
		return {
			success: false,
			httpStatusCode: httpStatus,
			faultString,
			rawResponseBody: rawXml,
		};
	}

	// Проверка на SOAP Fault внутри 200 OK
	if (rawXml.includes(":Fault>") || rawXml.includes("<Fault>")) {
		const faultMatch = rawXml.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/i);
		const codeMatch = rawXml.match(/<faultcode[^>]*>([^<]+)<\/faultcode>/i);
		return {
			success: false,
			httpStatusCode: httpStatus,
			faultString: faultMatch ? faultMatch[1]?.trim() : "SOAP Fault returned by service",
			errorCode: codeMatch ? codeMatch[1]?.trim() : undefined,
			rawResponseBody: rawXml,
		};
	}

	// Извлечение глобальных идентификаторов
	const docGlobalMatch = rawXml.match(/<(?:tem:)?IdDocumentGlobal[^>]*>([^<]+)<\/(?:tem:)?IdDocumentGlobal>/i);
	const patientGlobalMatch = rawXml.match(/<(?:tem:)?IdPatientGlobal[^>]*>([^<]+)<\/(?:tem:)?IdPatientGlobal>/i);

	// Проверка флага успеха в теле ответа
	const successFlagMatch = rawXml.match(/<(?:tem:)?Success[^>]*>([^<]+)<\/(?:tem:)?Success>/i);
	const isSuccessFlag = successFlagMatch ? successFlagMatch[1]?.toLowerCase() === "true" : true;

	return {
		success: isSuccessFlag,
		httpStatusCode: httpStatus,
		idDocumentGlobal: docGlobalMatch ? docGlobalMatch[1]?.trim() : undefined,
		idPatientGlobal: patientGlobalMatch ? patientGlobalMatch[1]?.trim() : undefined,
		rawResponseBody: rawXml,
	};
}

// ─── 2. REST Клиент EventLog API ───────────────────────────────────────────

/**
 * REST Клиент EventLog API платформы N3.Health.
 * Заголовок: `Authorization: N3 <token>`
 */
export class N3EventLogClient {
	private readonly config: N3HealthVipnetConfig;
	private readonly fetchImpl: typeof fetch;

	constructor(config: N3HealthVipnetConfig, customFetch?: typeof fetch) {
		this.config = n3HealthVipnetConfigSchema.parse(config);
		this.fetchImpl = customFetch ?? globalThis.fetch;
	}

	public getHeaders(): Record<string, string> {
		return {
			Authorization: formatEventLogAuthHeader(this.config.eventLogToken),
			"Content-Type": "application/json",
			Accept: "application/json",
		};
	}

	/**
	 * Получить статус документа в EventLog по idDocumentMis.
	 */
	public async getDocumentStatus(
		idDocumentMis: string,
	): Promise<EventLogDocumentStatusRecord> {
		const baseUrl = this.config.eventLogApiUrl.replace(/\/+$/, "");
		const url = `${baseUrl}/api/v1/documents?idDocumentMis=${encodeURIComponent(idDocumentMis)}`;

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

		try {
			const res = await this.fetchImpl(url, {
				method: "GET",
				headers: this.getHeaders(),
				signal: controller.signal,
			});

			if (!res.ok) {
				return {
					idDocumentMis,
					status: "ERROR",
					errorMessage: `EventLog API вернул HTTP ${res.status}: ${res.statusText}`,
					lastCheckedAt: new Date().toISOString(),
				};
			}

			const json = (await res.json()) as {
				items?: Array<{
					idDocumentMis?: string;
					status?: string;
					remdNumber?: string;
					registeredDate?: string;
					error?: string;
				}>;
				status?: string;
				remdRegistrationNumber?: string;
				registeredAt?: string;
				errorMessage?: string;
			};

			type EventLogRawItem = {
				idDocumentMis?: string;
				status?: string;
				remdNumber?: string;
				remdRegistrationNumber?: string;
				registeredDate?: string;
				registeredAt?: string;
				error?: string;
				errorMessage?: string;
			};
			const item: EventLogRawItem = (json.items?.[0] ?? json) as EventLogRawItem;
			const rawStatus = (item.status || "UNKNOWN").toUpperCase();

			let status: EventLogDocumentStatusRecord["status"] = "UNKNOWN";
			if (rawStatus.includes("REGISTER") || rawStatus === "SUCCESS") {
				status = "REGISTERED";
			} else if (rawStatus.includes("REJECT") || rawStatus === "FAILED") {
				status = "REJECTED";
			} else if (rawStatus.includes("PROCESS")) {
				status = "PROCESSING";
			} else if (rawStatus.includes("QUEUE")) {
				status = "QUEUED";
			} else if (rawStatus.includes("ERR")) {
				status = "ERROR";
			}

			return {
				idDocumentMis,
				status,
				remdRegistrationNumber: item.remdRegistrationNumber || item.remdNumber,
				registeredAt: item.registeredAt || item.registeredDate,
				errorMessage: item.errorMessage || item.error,
				lastCheckedAt: new Date().toISOString(),
			};
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			return {
				idDocumentMis,
				status: "ERROR",
				errorMessage: `Сетевая ошибка EventLog API: ${message}`,
				lastCheckedAt: new Date().toISOString(),
			};
		} finally {
			clearTimeout(timer);
		}
	}

	/**
	 * Поставить документ в очередь на повторную выгрузку (Reexport).
	 */
	public async queueForReexport(
		idDocumentMis: string,
		queue: "REMD" | "IEMK" = "REMD",
	): Promise<{ success: boolean; message: string }> {
		const baseUrl = this.config.eventLogApiUrl.replace(/\/+$/, "");
		const url = `${baseUrl}/api/v1/documents/reexport`;

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

		try {
			const res = await this.fetchImpl(url, {
				method: "POST",
				headers: this.getHeaders(),
				body: JSON.stringify({
					idDocumentMis,
					queue,
					requestedAt: new Date().toISOString(),
				}),
				signal: controller.signal,
			});

			if (!res.ok) {
				return {
					success: false,
					message: `Ошибка постановки в очередь: HTTP ${res.status}`,
				};
			}

			return {
				success: true,
				message: `Документ ${idDocumentMis} успешно поставлен в очередь ${queue}`,
			};
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			return {
				success: false,
				message: `Сбой вызова reexport: ${message}`,
			};
		} finally {
			clearTimeout(timer);
		}
	}

	/**
	 * Получить сводную статистику очередей выгрузки EventLog.
	 */
	public async getQueueStats(): Promise<EventLogQueueStats> {
		const baseUrl = this.config.eventLogApiUrl.replace(/\/+$/, "");
		const url = `${baseUrl}/api/v1/queues/stats`;

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

		try {
			const res = await this.fetchImpl(url, {
				method: "GET",
				headers: this.getHeaders(),
				signal: controller.signal,
			});

			if (!res.ok) {
				return {
					iemkQueueCount: 0,
					remdQueueCount: 0,
					errorCount: 0,
					updatedAt: new Date().toISOString(),
				};
			}

			const json = (await res.json()) as {
				iemkQueueCount?: number;
				remdQueueCount?: number;
				errorCount?: number;
			};

			return {
				iemkQueueCount: json.iemkQueueCount ?? 0,
				remdQueueCount: json.remdQueueCount ?? 0,
				errorCount: json.errorCount ?? 0,
				updatedAt: new Date().toISOString(),
			};
		} catch {
			return {
				iemkQueueCount: 0,
				remdQueueCount: 0,
				errorCount: 0,
				updatedAt: new Date().toISOString(),
			};
		} finally {
			clearTimeout(timer);
		}
	}
}

// ─── 3. FHIR Клиент терминологии NSI (НСИ Минздрава РФ) ─────────────────────

/**
 * HL7 FHIR Terminology клиент к серверу НСИ N3.Health:
 * `http://b2b.n3health.ru/nsi/fhir/term/`
 */
export class N3FhirTerminologyClient {
	private readonly config: N3HealthVipnetConfig;
	private readonly fetchImpl: typeof fetch;

	constructor(config: N3HealthVipnetConfig, customFetch?: typeof fetch) {
		this.config = n3HealthVipnetConfigSchema.parse(config);
		this.fetchImpl = customFetch ?? globalThis.fetch;
	}

	public getHeaders(): Record<string, string> {
		return {
			Accept: "application/fhir+json, application/json",
		};
	}

	/**
	 * Получить CodeSystem по OID справочника НСИ (например `1.2.643.5.1.13.13.11.1040` - пол).
	 */
	public async getCodeSystem(
		oidOrId: string,
	): Promise<FhirTerminologyResponse | null> {
		const baseUrl = this.config.nsiFhirUrl.replace(/\/+$/, "");
		const url = `${baseUrl}/CodeSystem?_id=${encodeURIComponent(oidOrId)}`;

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

		try {
			const res = await this.fetchImpl(url, {
				method: "GET",
				headers: this.getHeaders(),
				signal: controller.signal,
			});

			if (!res.ok) return null;
			return (await res.json()) as FhirTerminologyResponse;
		} catch {
			return null;
		} finally {
			clearTimeout(timer);
		}
	}

	/**
	 * Раскрыть ValueSet ($expand) с фильтром по подстроке.
	 */
	public async expandValueSet(
		valueSetUrl: string,
		filter?: string,
	): Promise<FhirTerminologyResponse | null> {
		const baseUrl = this.config.nsiFhirUrl.replace(/\/+$/, "");
		const filterQuery = filter ? `&filter=${encodeURIComponent(filter)}` : "";
		const url = `${baseUrl}/ValueSet/$expand?url=${encodeURIComponent(valueSetUrl)}${filterQuery}`;

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

		try {
			const res = await this.fetchImpl(url, {
				method: "GET",
				headers: this.getHeaders(),
				signal: controller.signal,
			});

			if (!res.ok) return null;
			return (await res.json()) as FhirTerminologyResponse;
		} catch {
			return null;
		} finally {
			clearTimeout(timer);
		}
	}
}

// ─── 4. Единый фасад шлюза N3HealthVipnetGateway ────────────────────────────

export class N3HealthVipnetGateway {
	public readonly config: N3HealthVipnetConfig;
	public readonly eventLog: N3EventLogClient;
	public readonly fhir: N3FhirTerminologyClient;
	private readonly fetchImpl: typeof fetch;

	constructor(config: N3HealthVipnetConfig, customFetch?: typeof fetch) {
		this.config = n3HealthVipnetConfigSchema.parse(config);
		this.fetchImpl = customFetch ?? globalThis.fetch;
		this.eventLog = new N3EventLogClient(this.config, this.fetchImpl);
		this.fhir = new N3FhirTerminologyClient(this.config, this.fetchImpl);
	}

	/**
	 * Отправка документа в EMKService (AddDocument) через ViPNet SOAP шлюз.
	 */
	public async emkAddDocument(
		payload: EmkAddDocumentPayload,
	): Promise<SoapResponseResult> {
		const xml = buildEmkAddDocumentSoapXml(this.config, payload);
		return this.executeSoapRequest(
			this.config.emkServiceUrl,
			"http://tempuri.org/IEMKService/AddDocument",
			xml,
		);
	}

	/**
	 * Отправка команды выгрузки документа в РЭМД (SendDocument).
	 */
	public async emkSendDocument(
		payload: EmkSendDocumentPayload,
	): Promise<SoapResponseResult> {
		const xml = buildEmkSendDocumentSoapXml(this.config, payload);
		return this.executeSoapRequest(
			this.config.emkServiceUrl,
			"http://tempuri.org/IEMKService/SendDocument",
			xml,
		);
	}

	/**
	 * Закрытие случая обслуживания (CloseCase) в ИЭМК.
	 */
	public async emkCloseCase(
		payload: EmkCloseCasePayload,
	): Promise<SoapResponseResult> {
		const xml = buildEmkCloseCaseSoapXml(this.config, payload);
		return this.executeSoapRequest(
			this.config.emkServiceUrl,
			"http://tempuri.org/IEMKService/CloseCase",
			xml,
		);
	}

	/**
	 * Регистрация пациента в PIX (AddPatient).
	 */
	public async pixAddPatient(
		payload: PixPatientPayload,
	): Promise<SoapResponseResult> {
		const xml = buildPixAddPatientSoapXml(this.config, payload);
		return this.executeSoapRequest(
			this.config.pixServiceUrl,
			"http://tempuri.org/IPixService/AddPatient",
			xml,
		);
	}

	/**
	 * Обновление данных пациента в PIX (UpdatePatient).
	 */
	public async pixUpdatePatient(
		payload: PixPatientPayload,
	): Promise<SoapResponseResult> {
		const xml = buildPixUpdatePatientSoapXml(this.config, payload);
		return this.executeSoapRequest(
			this.config.pixServiceUrl,
			"http://tempuri.org/IPixService/UpdatePatient",
			xml,
		);
	}

	/**
	 * Поиск пациентов в PIX (FindPatients).
	 */
	public async pixFindPatients(
		criteria: PixFindPatientsCriteria,
	): Promise<SoapResponseResult> {
		const xml = buildPixFindPatientsSoapXml(this.config, criteria);
		return this.executeSoapRequest(
			this.config.pixServiceUrl,
			"http://tempuri.org/IPixService/FindPatients",
			xml,
		);
	}

	/**
	 * Выполняет SOAP POST HTTP-запрос к ViPNet WCF сервису с заголовком SOAPAction.
	 */
	private async executeSoapRequest(
		endpointUrl: string,
		soapAction: string,
		bodyXml: string,
	): Promise<SoapResponseResult> {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

		try {
			const res = await this.fetchImpl(endpointUrl, {
				method: "POST",
				headers: {
					"Content-Type": "text/xml; charset=utf-8",
					SOAPAction: `"${soapAction}"`,
				},
				body: bodyXml,
				signal: controller.signal,
			});

			const responseText = await res.text();
			return parseN3SoapResponse(responseText, res.status);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			return {
				success: false,
				httpStatusCode: 0,
				faultString: `Сетевой сбой при обращении к ViPNet сервису: ${message}`,
				rawResponseBody: "",
			};
		} finally {
			clearTimeout(timer);
		}
	}
}
