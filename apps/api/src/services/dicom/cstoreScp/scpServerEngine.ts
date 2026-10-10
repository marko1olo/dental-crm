/**
 * scpServerEngine.ts — Сетевой сервер DICOM C-STORE SCP (PS 3.8 Upper Layer Protocol).
 * Управляет пулом TCP-соединений от аппаратов Planmeca, Vatech, Sirona, Dentsply, Carestream.
 * Принимает КЛКТ, прицельные снимки и ОПТГ, упаковывает в DICOM Part 10 и сохраняет в PACS.
 */

import net from "node:net";
import { db } from "../../../db/client.js";
import * as schema from "../../../db/schema.js";
import {
	COMMAND_C_ECHO_RQ,
	COMMAND_C_STORE_RQ,
	DEFAULT_DICOM_CALLED_AE,
	DEFAULT_DICOM_SCP_PORT,
	PDU_A_ABORT,
	PDU_A_ASSOCIATE_RQ,
	PDU_A_RELEASE_RP,
	PDU_A_RELEASE_RQ,
	PDU_P_DATA_TF,
	STATUS_PROCESSING_FAILURE,
	STATUS_SUCCESS,
	TRANSFER_SYNTAX_EXPLICIT_VR_LITTLE_ENDIAN,
} from "../dicomProtocolConstants.js";
import { dicomStudyIngestService } from "../dicomStudyIngestService.js";
import { wrapInDicomPart10 } from "./dicomPart10Wrapper.js";
import {
	buildAssociateAcPdu,
	buildCEchoRspPdu,
	buildCStoreRspPdu,
	parseAssociateRqPdu,
	parseDimseCommand,
} from "./pduParser.js";
import type {
	DicomScpServerOptions,
	DicomScpServerStats,
	ParsedDimseCommand,
	PresentationContextItem,
} from "./types.js";

/**
 * Класс сетевого DICOM C-STORE SCP сервера.
 */
export class DicomCStoreScpServer {
	private server: net.Server | null = null;
	private isServerRunning = false;
	private port: number;
	private calledAeTitle: string;
	private defaultOrganizationId: string | null;
	private maxPduLength: number;

	// Статистика работы
	private totalAssociations = 0;
	private activeAssociations = 0;
	private totalCStoresReceived = 0;
	private totalCStoresSuccess = 0;
	private totalCStoresFailed = 0;
	private totalCEchoReceived = 0;
	private lastActivityAt: Date | null = null;

	constructor(options: DicomScpServerOptions = {}) {
		this.port = options.port ?? (Number.parseInt(process.env.DICOM_PORT ?? "", 10) || DEFAULT_DICOM_SCP_PORT);
		this.calledAeTitle = options.calledAeTitle ?? (process.env.DICOM_AE_TITLE?.trim() || DEFAULT_DICOM_CALLED_AE);
		this.defaultOrganizationId = options.defaultOrganizationId ?? (process.env.DICOM_DEFAULT_ORG_ID?.trim() || null);
		this.maxPduLength = options.maxPduLength ?? 65536;
	}

	/**
	 * Запуск прослушивания TCP-порта DICOM SCP.
	 */
	async start(overridePort?: number): Promise<void> {
		if (this.isServerRunning) {
			return;
		}

		if (overridePort) {
			this.port = overridePort;
		}

		// Резолвинг организации по умолчанию, если не задана
		if (!this.defaultOrganizationId) {
			try {
				const [firstOrg] = await db
					.select({ id: schema.organizations.id })
					.from(schema.organizations)
					.limit(1);
				if (firstOrg) {
					this.defaultOrganizationId = firstOrg.id;
				}
			} catch {
				// Оставляем null, будет определяться при приеме
			}
		}

		return new Promise<void>((resolve, reject) => {
			this.server = net.createServer((socket) => {
				this.handleConnection(socket);
			});

			this.server.on("error", (err) => {
				this.isServerRunning = false;
				reject(err);
			});

			this.server.listen(this.port, () => {
				this.isServerRunning = true;
				resolve();
			});
		});
	}

	/**
	 * Остановка сервера.
	 */
	async stop(): Promise<void> {
		if (!this.server || !this.isServerRunning) {
			return;
		}

		return new Promise<void>((resolve) => {
			this.server?.close(() => {
				this.isServerRunning = false;
				this.server = null;
				resolve();
			});
		});
	}

