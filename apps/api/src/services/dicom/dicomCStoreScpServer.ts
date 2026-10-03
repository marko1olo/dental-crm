/**
 * dicomCStoreScpServer.ts — Высокопроизводительный сервер DICOM C-STORE SCP (Storage Service Class Provider)
 * и C-ECHO SCP (Verification).
 * 
 * Обеспечивает:
 * 1. Сетевой протокол DICOM Upper Layer Protocol (PS 3.8 / PS 3.7) через node:net.
 * 2. Согласование ассоциаций A-ASSOCIATE-RQ / A-ASSOCIATE-AC с поддержкой SOP-классов Vatech
 *    (CT Image Storage, Digital Intraoral X-Ray, Panoramic X-Ray, Secondary Capture, C-ECHO).
 * 3. Прием потоков P-DATA-TF с фрагментацией и сборкой DIMSE-команд (C-STORE-RQ, C-ECHO-RQ).
 * 4. Конструкцию стандартного DICOM Part 10 конверта (128-byte preamble + DICM + Group 0002).
 * 5. Автоматическую передачу в DicomStudyIngestService (сохранение на диск, база PostgreSQL 18, WebSocket).
 * 6. Ответ клиенту C-STORE-RSP / C-ECHO-RSP со статусом SUCCESS (0x0000).
 * 7. Корректное завершение ассоциации A-RELEASE-RQ / A-RELEASE-RP.
 */

import net from "node:net";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import {
	COMMAND_C_ECHO_RQ,
	COMMAND_C_ECHO_RSP,
	COMMAND_C_STORE_RQ,
	COMMAND_C_STORE_RSP,
	DEFAULT_DICOM_CALLED_AE,
	DEFAULT_DICOM_SCP_PORT,
	PDU_A_ABORT,
	PDU_A_ASSOCIATE_AC,
	PDU_A_ASSOCIATE_RQ,
	PDU_A_RELEASE_RP,
	PDU_A_RELEASE_RQ,
	PDU_P_DATA_TF,
	STATUS_PROCESSING_FAILURE,
	STATUS_SUCCESS,
	SUPPORTED_STORAGE_SOP_CLASSES,
	SUPPORTED_TRANSFER_SYNTAXES,
	TRANSFER_SYNTAX_EXPLICIT_VR_LITTLE_ENDIAN,
	TRANSFER_SYNTAX_IMPLICIT_VR_LITTLE_ENDIAN,
} from "./dicomProtocolConstants.js";
import {
	type IngestDicomResult,
	dicomStudyIngestService,
} from "./dicomStudyIngestService.js";

export interface DicomScpServerOptions {
	port?: number;
	calledAeTitle?: string;
	defaultOrganizationId?: string;
	maxPduLength?: number;
}

export interface DicomScpServerStats {
	isRunning: boolean;
	port: number;
	calledAeTitle: string;
	defaultOrganizationId: string | null;
	totalAssociations: number;
	activeAssociations: number;
	totalCStoresReceived: number;
	totalCStoresSuccess: number;
	totalCStoresFailed: number;
	totalCEchoReceived: number;
	lastActivityAt: string | null;
}

interface PresentationContextItem {
	id: number;
	abstractSyntax: string;
	transferSyntaxes: string[];
	acceptedTransferSyntax: string | null;
	resultReason: number; // 0 = accepted, 3 = abstract syntax not supported, 4 = transfer syntax not supported
}

interface ParsedDimseCommand {
	commandField: number;
	messageId: number;
	affectedSopClassUid: string | null;
	affectedSopInstanceUid: string | null;
	hasDataSet: boolean;
	status?: number | undefined;
}

/**
 * Кодирование строки в DICOM UI (UID) с четным выравниванием нулем.
 */
function encodeDicomUid(uid: string): Buffer {
	let str = uid;
	if (str.length % 2 !== 0) {
		str += "\0";
	}
	return Buffer.from(str, "ascii");
}

/**
 * Кодирование строкового элемента в Implicit VR Little Endian.
 */
function createDimseElement(group: number, element: number, valueBuffer: Buffer): Buffer {
	let buf = valueBuffer;
	if (buf.length % 2 !== 0) {
		buf = Buffer.concat([buf, Buffer.from([0x00])]);
	}
	const header = Buffer.alloc(8);
	header.writeUInt16LE(group, 0);
	header.writeUInt16LE(element, 2);
	header.writeUInt32LE(buf.length, 4);
	return Buffer.concat([header, buf]);
}

