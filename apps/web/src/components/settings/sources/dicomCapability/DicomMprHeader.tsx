export interface DicomMprHeaderProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	cbctWorkbenchSeries: any;
}

export function DicomMprHeader({ cbctWorkbenchSeries }: DicomMprHeaderProps) {
	return (
		<>
			<div
				className="dicom-mpr-head"
				aria-label="Готовность рабочего места КЛКТ и КТ-срезов"
			>
				<div>
					<strong>Рабочее место КЛКТ / КТ-срезы</strong>
					<p>
						{cbctWorkbenchSeries
							? `${cbctWorkbenchSeries.patientName ?? "Пациент ?"} · ${cbctWorkbenchSeries.fileCount} файлов · ${cbctWorkbenchSeries.mprReadiness.recommendedLayout}`
							: "Сначала проверьте предпросмотр серий КЛКТ/КТ."}
					</p>
				</div>
				<span
					className={
						cbctWorkbenchSeries?.mprReadiness.canOpenMpr
							? "mpr-ready"
							: "mpr-warn"
					}
				>
					{cbctWorkbenchSeries?.mprReadiness.canOpenMpr
						? "предпросмотр КТ-срезов готов"
						: "только предпросмотр"}
				</span>
			</div>
			<small className="dicom-mpr-safety-note">
				Не диагностическое заключение. Подтверждайте КТ-находки в
				сертифицированном просмотрщике/рабочей станции клиники.
			</small>
		</>
	);
}
