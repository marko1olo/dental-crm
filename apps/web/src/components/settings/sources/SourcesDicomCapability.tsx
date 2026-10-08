import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../../useSettingsDerivations";
import {
	DicomCapabilityHeader,
	DicomMprWorkbenchPanel,
	DicomSeriesLabPanel,
} from "./dicomCapability";

export type * from "./dicomCapability";
export * from "./dicomCapability";

export function SourcesDicomCapability() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const mergedProps = Object.assign({}, appLogic, derivations) as any;

	const {
		imagingViewerCapabilities,
		previewDicomSeries,
		isDicomSeriesPreviewLoading,
		dicomSeriesPreview,
		imagingKindLabels,
		dicomSeriesViewerLabels,
		mprLoadStrategyLabels,
		mprResourceTierLabels,
	} = mergedProps;

	const typedImagingViewerCapabilities = (imagingViewerCapabilities ??
		[]) as Array<{
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		icon: any;
		title: string;
		detail: string;
		state: string;
	}>;

	const typedDicomSeriesPreviewSeries = (dicomSeriesPreview?.series ??
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		[]) as Array<any>;

	const typedDicomSeriesPreviewParserNotes = (dicomSeriesPreview?.parserNotes ??
		[]) as Array<string>;

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
