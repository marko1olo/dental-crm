import React from "react";
import { VisitSoapEditorView } from "./soapEditor/VisitSoapEditorView";
import { resolveProtocolFromTemplate } from "./soapEditor/protocolsResolver";
import type {
	VisitSoapEditorProps,
	VisitSoapNoteValues,
} from "./soapEditor/types";

export type { VisitSoapNoteValues, VisitSoapEditorProps };
export { resolveProtocolFromTemplate };

/**
 * Редактор медицинской карты (SOAP) с быстрым выбором протоколов StomX.
 * Канонический тонкий фасад (Mandate 8b / Safe Monolith Decomposition).
 */
export const VisitSoapEditor: React.FC<VisitSoapEditorProps> = (props) => {
	return <VisitSoapEditorView {...props} />;
};

export default VisitSoapEditor;
