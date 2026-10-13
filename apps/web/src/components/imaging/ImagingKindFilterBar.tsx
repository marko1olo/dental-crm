import React from "react";

export interface ImagingKindFilterBarProps {
	imagingKindFilter: string;
	setImagingKindFilter: (filter: string) => void;
	imagingKindOptions?: string[] | undefined;
	imagingKindLabels: Record<string, string>;
}

export function ImagingKindFilterBar({
	imagingKindFilter,
	setImagingKindFilter,
	imagingKindOptions,
	imagingKindLabels,
}: ImagingKindFilterBarProps) {
	if (!imagingKindOptions || imagingKindOptions.length === 0) {
		return null;
	}
	return (
		<div className="imaging-kind-filter" role="tablist" aria-label="Фильтр типа снимка">
			<button
				className={`focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors ${imagingKindFilter === "all" ? "active" : ""}`}
				type="button"
				role="tab"
				aria-selected={imagingKindFilter === "all"}
				onClick={() => setImagingKindFilter("all")}
			>
				Все
			</button>
			{(imagingKindOptions ?? []).map((kind: string) => (
				<button
					className={`focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors ${imagingKindFilter === kind ? "active" : ""}`}
					key={kind}
					type="button"
					role="tab"
					aria-selected={imagingKindFilter === kind}
					onClick={() => setImagingKindFilter(kind)}
				>
					{imagingKindLabels[kind] || kind}
				</button>
			))}
		</div>
	);
}
