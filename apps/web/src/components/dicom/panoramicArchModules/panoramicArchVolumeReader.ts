export interface VolumeScalarDataSource {
	/** [columns, rows, slices] of the volume. */
	dimensions?: ArrayLike<number> | undefined;
	/** One imageId per slice, in slice order. */
	imageIds?: readonly string[] | undefined;
	voxelManager?: {
		getCompleteScalarDataArray?: (() => ArrayLike<number>) | undefined;
		getScalarData?: ((storeScalarData?: boolean) => ArrayLike<number>) | undefined;
	} | undefined;
}

export type PanoramicVolumeResult =
	| {
			status: "ready";
			scalarData: ArrayLike<number>;
			voxelCount: number;
	  }
	| { status: "unavailable"; reason: "volume_not_ready" };

function expectedVoxelCount(
	dimensions: ArrayLike<number> | undefined,
): number | null {
	if (!dimensions || dimensions.length < 3) return null;
	let count = 1;
	for (let axis = 0; axis < 3; axis++) {
		const size = dimensions[axis];
		if (typeof size !== "number" || !Number.isFinite(size) || size < 1) {
			return null;
		}
		count *= Math.floor(size);
	}
	return count;
}

function readWithoutThrowing(
	read: () => ArrayLike<number> | undefined,
): ArrayLike<number> | undefined {
	try {
		return read();
	} catch {
		return undefined;
	}
}

/**
 * Reads voxels the panorama will be sampled from, or refuses.
 */
export function readVolumeScalarData(
	volume: VolumeScalarDataSource | null | undefined,
	isSliceDecoded?: ((imageId: string) => boolean) | undefined,
): PanoramicVolumeResult {
	const notReady: PanoramicVolumeResult = {
		status: "unavailable",
		reason: "volume_not_ready",
	};
	if (!volume) return notReady;

	const voxelCount = expectedVoxelCount(volume.dimensions);
	if (voxelCount === null) return notReady;

	if (isSliceDecoded && volume.imageIds) {
		if (volume.imageIds.length === 0) return notReady;
		for (const imageId of volume.imageIds) {
			if (!isSliceDecoded(imageId)) return notReady;
		}
	}

	const manager = volume.voxelManager;
	if (!manager) return notReady;

	const fromImageCache = readWithoutThrowing(() =>
		manager.getCompleteScalarDataArray?.(),
	);
	if (fromImageCache && fromImageCache.length >= voxelCount) {
		return { status: "ready", scalarData: fromImageCache, voxelCount };
	}

	const fromLegacyAccessor = readWithoutThrowing(() =>
		manager.getScalarData?.(),
	);
	if (fromLegacyAccessor && fromLegacyAccessor.length >= voxelCount) {
		return { status: "ready", scalarData: fromLegacyAccessor, voxelCount };
	}

	return notReady;
}
