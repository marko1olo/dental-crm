import { decodeHeicImage } from "../../services/imaging/heicDecoder";

export interface CompressedCameraResult {
	uploadBlob: Blob;
	cleanup?: () => void;
}

export async function compressCameraFile(file: File): Promise<CompressedCameraResult> {
	try {
		const decoded = await decodeHeicImage(file, {
			targetFormat: "webp",
			quality: 0.88,
			maxDimension: 1920,
			preserveColorProfile: true,
			applyExifRotation: true,
		});
		const res = await fetch(decoded.dataUrl);
		if (!res.ok) throw new Error("HEIC_DECODE_FETCH_FAILED");
		const compressedBlob = await res.blob();
		return { uploadBlob: compressedBlob };
	} catch {
		const img = new Image();
		const localObjectUrl = URL.createObjectURL(file);
		await new Promise<void>((resolve, reject) => {
			img.onload = () => resolve();
			img.onerror = () => reject(new Error("FILE_NOT_IMAGE"));
			img.src = localObjectUrl;
		});

		const canvas = document.createElement("canvas");
		let width = img.width;
		let height = img.height;
		const MAX_SIZE = 1920;
		if (width > height && width > MAX_SIZE) {
			height = Math.round((height * MAX_SIZE) / width);
			width = MAX_SIZE;
		} else if (height > MAX_SIZE) {
			width = Math.round((width * MAX_SIZE) / height);
			height = MAX_SIZE;
		}
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d");
		let compressedBlob: Blob | null = null;
		if (ctx) {
			ctx.drawImage(img, 0, 0, width, height);
			compressedBlob = await new Promise<Blob | null>((resolve) =>
				canvas.toBlob(resolve, "image/webp", 0.85),
			);
		}
		return {
			uploadBlob: compressedBlob || file,
			cleanup: () => URL.revokeObjectURL(localObjectUrl),
		};
	}
}
