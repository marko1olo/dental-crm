import { ScanSearch } from "lucide-react";
import type { DicomCapabilityHeaderProps } from "./types";

export function DicomCapabilityHeader({
	capabilities,
}: DicomCapabilityHeaderProps) {
	return (
		<header className="dicom-capability-header" aria-label="Рентген и КТ-просмотрщик">
			<div className="import-copy">
				<ScanSearch aria-hidden="true" />
				<div>
					<p className="eyebrow">Рентген</p>
					<h2>Сначала быстрый просмотр, потом полноценные КЛКТ/КТ серии</h2>
					<p>
						Врач не должен ждать тяжелый 3D-модуль на обычном приеме. 2D-снимки
						открываются сразу; КТ-срезы, архив снимков и объемные серии выделены
						в отдельный модуль, чтобы не перегружать смену.
					</p>
				</div>
			</div>
			<div className="dicom-capability-grid">
				{capabilities.map((capability) => {
					const CapabilityIcon = capability.icon;
					return (
						<article key={capability.title}>
							<CapabilityIcon aria-hidden="true" />
							<div>
								<span>{capability.state}</span>
								<h3>{capability.title}</h3>
								<p>{capability.detail}</p>
							</div>
						</article>
					);
				})}
			</div>
		</header>
	);
}
