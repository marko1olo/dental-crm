import { ClipboardCheck, Edit2, Plus, Trash2 } from "lucide-react";
import type { ProtocolTemplate } from "@dental/shared";

export function ProtocolLibrary({
	typedProtocolTemplates,
	specialtyLabels,
	documentLabels,
	imagingKindLabels,
	handleCreateNew,
	handleEdit,
	handleDelete,
	loading,
}: {
	typedProtocolTemplates: ProtocolTemplate[];
	specialtyLabels: any;
	documentLabels: any;
	imagingKindLabels: any;
	handleCreateNew: () => void;
	handleEdit: (template: ProtocolTemplate) => void;
	handleDelete: (id: string) => void;
	loading: boolean;
}) {
	return (
		<section
			className="protocol-settings animate-fade-in"
			aria-label="Библиотека клинических протоколов"
		>
			<div
				className="import-copy"
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
				}}
			>
				<div style={{ display: "flex", gap: "1rem" }}>
					<ClipboardCheck aria-hidden="true" />
					<div>
						<p className="eyebrow">Протоколы</p>
						<h2>Шаблоны приема по специальностям</h2>
						<p>
							Настройте протоколы для ваших врачей, чтобы ускорить заполнение
							карты.
						</p>
					</div>
				</div>
				<button className="primary-button" onClick={handleCreateNew}>
					<Plus size={16} /> Добавить шаблон
				</button>
			</div>

			<div className="protocol-settings-grid">
				{typedProtocolTemplates.map((template) => (
					<article className="protocol-settings-card" key={template.id}>
						<div className="protocol-settings-head">
							<span>{specialtyLabels[template.specialty]}</span>
							<strong>{template.title}</strong>
							<p>
								{template.visitReason} · {template.defaultDurationMinutes} мин
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
						<div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
							<button
								className="secondary-button"
								type="button"
								onClick={() => handleEdit(template)}
								title="Редактировать"
							>
								<Edit2 size={16} />
							</button>
							<button
								className="danger-button"
								type="button"
								style={{
									padding: "0.5rem",
									backgroundColor: "var(--dente-red-10)",
									color: "var(--dente-red-60)",
									border: "none",
									borderRadius: "0.5rem",
									cursor: "pointer",
								}}
								onClick={() => handleDelete(template.id)}
								title="Удалить"
								disabled={loading}
							>
								<Trash2 size={16} />
							</button>
						</div>
					</article>
				))}
			</div>
		</section>
	);
}
