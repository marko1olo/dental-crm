import type { ProtocolTemplate } from "@dental/shared";
import { ClipboardCheck } from "lucide-react";
import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

export function SettingsProtocolsTab() {
	const props = useAppLogicContext();
	const {
		dashboard,
		specialtyLabels,
		documentLabels,
		imagingKindLabels,
		applyProtocolTemplate,
	} = props;

	const typedProtocolTemplates =
		(dashboard?.protocolTemplates || []) as ProtocolTemplate[];

	return (
		<section
			className="protocol-settings animate-fade-in"
			aria-label="Библиотека клинических протоколов"
		>
			<div className="import-copy">
				<ClipboardCheck aria-hidden="true" />
				<div>
					<p className="eyebrow">Протоколы</p>
					<h2>Шаблоны приема по специальностям</h2>
					<p>
						Терапия, ортопедия, хирургия, ортодонтия, пародонтология,
						гигиена, детский прием, имплантация и рентген.
					</p>
				</div>
			</div>

			<div className="protocol-settings-grid">
				{typedProtocolTemplates.map((template) => (
					<article className="protocol-settings-card" key={template.id}>
						<div className="protocol-settings-head">
							<span>{specialtyLabels[template.specialty]}</span>
							<strong>{template.title}</strong>
							<p>
								{template.visitReason} · {template.defaultDurationMinutes}{" "}
								мин
							</p>
						</div>
						<div
							className="protocol-token-row"
							aria-label="Документы протокола"
						>
							{template.requiredDocuments.map((kind) => (
								<span key={kind}>{documentLabels[kind]}</span>
							))}
						</div>
						<div
							className="protocol-token-row protocol-token-row-soft"
							aria-label="Снимки протокола"
						>
							{template.suggestedImaging.map((kind) => (
								<span key={kind}>{imagingKindLabels[kind]}</span>
							))}
						</div>
						<ul>
							{template.safetyWarnings.slice(0, 2).map((warning) => (
								<li key={warning}>{warning}</li>
							))}
						</ul>
						<button
							className="secondary-button"
							type="button"
							onClick={() => {
								applyProtocolTemplate(template);
								window.location.hash = "visit";
							}}
						>
							<ClipboardCheck aria-hidden="true" /> Открыть в приеме
						</button>
					</article>
				))}
			</div>
		</section>
	);
}
