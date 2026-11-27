import type { DicomViewerWorkbenchManifestResponse } from "@dental/shared";
import { normalizedLocalOrganizationId } from "../../AuthOnboardingHelpers";

export const imagingViewerLocalStoragePrefix = "dental-crm:imaging-viewer:";

export const dicomWorkbenchLocalStorageKey = "dental-crm:dicom-workbench:last";

export const localImagingFolderStorageKey =
	"dental-crm:local-imaging-folder:last";

export function imagingViewerLocalKey(
	studyId: string,
	organizationId: string | null | undefined = null,
): string {
	const normalizedOrganizationId = organizationId?.trim();
	return `${imagingViewerLocalStoragePrefix}${normalizedOrganizationId ? `${normalizedOrganizationId}:` : ""}${studyId}`;
}

export function dicomWorkbenchSeriesKey(
	manifest: DicomViewerWorkbenchManifestResponse,
): string {
	return (
		manifest.toolStateBundle.seriesRef.seriesInstanceUid ??
		manifest.launchManifest.seriesInstanceUid ??
		manifest.toolStateBundle.seriesRef.firstFilePath ??
		manifest.toolStateBundle.seriesRef.sourceName
	);
}

export function dicomWorkbenchIndexedDbKey(
	organizationId: string | null | undefined = null,
): string {
	const orgKey = normalizedLocalOrganizationId(organizationId) ?? "default";
	return `dicom-workbench:${orgKey}`;
}
