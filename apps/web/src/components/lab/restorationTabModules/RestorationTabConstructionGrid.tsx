import React from "react";
import { type JawScope } from "../labMath";
import {
	DentalLabOrthopedicConstructionGrid,
	type DentalLabOrthopedicConstructionGridProps,
	CANONICAL_6_CONSTRUCTIONS,
	CANONICAL_5_MATERIALS,
} from "./DentalLabOrthopedicConstructionGrid";

export type { DentalLabOrthopedicConstructionGridProps as RestorationTabConstructionGridProps };
export { CANONICAL_6_CONSTRUCTIONS, CANONICAL_5_MATERIALS };

export function RestorationTabConstructionGrid(props: {
	constructionType: string;
	setConstructionType: (type: string) => void;
	material: string;
	setMaterial: (mat: string) => void;
	jawScope?: JawScope | null | undefined;
	setJawScope?: ((scope: JawScope | null) => void) | undefined;
}) {
	return <DentalLabOrthopedicConstructionGrid {...props} />;
}

export default RestorationTabConstructionGrid;
