import React from "react";
import {
	Icd10ClinicalSelectorView,
	type Icd10ClinicalSelectorProps,
} from "./icd10/selector/Icd10ClinicalSelectorView";

if (typeof document !== "undefined") {
	import("./icd10Selector.css");
}

export type { Icd10ClinicalSelectorProps };
export const Icd10ClinicalSelector: React.FC<Icd10ClinicalSelectorProps> = (props) => {
	return <Icd10ClinicalSelectorView {...props} />;
};
export default Icd10ClinicalSelector;
