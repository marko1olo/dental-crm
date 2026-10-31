/**
 * Мандат 8e: Защита от потери клинических фотоснимков при обрыве связи
 */
export async function savePhotoOfflineDraft(
	blob: Blob,
	diaryId: string,
	visitId: string,
): Promise<void> {
	try {
		const { saveOfflineDraft } = await import(
			"../../../services/offline/index.js"
		);
		const reader = new FileReader();
		reader.onloadend = () => {
			const base64 = reader.result as string;
			if (base64) {
				void saveOfflineDraft(
					`photo_attachment_${diaryId}_${Date.now()}`,
					"DIARY_043_DRAFT",
					visitId,
					{
						diaryId,
						visitId,
						dataUrl: base64,
						capturedAt: new Date().toISOString(),
					},
				);
			}
		};
		reader.readAsDataURL(blob);
	} catch {
		/* non-fatal offline draft */
	}
}
