/**
 * VisiographDicomByteBuilder.ts
 * Helper to build Explicit VR Little Endian byte streams for Part 10 DICOM.
 */

export class DicomByteBuilder {
	private chunks: Uint8Array[] = [];
	private totalLength = 0;

	public appendBytes(bytes: Uint8Array): void {
		this.chunks.push(bytes);
		this.totalLength += bytes.length;
	}

	public appendRawBytesTag(group: number, element: number, vr: string, data: Uint8Array): void {
		let raw = data;
		if (raw.length % 2 !== 0) {
			const p = new Uint8Array(raw.length + 1);
			p.set(raw, 0);
			raw = p;
		}
		const isExt = vr === "OB" || vr === "OW" || vr === "OF" || vr === "SQ" || vr === "UT" || vr === "UN";
		const header = new Uint8Array(isExt ? 12 : 8);
		const view = new DataView(header.buffer);
		view.setUint16(0, group, true);
		view.setUint16(2, element, true);
		header[4] = vr.charCodeAt(0);
		header[5] = vr.charCodeAt(1);
		if (isExt) view.setUint32(8, raw.length, true);
		else view.setUint16(6, raw.length, true);
		this.appendBytes(header);
		this.appendBytes(raw);
	}

	public appendString(group: number, element: number, vr: string, val: string): void {
		let bytes = new TextEncoder().encode(val);
		if (bytes.length % 2 !== 0) {
			const p = new Uint8Array(bytes.length + 1);
			p.set(bytes, 0);
			p[bytes.length] = vr === "UI" ? 0 : 32;
			bytes = p;
		}
		const isExt = vr === "OB" || vr === "OW" || vr === "OF" || vr === "SQ" || vr === "UT" || vr === "UN";
		const header = new Uint8Array(isExt ? 12 : 8);
		const view = new DataView(header.buffer);
		view.setUint16(0, group, true);
		view.setUint16(2, element, true);
		header[4] = vr.charCodeAt(0);
		header[5] = vr.charCodeAt(1);
		if (isExt) view.setUint32(8, bytes.length, true);
		else view.setUint16(6, bytes.length, true);
		this.appendBytes(header);
		this.appendBytes(bytes);
	}

	public appendUint16(group: number, element: number, vr: string, val: number): void {
		const h = new Uint8Array(8);
		const v = new DataView(h.buffer);
		v.setUint16(0, group, true);
		v.setUint16(2, element, true);
		h[4] = vr.charCodeAt(0);
		h[5] = vr.charCodeAt(1);
		v.setUint16(6, 2, true);
		const d = new Uint8Array(2);
		new DataView(d.buffer).setUint16(0, val, true);
		this.appendBytes(h);
		this.appendBytes(d);
	}

	public appendUint32(group: number, element: number, vr: string, val: number): void {
		const h = new Uint8Array(8);
		const v = new DataView(h.buffer);
		v.setUint16(0, group, true);
		v.setUint16(2, element, true);
		h[4] = vr.charCodeAt(0);
		h[5] = vr.charCodeAt(1);
		v.setUint16(6, 4, true);
		const d = new Uint8Array(4);
		new DataView(d.buffer).setUint32(0, val, true);
		this.appendBytes(h);
		this.appendBytes(d);
	}

	public appendPixelData(group: number, element: number, pixelBytes: Uint8Array): void {
		let raw = pixelBytes;
		if (raw.length % 2 !== 0) {
			const p = new Uint8Array(raw.length + 1);
			p.set(raw, 0);
			raw = p;
		}
		const h = new Uint8Array(12);
		const v = new DataView(h.buffer);
		v.setUint16(0, group, true);
		v.setUint16(2, element, true);
		h[4] = "O".charCodeAt(0);
		h[5] = "B".charCodeAt(0);
		v.setUint32(8, raw.length, true);
		this.appendBytes(h);
		this.appendBytes(raw);
	}

	public appendPixelData16(group: number, element: number, pixelWords: Uint16Array): void {
		const byteLen = pixelWords.length * 2;
		const raw = new Uint8Array(pixelWords.buffer, pixelWords.byteOffset, byteLen);
		const h = new Uint8Array(12);
		const v = new DataView(h.buffer);
		v.setUint16(0, group, true);
		v.setUint16(2, element, true);
		h[4] = "O".charCodeAt(0);
		h[5] = "W".charCodeAt(0);
		v.setUint32(8, byteLen, true);
		this.appendBytes(h);
		this.appendBytes(raw);
	}

	public toUint8Array(): Uint8Array {
		const res = new Uint8Array(this.totalLength);
		let off = 0;
		for (const chunk of this.chunks) {
			res.set(chunk, off);
			off += chunk.length;
		}
		return res;
	}
}
