/**
 * tensorPreprocess.ts — Легковесное определение габаритов снимка ТРГ (Мандат 8wx / Anti-OOM).
 * 
 * ПОЛНЫЙ ВЫКОС ТЯЖЕЛЫХ ТЕНЗОРОВ: Устранено выделение 1.76M Float32Array и попиксельная
 * нормализация в 2D Canvas, приводящая к скачкам памяти хоста.
 */

export async function prepareImageTensor(
	imageSource: CanvasImageSource | string,
	targetWidth = 768,
	targetHeight = 768,
	fallbackWidth = 1200,
	fallbackHeight = 896,
): Promise<{ tensorData: Float32Array; naturalWidth: number; naturalHeight: number }> {
	let naturalWidth = fallbackWidth;
	let naturalHeight = fallbackHeight;

	if (typeof imageSource === "string") {
		if (typeof Image !== "undefined") {
			try {
				await new Promise<void>((resolve, reject) => {
					const imgElement = new Image();
					imgElement.crossOrigin = "anonymous";
					imgElement.onload = () => {
						naturalWidth = imgElement.naturalWidth || fallbackWidth;
						naturalHeight = imgElement.naturalHeight || fallbackHeight;
						resolve();
					};
					imgElement.onerror = (e) => reject(e);
					imgElement.src = imageSource;
				});
			} catch {
				// use fallback dimensions
			}
		}
	} else if (typeof HTMLImageElement !== "undefined" && imageSource instanceof HTMLImageElement) {
		naturalWidth = imageSource.naturalWidth || fallbackWidth;
		naturalHeight = imageSource.naturalHeight || fallbackHeight;
	} else if (typeof imageSource === "object" && imageSource !== null && "width" in imageSource && "height" in imageSource) {
		naturalWidth = Number(imageSource.width) || fallbackWidth;
		naturalHeight = Number(imageSource.height) || fallbackHeight;
	}

	// Легковесный массив нулевой длины вместо пожирателя ОЗУ
	return {
		tensorData: new Float32Array(0),
		naturalWidth,
		naturalHeight,
	};
}
