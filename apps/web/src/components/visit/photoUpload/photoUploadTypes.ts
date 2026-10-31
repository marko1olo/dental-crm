export interface Attachment {
	id: string;
	url: string;
	name: string;
}

/** Снимок, готовый к печати в медицинскую карту приёма (blob: уже с токеном кабинета). */
export type DiaryPrintPhoto = {
	id: string;
	name: string;
	objectUrl: string;
};

export type AttachmentsLoadState =
	| { readonly phase: "loading" }
	| { readonly phase: "empty" }
	| { readonly phase: "ready" }
	| { readonly phase: "failed"; readonly status: number | null };

export interface UseVisitDiaryPhotoUploadOptions {
	visitId: string;
	diaryId: string | null;
	isLocked: boolean;
	onPrintPhotosChange?: (photos: readonly DiaryPrintPhoto[]) => void;
}