	isRunning(): boolean {
		return this.isServerRunning;
	}

	getPort(): number {
		return this.port;
	}

	getStats(): DicomScpServerStats {
		return {
			isRunning: this.isServerRunning,
			port: this.port,
			calledAeTitle: this.calledAeTitle,
			defaultOrganizationId: this.defaultOrganizationId,
			totalAssociations: this.totalAssociations,
			activeAssociations: this.activeAssociations,
			totalCStoresReceived: this.totalCStoresReceived,
			totalCStoresSuccess: this.totalCStoresSuccess,
			totalCStoresFailed: this.totalCStoresFailed,
			totalCEchoReceived: this.totalCEchoReceived,
			lastActivityAt: this.lastActivityAt ? this.lastActivityAt.toISOString() : null,
		};
	}

	/**
	 * Обработка одного TCP-соединения (DICOM Ассоциация).
	 */
	private handleConnection(socket: net.Socket): void {
		this.totalAssociations++;
		this.activeAssociations++;
		this.lastActivityAt = new Date();

		let rxBuffer = Buffer.alloc(0);
		let callingAe = "UNKNOWN";
		let presentationContexts = new Map<number, PresentationContextItem>();

		// Буферы текущего DIMSE сообщения
		let currentContextId: number | null = null;
		let commandChunks: Buffer[] = [];
		let dataChunks: Buffer[] = [];
		let currentCommand: ParsedDimseCommand | null = null;

		socket.on("data", async (chunk: Buffer) => {
			this.lastActivityAt = new Date();
			rxBuffer = Buffer.concat([rxBuffer, chunk]);

			try {
				// Цикл обработки PDUs из потока
				while (rxBuffer.length >= 6) {
					const pduType = rxBuffer[0];
					const pduLength = rxBuffer.readUInt32BE(2);
					const totalPduSize = 6 + pduLength;

					if (rxBuffer.length < totalPduSize) {
						// Ожидаем оставшиеся байты PDU
						break;
					}

					const pdu = rxBuffer.subarray(0, totalPduSize);
					rxBuffer = rxBuffer.subarray(totalPduSize);

					switch (pduType) {
						case PDU_A_ASSOCIATE_RQ: {
							// Разбор A-ASSOCIATE-RQ
							const negotiation = parseAssociateRqPdu(pdu);
							callingAe = negotiation.callingAe;
							presentationContexts = negotiation.contexts;

							// Отправка A-ASSOCIATE-AC
							const acPdu = buildAssociateAcPdu(
								negotiation.callingAe,
								negotiation.calledAe,
								negotiation.contexts,
								this.maxPduLength,
							);
							socket.write(acPdu);
							break;
						}

						case PDU_P_DATA_TF: {
							// Разбор PDVs внутри P-DATA-TF
							let pdvOffset = 6;
							while (pdvOffset + 4 <= pdu.length) {
								const pdvLength = pdu.readUInt32BE(pdvOffset);
								if (pdvLength < 2 || pdvOffset + 4 + pdvLength > pdu.length) {
									break;
								}

								const contextId = pdu.readUInt8(pdvOffset + 4);
								const controlHeader = pdu.readUInt8(pdvOffset + 5);
								const isCommand = (controlHeader & 0x01) !== 0;
								const isLast = (controlHeader & 0x02) !== 0;
								const payload = pdu.subarray(pdvOffset + 6, pdvOffset + 4 + pdvLength);
								pdvOffset += 4 + pdvLength;

								currentContextId = contextId;

								if (isCommand) {
									commandChunks.push(payload);
									if (isLast) {
										const fullCommandBuf = Buffer.concat(commandChunks);
										commandChunks = [];
										currentCommand = parseDimseCommand(fullCommandBuf);

										// C-ECHO-RQ
										if (currentCommand.commandField === COMMAND_C_ECHO_RQ) {
											this.totalCEchoReceived++;
											const rspPdu = buildCEchoRspPdu(contextId, currentCommand.messageId);
											socket.write(rspPdu);
											currentCommand = null;
										} else if (
											currentCommand.commandField === COMMAND_C_STORE_RQ &&
											!currentCommand.hasDataSet
										) {
											// C-STORE-RQ без DataSet (ошибочный запрос)
											this.totalCStoresFailed++;
											const rspPdu = buildCStoreRspPdu(
												contextId,
												currentCommand.messageId,
												currentCommand.affectedSopClassUid ?? "",
												currentCommand.affectedSopInstanceUid ?? "",
												STATUS_PROCESSING_FAILURE,
											);
											socket.write(rspPdu);
											currentCommand = null;
										}
									}
								} else {
									// Data Set PDV
									dataChunks.push(payload);
									if (isLast) {
										const fullDataSetBuf = Buffer.concat(dataChunks);
										dataChunks = [];

										if (currentCommand && currentCommand.commandField === COMMAND_C_STORE_RQ) {
											this.totalCStoresReceived++;
											const context = presentationContexts.get(contextId);
											const sopClassUid =
												currentCommand.affectedSopClassUid ||
												context?.abstractSyntax ||
												"1.2.840.10008.5.1.4.1.1.2";
											const sopInstanceUid =
												currentCommand.affectedSopInstanceUid ||
												`generated.sop.${Date.now()}`;
											const transferSyntaxUid =
												context?.acceptedTransferSyntax ||
												TRANSFER_SYNTAX_EXPLICIT_VR_LITTLE_ENDIAN;

											try {
												// Формируем полноценный Part 10 DICOM-файл
												const completeDicomBuffer = wrapInDicomPart10(
													fullDataSetBuf,
													sopClassUid,
													sopInstanceUid,
													transferSyntaxUid,
												);

												// Определяем организацию клиники
												const orgId = await this.resolveTargetOrganizationId();

												// Сохраняем исследование через Ingest-сервис
												await dicomStudyIngestService.ingestBuffer(completeDicomBuffer, {
													organizationId: orgId,
													sourceKind: "pacs",
													sourceName: `Vatech SCP (${callingAe})`,
												});

												this.totalCStoresSuccess++;

												// Ответ C-STORE-RSP SUCCESS
												const rspPdu = buildCStoreRspPdu(
													contextId,
													currentCommand.messageId,
													sopClassUid,
													sopInstanceUid,
													STATUS_SUCCESS,
												);
												socket.write(rspPdu);
											} catch {
												this.totalCStoresFailed++;
												const rspPdu = buildCStoreRspPdu(
													contextId,
													currentCommand.messageId,
													sopClassUid,
													sopInstanceUid,
													STATUS_PROCESSING_FAILURE,
												);
												socket.write(rspPdu);
											}

											currentCommand = null;
										}
									}
								}
							}
							break;
						}

						case PDU_A_RELEASE_RQ: {
							// Отправляем A-RELEASE-RP (0x06) и корректно закрываем соединение
							const releaseRp = Buffer.alloc(6);
							releaseRp.writeUInt8(PDU_A_RELEASE_RP, 0);
							releaseRp.writeUInt8(0x00, 1);
							releaseRp.writeUInt32BE(0, 2);
							socket.write(releaseRp, () => {
								socket.end();
							});
							break;
						}

						case PDU_A_ABORT: {
							socket.destroy();
							break;
						}

						default: {
							// Неизвестный PDU
							break;
						}
					}
				}
			} catch {
				// Ошибка разбора PDU, предотвращаем падение процесса
			}
		});

		socket.on("error", () => {
			// Обработка сетевого сбоя сокета
		});

		socket.on("close", () => {
			this.activeAssociations = Math.max(0, this.activeAssociations - 1);
		});
	}

	/**
	 * Резолвинг целевой организации для сохранения снимка.
	 */
	private async resolveTargetOrganizationId(): Promise<string> {
		if (this.defaultOrganizationId) {
			return this.defaultOrganizationId;
		}

		const [firstOrg] = await db
			.select({ id: schema.organizations.id })
			.from(schema.organizations)
			.limit(1);

		if (firstOrg) {
			this.defaultOrganizationId = firstOrg.id;
			return firstOrg.id;
		}

		throw new Error(
			"Не найдено ни одной организации в базе данных. Невозможно привязать PACS-исследование.",
		);
	}
}

export const dicomCStoreScpServer = new DicomCStoreScpServer();
