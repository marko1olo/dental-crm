import React from "react";

export interface ImagingHiddenInputsProps {
	attachBrowserDirectoryInputRef?: React.RefObject<HTMLInputElement | null>;
	browserImagingFilesInputRef: React.RefObject<HTMLInputElement | null>;
	cameraCaptureInputRef: React.RefObject<HTMLInputElement | null>;
	browserImagingFileInputAccept?: string | undefined;
	handleBrowserDirectoryInputChange: (files: FileList | null) => void;
	handleCameraPhotoCapture: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ImagingHiddenInputs({
	attachBrowserDirectoryInputRef,
	browserImagingFilesInputRef,
	cameraCaptureInputRef,
	browserImagingFileInputAccept,
	handleBrowserDirectoryInputChange,
	handleCameraPhotoCapture,
}: ImagingHiddenInputsProps) {
	return (
		<>
			<input
				ref={attachBrowserDirectoryInputRef}
				data-testid="imaging-browser-local-folder-input"
				type="file"
				multiple
				style={{ display: "none" }}
				onChange={(event) => void handleBrowserDirectoryInputChange(event.target.files)}
			/>
			<input
				ref={browserImagingFilesInputRef}
				data-testid="imaging-browser-local-files-input"
				type="file"
				multiple
				style={{ display: "none" }}
				accept={browserImagingFileInputAccept}
				onChange={(event) => {
					const input = event.currentTarget;
					void Promise.resolve(handleBrowserDirectoryInputChange(input.files)).finally(() => {
						input.value = "";
					});
				}}
			/>
			<input
				ref={cameraCaptureInputRef}
				data-testid="imaging-camera-capture-input"
				type="file"
				accept="image/*"
				capture="environment"
				style={{ display: "none" }}
				onChange={handleCameraPhotoCapture}
			/>
		</>
	);
}
