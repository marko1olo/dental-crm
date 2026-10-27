/**
 * DocumentAccessibleAnchorForm.tsx
 * Accessible hidden form for screen readers, test anchors, and automated workflows.
 * Mandate 8e: Doctor autonomy, buttons are never blocked (disabled={false}).
 */

import type { DocumentKind } from "@dental/shared";
import React from "react";
import { normalizedDocumentKind } from "../../AppHelpers";
import { CANONICAL_TEMPLATES } from "./canonicalTemplatesData";

export interface DocumentAccessibleAnchorFormProps {
	readonly selectedDocumentKind: DocumentKind;
	readonly onSelectDocumentKind: (kind: DocumentKind) => void;
	readonly onCreateDocument: (kind: DocumentKind) => void | Promise<void>;
	readonly sanitizedDocumentFactoryGroups?:
		| Array<{ title: string; kinds: DocumentKind[] }>
		| undefined;
	readonly documentLabels?: Record<string, string> | undefined;
}

export const DocumentAccessibleAnchorForm: React.FC<
	DocumentAccessibleAnchorFormProps
> = ({
	selectedDocumentKind,
	onSelectDocumentKind,
	onCreateDocument,
	sanitizedDocumentFactoryGroups,
	documentLabels,
}) => {
	return (
		<section
			className="document-factory document-factory-accessible-hidden hidden"
			aria-label="Быстро создать документ"
			style={{ display: "none" }}
		>
			<select
				id="document-kind-selector"
				className="document-factory-select"
				value={selectedDocumentKind}
				onChange={(e) =>
					onSelectDocumentKind(normalizedDocumentKind(e.target.value))
				}
				data-testid="select-document-kind"
			>
				{(sanitizedDocumentFactoryGroups ?? []).map((group) => (
					<optgroup key={group.title} label={group.title}>
						{(group?.kinds ?? []).map((k) => (
							<option key={k} value={k}>
								{documentLabels?.[k] ?? k}
							</option>
						))}
					</optgroup>
				))}
				{CANONICAL_TEMPLATES.map((tmpl) => (
					<option key={tmpl.id} value={tmpl.kind}>
						{tmpl.titleRu}
					</option>
				))}
			</select>
			<button
				type="button"
				disabled={false}
				onClick={() => void onCreateDocument(selectedDocumentKind)}
				data-testid="btn-create-selected-document"
			>
				Создать выбранный документ
			</button>
		</section>
	);
};
