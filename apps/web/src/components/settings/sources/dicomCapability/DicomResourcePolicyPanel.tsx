export interface DicomResourcePolicyPanelProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	cbctWorkbenchSeries: any;
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
	if (!cbctWorkbenchSeries) return null;

	return (
		<section
			className="dicom-resource-policy"
			aria-label="Политика ресурсов КТ-просмотра"
		>
			<article>
				<strong>
					{
						mprLoadStrategyLabels[
							cbctWorkbenchSeries.mprReadiness.resourcePolicy.loadStrategy
						]
					}
				</strong>
				<span>
					{
						mprResourceTierLabels[
							cbctWorkbenchSeries.mprReadiness.resourcePolicy.requiredTier
						]
					}
				</span>
			</article>
			<article>
				<strong>
					{
						cbctWorkbenchSeries.mprReadiness.resourcePolicy
							.estimatedMemoryMb
					}{" "}
					МБ
				</strong>
				<span>
					лимит срезов:{" "}
					{
						cbctWorkbenchSeries.mprReadiness.resourcePolicy
							.maxClientSlices
					}
				</span>
			</article>
			<article>
				<strong>
					{
						mprCacheModeLabels[
							cbctWorkbenchSeries.mprReadiness.resourcePolicy.cacheMode
						]
					}
				</strong>
				<span>
					{cbctWorkbenchSeries.mprReadiness.resourcePolicy.thumbnailFirst
						? "сначала миниатюры"
						: "прямая загрузка"}
				</span>
			</article>
			<p>{cbctWorkbenchSeries.mprReadiness.resourcePolicy.nextAction}</p>
			{cbctResourceSafetyCaps.slice(0, 4).map((cap) => (
				<small key={cap}>{cap}</small>
			))}
		</section>
	);
}