/**
 * Создание US (Unsigned Short) элемента в Implicit VR Little Endian.
 */
function createDimseUsElement(group: number, element: number, value: number): Buffer {
	const valBuf = Buffer.alloc(2);
	valBuf.writeUInt16LE(value, 0);
	return createDimseElement(group, element, valBuf);
}

/**
 * Сборка DIMSE команды с автоматическим вычислением Group Length (0000,0000).
 */
function buildDimseCommand(elements: Buffer[]): Buffer {
	let dataLen = 0;
	for (const el of elements) {
		dataLen += el.length;
	}
	const groupLengthElement = Buffer.alloc(12);
	groupLengthElement.writeUInt16LE(0x0000, 0);
	groupLengthElement.writeUInt16LE(0x0000, 2);
	groupLengthElement.writeUInt32LE(4, 4);
	groupLengthElement.writeUInt32LE(dataLen, 8);

	return Buffer.concat([groupLengthElement, ...elements]);
}

/**
 * Парсинг DIMSE команды из Implicit VR Little Endian буфера.
 */
function parseDimseCommand(buffer: Buffer): ParsedDimseCommand {
	let offset = 0;
	let commandField = 0;
	let messageId = 0;
	let affectedSopClassUid: string | null = null;
	let affectedSopInstanceUid: string | null = null;
	let hasDataSet = false;
	let status: number | undefined;

	while (offset + 8 <= buffer.length) {
		const group = buffer.readUInt16LE(offset);
		const element = buffer.readUInt16LE(offset + 2);
		const length = buffer.readUInt32LE(offset + 4);
		offset += 8;

		if (offset + length > buffer.length) {
			break;
		}

		const valBuf = buffer.subarray(offset, offset + length);
		offset += length;

		if (group === 0x0000) {
			if (element === 0x0100 && valBuf.length >= 2) {
				commandField = valBuf.readUInt16LE(0);
			} else if (element === 0x0110 && valBuf.length >= 2) {
				messageId = valBuf.readUInt16LE(0);
			} else if (element === 0x0002) {
				affectedSopClassUid = valBuf.toString("ascii").replace(/\0+$/, "").trim();
			} else if (element === 0x1000) {
				affectedSopInstanceUid = valBuf.toString("ascii").replace(/\0+$/, "").trim();
			} else if (element === 0x0800 && valBuf.length >= 2) {
				// 0x0101 = No Data Set present
				const dataSetType = valBuf.readUInt16LE(0);
				hasDataSet = dataSetType !== 0x0101;
			} else if (element === 0x0900 && valBuf.length >= 2) {
				status = valBuf.readUInt16LE(0);
			}
		}
	}

	return {
		commandField,
		messageId,
		affectedSopClassUid,
		affectedSopInstanceUid,
		hasDataSet,
		status,
	};
}

/**
 * Создание валидного Part 10 DICOM файла (128-byte preamble + DICM + Group 0002 File Meta Header)
 * из сырого потока C-STORE Data Set.
 */
