import type { CbctVoxelVolume } from "../../cbctMprMath";
import type { Volume3DClippingBox, Volume3DPresetId } from "./types";
import { DEFAULT_VOLUME_3D_CLIPPING_BOX } from "./types";
import { getVolume3DPreset } from "./presetsRegistry";
import { computeVolume3DRotationMatrix } from "./raymarchingGeometry";
import { executeRaymarchLoop } from "./raymarchInnerLoop";

export function renderCanvas2DPreviewSlice(
	canvas: HTMLCanvasElement,
	volume: CbctVoxelVolume | null,
	activePreset: Volume3DPresetId = "skull",
	yaw: number = 30,
	pitch: number = 12,
	zoom: number = 1.0,
	pan: { x: number; y: number } = { x: 0, y: 0 },
	width: number = 256,
	height: number = 256,
	isInteracting: boolean = false,
	clipping: Volume3DClippingBox = DEFAULT_VOLUME_3D_CLIPPING_BOX,
): void {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	if (!volume || !volume.data) {
		ctx.fillStyle = "#09090b";
		ctx.fillRect(0, 0, width, height);
		ctx.fillStyle = "#52525b";
		ctx.font = "12px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("Загрузите КЛКТ для 3D-реконструкции черепа", width / 2, height / 2);
		return;
	}

	const preset = getVolume3DPreset(activePreset);
	const rotMat = computeVolume3DRotationMatrix(yaw, pitch);
	const dim = volume.dimensions;
	const imgData = ctx.createImageData(width, height);
	const u32 = new Uint32Array(imgData.data.buffer);
	u32.fill(0xff0b0909);

	const maxDim = Math.max(dim.width, Math.max(dim.height, dim.depth));
	const scale = (Math.min(width, height) / maxDim) * zoom * 0.9;
	const invScale = 1.0 / (scale || 1);
	const subSample: number = isInteracting ? 4 : 2;
	const STEPS = isInteracting ? 16 : 24;
	const tNear = -maxDim * 0.55;
	const tFar = maxDim * 0.55;
	const dt = (tFar - tNear) / STEPS;

	executeRaymarchLoop({
		width, height, centerX: width / 2 + pan.x, centerY: height / 2 + pan.y,
		invScale, col0: rotMat[0]!, col1: rotMat[1]!, col2: rotMat[2]!,
		dimW: dim.width, dimH: dim.height, dimD: dim.depth,
		halfW: dim.width / 2, halfH: dim.height / 2, halfD: dim.depth / 2,
		sliceSize: dim.width * dim.height, data: volume.data, clipping,
		huMin: preset.huMin, huMax: preset.huMax,
		baseR: preset.colorRgb[0], baseG: preset.colorRgb[1], baseB: preset.colorRgb[2],
		subSample, STEPS, tNear,
		stepDx: rotMat[2]![0] * dt, stepDy: rotMat[2]![1] * dt, stepDz: rotMat[2]![2] * dt,
		isAirway: activePreset === "airway", isMip: activePreset === "mip", u32,
	});

	ctx.putImageData(imgData, 0, 0);

	ctx.save();
	ctx.fillStyle = "rgba(24, 24, 27, 0.85)";
	ctx.strokeStyle = "rgba(234, 179, 8, 0.4)";
	ctx.lineWidth = 1;
	const badgeW = 270;
	const badgeH = 22;
	const badgeX = Math.max(8, (width - badgeW) / 2);
	const badgeY = 8;
	if (typeof (ctx as any).roundRect === "function") {
		(ctx as any).roundRect(badgeX, badgeY, badgeW, badgeH, 4);
	} else {
		ctx.rect(badgeX, badgeY, badgeW, badgeH);
	}
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = "#facc15";
	ctx.font = "bold 10px monospace";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("WebGL2 офлайн • Легкий 2D превью-срез", badgeX + badgeW / 2, badgeY + badgeH / 2);
	ctx.restore();
}

export function renderCanvas2DVolumeRaymarching(
	canvas: HTMLCanvasElement,
	volume: CbctVoxelVolume | null,
	activePreset: Volume3DPresetId = "skull",
	yaw: number = 30,
	pitch: number = 12,
	zoom: number = 1.0,
	pan: { x: number; y: number } = { x: 0, y: 0 },
	width: number = 256,
	height: number = 256,
	isInteracting: boolean = false,
	clipping: Volume3DClippingBox = DEFAULT_VOLUME_3D_CLIPPING_BOX,
): void {
	renderCanvas2DPreviewSlice(
		canvas, volume, activePreset, yaw, pitch, zoom, pan, width, height, isInteracting, clipping,
	);
}
