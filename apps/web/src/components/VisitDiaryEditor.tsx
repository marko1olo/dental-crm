import type React from "react";
import {
	VisitDiarySection,
	type VisitDiarySectionProps,
} from "./visit/VisitDiarySection";

export type VisitDiaryEditorProps = VisitDiarySectionProps;

export const VisitDiaryEditor: React.FC<VisitDiaryEditorProps> = (props) => {
	return <VisitDiarySection {...props} />;
};

export { VisitDiarySection };
export {
	VisitDiaryTemplateSelector,
	CANONICAL_SOAP_TEMPLATES,
	type Template,
} from "./VisitDiaryTemplateSelector";
