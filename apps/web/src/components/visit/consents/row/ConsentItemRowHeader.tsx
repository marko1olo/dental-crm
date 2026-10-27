import React from "react";
import type { ClinicalConsentConfig } from "../visitConsentTypes";

interface ConsentItemRowHeaderProps {
	readonly item: Pick<ClinicalConsentConfig, "code" | "title" | "statutoryBasis" | "summary">;
}

export function ConsentItemRowHeader({ item }: ConsentItemRowHeaderProps) {
	return (
		<div className="vct-card-left">
			<div className="vct-card-meta">
				<div className="vct-card-title-row">
					<span className="vct-code-pill">{item.code}</span>
					<h4 className="vct-card-title">{item.title}</h4>
					<span className="vct-statutory-pill">{item.statutoryBasis}</span>
				</div>
				<p className="vct-card-desc">{item.summary}</p>
			</div>
		</div>
	);
}
