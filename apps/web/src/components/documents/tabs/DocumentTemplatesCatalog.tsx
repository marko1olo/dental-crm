import React from "react";
import type {
	DocumentKind,
	DocumentKindMetadata,
	DocumentSourceStatus,
} from "@dental/shared";
import { FileText, FolderArchive } from "lucide-react";
import { DentalForm043 } from "../../icons/DentalIcons";

export interface DocumentTemplatesCatalogProps {
	sanitizedDocumentFactoryGroups: Array<{
		title: string;
		kinds: DocumentKind[];
	}>;
	documentKindMetadata?: Record<DocumentKind, DocumentKindMetadata>;
	documentCreateSavingKind?: DocumentKind | null;
	setSelectedDocumentKind: (kind: DocumentKind) => void;
	structuredPayloadDocumentKinds: Set<DocumentKind>;
	createDocument: (kind: DocumentKind) => void | Promise<void>;
	documentLabels?: Record<DocumentKind, string>;
	documentSourceStatusClassNames?: Record<DocumentSourceStatus, string>;
	documentSourceStatusLabels?: Record<DocumentSourceStatus, string>;
}

export const DocumentTemplatesCatalog: React.FC<
	DocumentTemplatesCatalogProps
> = React.memo(function DocumentTemplatesCatalog(props) {
	const {
		sanitizedDocumentFactoryGroups,
		documentKindMetadata,
		documentCreateSavingKind,
		setSelectedDocumentKind,
		structuredPayloadDocumentKinds,
		createDocument,
		documentLabels,
		documentSourceStatusClassNames,
		documentSourceStatusLabels,
	} = props;

	return (
		<details className="settings-advanced-block document-templates-collapsible">
			<summary className="settings-advanced-toggle">
				<span className="settings-advanced-label">
					<span className="settings-advanced-icon">
						<FolderArchive
							size={16}
							className="text-teal-600 dark:text-teal-400"
							aria-hidden="true"
						/>
					</span>
					Каталог шаблонов документов ({sanitizedDocumentFactoryGroups.length}{" "}
					разделов, 30+ форм)
				</span>
				<span className="settings-advanced-hint">
					Нажмите, чтобы развернуть все шаблоны
				</span>
				<span className="settings-advanced-chevron">{"\u25BC"}</span>
			</summary>
			<div className="settings-advanced-form">
				{(sanitizedDocumentFactoryGroups ?? []).map((group) => (
					<section className="document-factory-group" key={group.title}>
						<h3>{group.title}</h3>
						<div>
							{(group?.kinds ?? []).map((kind) => {
								const metadata = documentKindMetadata?.[kind];
								const sourceStatus = metadata?.sourceStatus ?? "manual_only";
								return (
									<button
										className="secondary-button document-factory-kind-button"
										type="button"
										key={kind}
										disabled={Boolean(documentCreateSavingKind)}
										aria-busy={documentCreateSavingKind === kind || undefined}
										onClick={() => {
											setSelectedDocumentKind(kind);
											if (!structuredPayloadDocumentKinds.has(kind)) {
												void createDocument(kind);
											}
										}}
									>
										{kind === "dental_medical_card_043u" ||
										kind === "orthodontic_medical_card_043_1u" ? (
											<DentalForm043 aria-hidden="true" size={16} />
										) : (
											<FileText aria-hidden="true" />
										)}
										<span className="document-factory-kind-button-text">
											<span>{documentLabels?.[kind] ?? kind}</span>
											<small
												className={
													documentSourceStatusClassNames?.[sourceStatus] ??
													"pill-gray"
												}
											>
												{documentCreateSavingKind === kind
													? "Создаю"
													: documentSourceStatusLabels?.[sourceStatus] ??
														"Ручной ввод"}
											</small>
										</span>
									</button>
								);
							})}
						</div>
					</section>
				))}
			</div>
		</details>
	);
});
