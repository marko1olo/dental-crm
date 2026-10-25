/**
 * VisiographDicomMetaBlock.ts
 * Builds standard Group 0002 File Meta Information block including Group Length.
 */

import { DicomByteBuilder } from "./VisiographDicomByteBuilder";

export function buildFileMetaInformationBlock(
	sopClassUid: string,
	sopInstanceUid: string,
	transferSyntaxUid = "1.2.840.10008.1.2.1",
): Uint8Array {
	const metaContent = new DicomByteBuilder();
	metaContent.appendRawBytesTag(0x0002, 0x0001, "OB", new Uint8Array([0x00, 0x01]));
	metaContent.appendString(0x0002, 0x0002, "UI", sopClassUid);
	metaContent.appendString(0x0002, 0x0003, "UI", sopInstanceUid);
	metaContent.appendString(0x0002, 0x0010, "UI", transferSyntaxUid);
	metaContent.appendString(0x0002, 0x0012, "UI", "1.2.826.0.1.3680043.10.100.1");
	metaContent.appendString(0x0002, 0x0013, "SH", "DENTE_RVG_1_0");

	const metaBytes = metaContent.toUint8Array();
	const group0002 = new DicomByteBuilder();
	group0002.appendUint32(0x0002, 0x0000, "UL", metaBytes.length);
	group0002.appendBytes(metaBytes);
	return group0002.toUint8Array();
}