export function wrapInDicomPart10(
	dataSetBytes: Buffer,
	sopClassUid: string,
	sopInstanceUid: string,
	transferSyntaxUid = TRANSFER_SYNTAX_EXPLICIT_VR_LITTLE_ENDIAN,
): Buffer {
	// Если буфер уже содержит сигнатуру DICOM на смещении 128
	if (
		dataSetBytes.length >= 132 &&
		dataSetBytes[128] === 0x44 && // D
		dataSetBytes[129] === 0x49 && // I
		dataSetBytes[130] === 0x43 && // C
		dataSetBytes[131] === 0x4d // M
	) {
		return dataSetBytes;
	}

	// Построение элементов Group 0002 в Explicit VR Little Endian
	const metaElements: Buffer[] = [];

	// (0002,0001) OB FileMetaInformationVersion = 00 01
	const versionBuf = Buffer.alloc(12);
	versionBuf.writeUInt16LE(0x0002, 0);
	versionBuf.writeUInt16LE(0x0001, 2);
	versionBuf.write("OB", 4, 2, "ascii");
	versionBuf.writeUInt16LE(0x0000, 6); // Reserved
	versionBuf.writeUInt32LE(2, 8); // Length
	metaElements.push(Buffer.concat([versionBuf, Buffer.from([0x00, 0x01])]));

	// Вспомогательная функция для создания Explicit VR элементов
	const addExplicitStringElement = (
		element: number,
		vr: string,
		strValue: string,
		padChar = "\0",
	) => {
		let val = strValue;
		if (val.length % 2 !== 0) {
			val += padChar;
		}
		const valBuf = Buffer.from(val, "ascii");
		const header = Buffer.alloc(8);
		header.writeUInt16LE(0x0002, 0);
		header.writeUInt16LE(element, 2);
		header.write(vr, 4, 2, "ascii");
		header.writeUInt16LE(valBuf.length, 6);
		metaElements.push(Buffer.concat([header, valBuf]));
	};

	// (0002,0002) UI MediaStorageSOPClassUID
	addExplicitStringElement(0x0002, "UI", sopClassUid);

	// (0002,0003) UI MediaStorageSOPInstanceUID
	addExplicitStringElement(0x0003, "UI", sopInstanceUid);

	// (0002,0010) UI TransferSyntaxUID
	addExplicitStringElement(0x0010, "UI", transferSyntaxUid);

	// (0002,0012) UI ImplementationClassUID
	addExplicitStringElement(0x0012, "UI", "1.2.826.0.1.3680043.9.7123.1");

	// (0002,0013) SH ImplementationVersionName
	addExplicitStringElement(0x0013, "SH", "DENTE_PACS_1_0", " ");

	// Вычисление FileMetaInformationGroupLength (0002,0000) UL
	let metaLength = 0;
	for (const el of metaElements) {
		metaLength += el.length;
	}

	const groupLengthBuf = Buffer.alloc(12);
	groupLengthBuf.writeUInt16LE(0x0002, 0);
	groupLengthBuf.writeUInt16LE(0x0000, 2);
	groupLengthBuf.write("UL", 4, 2, "ascii");
	groupLengthBuf.writeUInt16LE(4, 6);
	groupLengthBuf.writeUInt32LE(metaLength, 8);

	// Preamble (128 байт 0x00) + "DICM" (4 байта)
	const preamble = Buffer.alloc(132, 0);
	preamble.write("DICM", 128, 4, "ascii");

	return Buffer.concat([preamble, groupLengthBuf, ...metaElements, dataSetBytes]);
}

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
							const negotiation = this.handleAssociateRq(pdu);
							callingAe = negotiation.callingAe;
							presentationContexts = negotiation.contexts;

							// Отправка A-ASSOCIATE-AC
							const acPdu = this.buildAssociateAcPdu(
								negotiation.callingAe,
								negotiation.calledAe,
								negotiation.contexts,
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
											const rspPdu = this.buildCEchoRspPdu(contextId, currentCommand.messageId);
											socket.write(rspPdu);
											currentCommand = null;
										} else if (
											currentCommand.commandField === COMMAND_C_STORE_RQ &&
											!currentCommand.hasDataSet
										) {
											// C-STORE-RQ без DataSet (ошибочный запрос)
											this.totalCStoresFailed++;
											const rspPdu = this.buildCStoreRspPdu(
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
												const rspPdu = this.buildCStoreRspPdu(
													contextId,
													currentCommand.messageId,
													sopClassUid,
													sopInstanceUid,
													STATUS_SUCCESS,
												);
												socket.write(rspPdu);
											} catch {
												this.totalCStoresFailed++;
												const rspPdu = this.buildCStoreRspPdu(
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

	/**
	 * Разбор A-ASSOCIATE-RQ (PS 3.8).
	 */
	private handleAssociateRq(pdu: Buffer): {
		callingAe: string;
		calledAe: string;
		contexts: Map<number, PresentationContextItem>;
	} {
		const calledAe = pdu.subarray(10, 26).toString("ascii").trim();
		const callingAe = pdu.subarray(26, 42).toString("ascii").trim();
		const contexts = new Map<number, PresentationContextItem>();

		let offset = 74; // Смещение первых переменных элементов
		while (offset + 4 <= pdu.length) {
			const itemType = pdu.readUInt8(offset);
			const itemLength = pdu.readUInt16BE(offset + 2);
			const itemEnd = offset + 4 + itemLength;

			if (itemEnd > pdu.length) break;

			if (itemType === 0x20) {
				// Presentation Context RQ Item
				const contextId = pdu.readUInt8(offset + 4);
				let abstractSyntax = "";
				const transferSyntaxes: string[] = [];

				let subOffset = offset + 8;
				while (subOffset + 4 <= itemEnd) {
					const subType = pdu.readUInt8(subOffset);
					const subLength = pdu.readUInt16BE(subOffset + 2);
					const subEnd = subOffset + 4 + subLength;

					if (subEnd > itemEnd) break;

					if (subType === 0x30) {
						// Abstract Syntax
						abstractSyntax = pdu.subarray(subOffset + 4, subEnd).toString("ascii").trim();
					} else if (subType === 0x40) {
						// Transfer Syntax
						const ts = pdu.subarray(subOffset + 4, subEnd).toString("ascii").trim();
						transferSyntaxes.push(ts);
					}

					subOffset = subEnd;
				}

				// Проверка поддержки SOP-класса
				const isAbstractSupported =
					SUPPORTED_STORAGE_SOP_CLASSES.has(abstractSyntax) ||
					abstractSyntax.startsWith("1.2.840.10008.");

				let acceptedTs: string | null = null;
				let resultReason = 3; // Abstract Syntax Not Supported

				if (isAbstractSupported) {
					// Ищем первый поддерживаемый Transfer Syntax
					for (const ts of transferSyntaxes) {
						if (SUPPORTED_TRANSFER_SYNTAXES.has(ts)) {
							acceptedTs = ts;
							resultReason = 0; // Acceptance
							break;
						}
					}
					if (!acceptedTs) {
						resultReason = 4; // Transfer Syntax Not Supported
					}
				}

				contexts.set(contextId, {
					id: contextId,
					abstractSyntax,
					transferSyntaxes,
					acceptedTransferSyntax: acceptedTs,
					resultReason,
				});
			}

			offset = itemEnd;
		}

		return { callingAe, calledAe, contexts };
	}

	/**
	 * Сборка PDU A-ASSOCIATE-AC (0x02).
	 */
	private buildAssociateAcPdu(
		callingAe: string,
		calledAe: string,
		contexts: Map<number, PresentationContextItem>,
	): Buffer {
		const fixedHeader = Buffer.alloc(68);
		fixedHeader.writeUInt16BE(0x0001, 0); // Protocol version 1
		fixedHeader.writeUInt16BE(0x0000, 2); // Reserved

		// Called AE (16 bytes, space padded)
		fixedHeader.fill(0x20, 4, 20);
		fixedHeader.write(calledAe.slice(0, 16), 4, "ascii");

		// Calling AE (16 bytes, space padded)
		fixedHeader.fill(0x20, 20, 36);
		fixedHeader.write(callingAe.slice(0, 16), 20, "ascii");

		// Reserved 32 bytes 0x00 (36..68)

		// 1. Application Context Item (type 0x10)
		const appCtxUid = "1.2.840.10008.3.1.1.1";
		const appCtxBuf = Buffer.alloc(4 + appCtxUid.length);
		appCtxBuf.writeUInt8(0x10, 0);
		appCtxBuf.writeUInt8(0x00, 1);
		appCtxBuf.writeUInt16BE(appCtxUid.length, 2);
		appCtxBuf.write(appCtxUid, 4, "ascii");

		// 2. Presentation Context AC Items (type 0x21)
		const contextBuffers: Buffer[] = [];
		for (const ctx of contexts.values()) {
			const tsUid = ctx.acceptedTransferSyntax ?? TRANSFER_SYNTAX_IMPLICIT_VR_LITTLE_ENDIAN;
			const tsSubBuf = Buffer.alloc(4 + tsUid.length);
			tsSubBuf.writeUInt8(0x40, 0);
			tsSubBuf.writeUInt8(0x00, 1);
			tsSubBuf.writeUInt16BE(tsUid.length, 2);
			tsSubBuf.write(tsUid, 4, "ascii");

			const ctxItemBuf = Buffer.alloc(8 + tsSubBuf.length);
			ctxItemBuf.writeUInt8(0x21, 0);
			ctxItemBuf.writeUInt8(0x00, 1);
			ctxItemBuf.writeUInt16BE(4 + tsSubBuf.length, 2);
			ctxItemBuf.writeUInt8(ctx.id, 4);
			ctxItemBuf.writeUInt8(0x00, 5); // Reserved
			ctxItemBuf.writeUInt8(ctx.resultReason, 6); // Result: 0 = Acceptance
			ctxItemBuf.writeUInt8(0x00, 7); // Reserved
			tsSubBuf.copy(ctxItemBuf, 8);

			contextBuffers.push(ctxItemBuf);
		}

		// 3. User Information Item (type 0x50)
		// Max length sub-item (type 0x51)
		const maxLenSubBuf = Buffer.alloc(8);
		maxLenSubBuf.writeUInt8(0x51, 0);
		maxLenSubBuf.writeUInt8(0x00, 1);
		maxLenSubBuf.writeUInt16BE(4, 2);
		maxLenSubBuf.writeUInt32BE(this.maxPduLength, 4);

		// Implementation Class UID sub-item (type 0x52)
		const implClassUid = "1.2.826.0.1.3680043.9.7123.1";
		const implSubBuf = Buffer.alloc(4 + implClassUid.length);
		implSubBuf.writeUInt8(0x52, 0);
		implSubBuf.writeUInt8(0x00, 1);
		implSubBuf.writeUInt16BE(implClassUid.length, 2);
		implSubBuf.write(implClassUid, 4, "ascii");

		const userItemLen = maxLenSubBuf.length + implSubBuf.length;
		const userItemBuf = Buffer.alloc(4 + userItemLen);
		userItemBuf.writeUInt8(0x50, 0);
		userItemBuf.writeUInt8(0x00, 1);
		userItemBuf.writeUInt16BE(userItemLen, 2);
		maxLenSubBuf.copy(userItemBuf, 4);
		implSubBuf.copy(userItemBuf, 4 + maxLenSubBuf.length);

		// Общий PDU буфер
		const payload = Buffer.concat([
			fixedHeader,
			appCtxBuf,
			...contextBuffers,
			userItemBuf,
		]);

		const pduHeader = Buffer.alloc(6);
		pduHeader.writeUInt8(PDU_A_ASSOCIATE_AC, 0);
		pduHeader.writeUInt8(0x00, 1);
		pduHeader.writeUInt32BE(payload.length, 2);

		return Buffer.concat([pduHeader, payload]);
	}

	/**
	 * Сборка C-ECHO-RSP PDU.
	 */
	private buildCEchoRspPdu(contextId: number, messageIdBeingRespondedTo: number): Buffer {
		const elements: Buffer[] = [
			createDimseElement(0x0000, 0x0002, encodeDicomUid("1.2.840.10008.1.1")),
			createDimseUsElement(0x0000, 0x0100, COMMAND_C_ECHO_RSP),
			createDimseUsElement(0x0000, 0x0120, messageIdBeingRespondedTo),
			createDimseUsElement(0x0000, 0x0800, 0x0101), // No Data Set present
			createDimseUsElement(0x0000, 0x0900, STATUS_SUCCESS),
		];

		const commandBytes = buildDimseCommand(elements);
		return this.wrapDimseInPDataTf(contextId, commandBytes, true);
	}

	/**
	 * Сборка C-STORE-RSP PDU.
	 */
	private buildCStoreRspPdu(
		contextId: number,
		messageIdBeingRespondedTo: number,
		sopClassUid: string,
		sopInstanceUid: string,
		status: number,
	): Buffer {
		const elements: Buffer[] = [
			createDimseElement(0x0000, 0x0002, encodeDicomUid(sopClassUid)),
			createDimseUsElement(0x0000, 0x0100, COMMAND_C_STORE_RSP),
			createDimseUsElement(0x0000, 0x0120, messageIdBeingRespondedTo),
			createDimseUsElement(0x0000, 0x0800, 0x0101), // No Data Set present
			createDimseUsElement(0x0000, 0x0900, status),
		];

		if (sopInstanceUid) {
			elements.push(createDimseElement(0x0000, 0x1000, encodeDicomUid(sopInstanceUid)));
		}

		const commandBytes = buildDimseCommand(elements);
		return this.wrapDimseInPDataTf(contextId, commandBytes, true);
	}

	/**
	 * Обертка DIMSE байтов в Presentation Data Value (PDV) и PDU P-DATA-TF (0x04).
	 */
	private wrapDimseInPDataTf(contextId: number, data: Buffer, isCommand: boolean): Buffer {
		const pdvLength = 2 + data.length; // 1 byte contextId + 1 byte controlHeader + data
		const pdvHeader = Buffer.alloc(6);
		pdvHeader.writeUInt32BE(pdvLength, 0);
		pdvHeader.writeUInt8(contextId, 4);
		// Control Header: bit 0 = isCommand (1) or Data (0), bit 1 = isLast (always 1 for single response)
		const controlHeader = (isCommand ? 0x01 : 0x00) | 0x02;
		pdvHeader.writeUInt8(controlHeader, 5);

		const pdv = Buffer.concat([pdvHeader, data]);

		const pduHeader = Buffer.alloc(6);
		pduHeader.writeUInt8(PDU_P_DATA_TF, 0);
		pduHeader.writeUInt8(0x00, 1);
		pduHeader.writeUInt32BE(pdv.length, 2);

		return Buffer.concat([pduHeader, pdv]);
	}
}

export const dicomCStoreScpServer = new DicomCStoreScpServer();
