import type { DicomSeriesPreviewGroup } from "@dental/shared";

export interface DicomResourcePolicyPanelProps {
	cbctWorkbenchSeries?: DicomSeriesPreviewGroup | null | undefined;
	mprLoadStrategyLabels: Record<string, string>;
	mprResourceTierLabels: Record<string, string>;
	mprCacheModeLabels: Record<string, string>;
	cbctResourceSafetyCaps: string[];
}

export function DicomResourcePolicyPanel({
	cbctWorkbenchSeries,
	mprLoadStrategyLabels,
	mprResourceTierLabels,
	mprCacheModeLabels,
	cbctResourceSafetyCaps,
}: DicomResourcePolicyPanelProps) {
	const policy = cbctWorkbenchSeries?.mprReadiness?.resourcePolicy;
	if (!policy) return null;

	return (
		<section
			className="dicom-resource-policy"
			aria-label="Политика ресурсов КТ-просмотра"
		>
			<article>
				<strong>
					{
						mprLoadStrategyLabels[
							policy.loadStrategy
						]
					}
				</strong>
				<span>
					{
						mprResourceTierLabels[
							policy.requiredTier
						]
					}
				</span>
			</article>
			<article>
				<strong>
					{
						policy.estimatedMemoryMb
					}{" "}
					МБ
				</strong>
				<span>
					лимит срезов:{" "}
					{
						policy.maxClientSlices
					}
				</span>
			</article>
			<article>
				<strong>
					{
						mprCacheModeLabels[
							policy.cacheMode
						]
					}
				</strong>
				<span>
					{policy.thumbnailFirst
						? "сначала миниатюры"
						: "прямая загрузка"}
				</span>
			</article>
			<p>{policy.nextAction}</p>
			{cbctResourceSafetyCaps.slice(0, 4).map((cap) => (
				<small key={cap}>{cap}</small>
			))}
		</section>
	);
}
