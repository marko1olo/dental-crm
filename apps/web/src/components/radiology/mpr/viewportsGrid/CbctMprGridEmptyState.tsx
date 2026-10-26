/**
 * CbctMprGridEmptyState.tsx — Дропзона при отсутствии загруженного объема (Мандат 8b).
 */

import React from "react";
import { CbctEmptyVolumeDropzone } from "../CbctEmptyVolumeDropzone";

export interface CbctMprGridEmptyStateProps {
	readonly dicomLoadingStatus: string | null;
	readonly dicomProgress: number;
	readonly folderInputRef: React.RefObject<HTMLInputElement | null>;
	readonly zipInputRef: React.RefObject<HTMLInputElement | null>;
	readonly handleDicomFilesChange: (files: FileList | File[]) => void;
	readonly onLoadDemoVolume?: (() => void) | undefined;
}

export const CbctMprGridEmptyState: React.FC<CbctMprGridEmptyStateProps> = ({
	dicomLoadingStatus,
	dicomProgress,
	folderInputRef,
	zipInputRef,
	handleDicomFilesChange,
	onLoadDemoVolume,
}) => {
	return (
		<CbctEmptyVolumeDropzone
			loadingStatus={dicomLoadingStatus}
			progress={dicomProgress}
			folderInputRef={folderInputRef}
			zipInputRef={zipInputRef}
			onFilesChange={handleDicomFilesChange}
			onLoadDemoVolume={onLoadDemoVolume}
		/>
	);
};
