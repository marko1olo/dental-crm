/**
 * panoramicVolumeResolver.ts — Получение активного 3D объема для панорамного рендера
 * Mandate 8b: строго <= 120 строк.
 * Dogma 4: ликвидация процедурных генераторов фейковых костей.
 */

export function getActivePanoramicVolume(): any {
	if (typeof window !== "undefined") {
		const win = window as unknown as {
			__cbctActiveVolume?: any;
			__cbctDemoVolume?: any;
			__panoramicVolume?: any;
		};
		if (win.__panoramicVolume) return win.__panoramicVolume;
		const activeVol = win.__cbctActiveVolume || win.__cbctDemoVolume;
		if (activeVol && activeVol.data) {
			const { width, height, depth } = activeVol.dimensions;
			const scalarData = new Float32Array(activeVol.data.length);
			for (let i = 0; i < activeVol.data.length; i++) {
				scalarData[i] = activeVol.data[i];
			}
			const identityDirection = new Float32Array([
				1, 0, 0, 0,
				0, 1, 0, 0,
				0, 0, 1, 0,
				0, 0, 0, 1,
			]);
			return {
				scalarData,
				dimensions: [width, height, depth],
				origin: [activeVol.originMm?.x ?? 0, activeVol.originMm?.y ?? 0, activeVol.originMm?.z ?? 0],
				direction: identityDirection,
				spacing: [activeVol.spacingMm?.x ?? 0.25, activeVol.spacingMm?.y ?? 0.25, activeVol.spacingMm?.z ?? 0.25],
			};
		}
	}
	const width = 128;
	const height = 128;
	const depth = 64;
	const scalarData = new Float32Array(width * height * depth);
	scalarData.fill(-1000); // чистый воздух (-1000 HU) без синтетических фейковых шумов костей
	const identityDirection = new Float32Array([
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1,
	]);
	return {
		scalarData,
		dimensions: [width, height, depth],
		origin: [0, 0, 0],
		direction: identityDirection,
		spacing: [0.3, 0.3, 0.3],
	};
}
