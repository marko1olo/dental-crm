/**
 * pduParser.ts — Разбор и сборка низкоуровневых протокольных PDU DICOM (PS 3.8 / PS 3.7):
 * - A-ASSOCIATE-RQ / A-ASSOCIATE-AC
 * - P-DATA-TF (PDV, DIMSE C-ECHO-RQ / C-ECHO-RSP, C-STORE-RQ / C-STORE-RSP)
 */

import {
	COMMAND_C_ECHO_RSP,
	COMMAND_C_STORE_RSP,
	PDU_A_ASSOCIATE_AC,
	PDU_P_DATA_TF,
	STATUS_SUCCESS,
	SUPPORTED_STORAGE_SOP_CLASSES,
	SUPPORTED_TRANSFER_SYNTAXES,
	TRANSFER_SYNTAX_IMPLICIT_VR_LITTLE_ENDIAN,
} from "../dicomProtocolConstants.js";
import type {
	AssociateNegotiationResult,
	ParsedDimseCommand,
	PresentationContextItem,
} from "./types.js";

/**
 * Кодирование строки в DICOM UI (UID) с четным выравниванием нулем.
 */
export function encodeDicomUid(uid: string): Buffer {
	let str = uid;
	if (str.length % 2 !== 0) {
		str += "\0";
	}
	return Buffer.from(str, "ascii");
}

/**
 * Кодирование строкового элемента в Implicit VR Little Endian.
 */
export function createDimseElement(group: number, element: number, valueBuffer: Buffer): Buffer {
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
export function createDimseUsElement(group: number, element: number, value: number): Buffer {
	const valBuf = Buffer.alloc(2);
	valBuf.writeUInt16LE(value, 0);
	return createDimseElement(group, element, valBuf);
}

/**
 * Сборка DIMSE команды с автоматическим вычислением Group Length (0000,0000).
 */
export function buildDimseCommand(elements: Buffer[]): Buffer {
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
export function parseDimseCommand(buffer: Buffer): ParsedDimseCommand {
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
 * Обертка DIMSE байтов в Presentation Data Value (PDV) и PDU P-DATA-TF (0x04).
 */
export function wrapDimseInPDataTf(contextId: number, data: Buffer, isCommand: boolean): Buffer {
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

/**
 * Сборка C-ECHO-RSP PDU.
 */
export function buildCEchoRspPdu(contextId: number, messageIdBeingRespondedTo: number): Buffer {
	const elements: Buffer[] = [
		createDimseElement(0x0000, 0x0002, encodeDicomUid("1.2.840.10008.1.1")),
		createDimseUsElement(0x0000, 0x0100, COMMAND_C_ECHO_RSP),
		createDimseUsElement(0x0000, 0x0120, messageIdBeingRespondedTo),
		createDimseUsElement(0x0000, 0x0800, 0x0101), // No Data Set present
		createDimseUsElement(0x0000, 0x0900, STATUS_SUCCESS),
	];

	const commandBytes = buildDimseCommand(elements);
	return wrapDimseInPDataTf(contextId, commandBytes, true);
}

/**
 * Сборка C-STORE-RSP PDU.
 */
export function buildCStoreRspPdu(
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
	return wrapDimseInPDataTf(contextId, commandBytes, true);
}

/**
 * Разбор A-ASSOCIATE-RQ (PS 3.8).
 */
export function parseAssociateRqPdu(pdu: Buffer): AssociateNegotiationResult {
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
export function buildAssociateAcPdu(
	callingAe: string,
	calledAe: string,
	contexts: Map<number, PresentationContextItem>,
	maxPduLength = 65536,
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
	maxLenSubBuf.writeUInt32BE(maxPduLength, 4);

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
