import React from "react";
import { ConsentItemRowHeader } from "./ConsentItemRowHeader";
import { ConsentItemRowBadges } from "./ConsentItemRowBadges";
import { ConsentItemRowActions } from "./ConsentItemRowActions";
import { ConsentItemRowPreview } from "./ConsentItemRowPreview";
import type { ConsentItemRowProps } from "./types";

export function ConsentItemRowPresenter(props: ConsentItemRowProps) {
	const { item, isExpanded } = props;
	const isSigned = item.status === "signed";
	const isRequired = item.status === "required_today";

	return (
		<div className={`vct-consent-card ${isRequired ? "highlight-required" : ""} ${isSigned ? "highlight-signed" : ""}`}>
			<div className="vct-card-summary-row">
				<ConsentItemRowHeader item={item} />
				<ConsentItemRowBadges status={item.status} record={item.record} />
				<ConsentItemRowActions {...props} />
			</div>

			{isExpanded && item.renderedTemplate && (
				<ConsentItemRowPreview
					item={item}
					substitutionContext={props.substitutionContext}
					onPrintSingleFilled={props.onPrintSingleFilled}
					onToggleExpand={props.onToggleExpand}
				/>
			)}
		</div>
	);
}
