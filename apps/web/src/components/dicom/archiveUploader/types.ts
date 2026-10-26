/**
 * types.ts — Типы для загрузчика и парсера архивов DICOM/КЛКТ (Мандат 8b <= 120 строк).
 */

export interface ParsedDicomResult {
	imageId: string;
	file: File;
}

export interface UseDicomArchiveUploaderProps {
	onImagesLoaded: (imageIds: string[]) => void;
	uploadToServer?: boolean | undefined;
	patientId?: string | null | undefined;
	doctorId?: string | null | undefined;
}

export interface SyncBadgeState {
	type: "synced" | "pending" | "syncing";
	text: string;
}
