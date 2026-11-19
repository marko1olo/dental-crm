import type React from "react";
import type { DicomSeriesPreviewGroup, DicomSeriesPreviewResponse } from "@dental/shared";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../../useSettingsDerivations";
import {
	DicomCapabilityHeader,
	DicomMprWorkbenchPanel,
	DicomSeriesLabPanel,
	type DicomMprWorkbenchPropsBag,
} from "./dicomCapability";

export type * from "./dicomCapability";
export * from "./dicomCapability";

export function SourcesDicomCapability() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as DicomMprWorkbenchPropsBag;

	const imagingViewerCapabilities = mergedProps["imagingViewerCapabilities"];
	const previewDicomSeries = typeof mergedProps["previewDicomSeries"] === "function" ? (mergedProps["previewDicomSeries"] as () => void | Promise<void>) : () => {};
	const isDicomSeriesPreviewLoading = Boolean(mergedProps["isDicomSeriesPreviewLoading"]);
	const dicomSeriesPreview = (mergedProps["dicomSeriesPreview"] ?? null) as DicomSeriesPreviewResponse | null;
	const imagingKindLabels = (mergedProps["imagingKindLabels"] as Record<string, string>) ?? {};
	const dicomSeriesViewerLabels = (mergedProps["dicomSeriesViewerLabels"] as Record<string, string>) ?? {};
	const mprLoadStrategyLabels = (mergedProps["mprLoadStrategyLabels"] as Record<string, string>) ?? {};
	const mprResourceTierLabels = (mergedProps["mprResourceTierLabels"] as Record<string, string>) ?? {};

	const typedImagingViewerCapabilities = (
		Array.isArray(imagingViewerCapabilities) ? imagingViewerCapabilities : []
	) as Array<{
		icon: React.ReactNode;
		title: string;
		detail: string;
		state: string;
	}>;

	const typedDicomSeriesPreviewSeries = (
		Array.isArray(dicomSeriesPreview?.series) ? dicomSeriesPreview.series : []
	) as DicomSeriesPreviewGroup[];

	const typedDicomSeriesPreviewParserNotes = (
		Array.isArray(dicomSeriesPreview?.parserNotes)
			? dicomSeriesPreview.parserNotes
			: []
	) as Array<string>;

	return (
		<section
			className="dicom-capability-panel"
			aria-label="Рентген и КТ-просмотрщик"
		>
			<DicomCapabilityHeader capabilities={typedImagingViewerCapabilities} />

			<DicomSeriesLabPanel
				previewDicomSeries={previewDicomSeries}
				isDicomSeriesPreviewLoading={isDicomSeriesPreviewLoading}
				dicomSeriesPreview={dicomSeriesPreview}
				seriesList={typedDicomSeriesPreviewSeries}
				parserNotes={typedDicomSeriesPreviewParserNotes}
				imagingKindLabels={imagingKindLabels}
				dicomSeriesViewerLabels={dicomSeriesViewerLabels}
				mprLoadStrategyLabels={mprLoadStrategyLabels}
				mprResourceTierLabels={mprResourceTierLabels}
			/>

			<DicomMprWorkbenchPanel mergedProps={mergedProps} />
		</section>
	);
}
