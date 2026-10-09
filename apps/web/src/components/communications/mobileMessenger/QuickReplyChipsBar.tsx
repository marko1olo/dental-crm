import React from "react";
import type { QuickTemplateItem } from "../../chat/whatsAppChatTemplates";

export interface QuickReplyChipsBarProps {
	quickTemplates: QuickTemplateItem[];
	onApplyTemplate: (tmpl: QuickTemplateItem) => void;
}

export const QuickReplyChipsBar: React.FC<QuickReplyChipsBarProps> = ({
	quickTemplates,
	onApplyTemplate,
}) => {
	return (
		<div
			className="mobile-chat-templates-bar"
			role="toolbar"
			aria-label="Быстрые клинические шаблоны"
			data-testid="mobile-chat-templates-bar"
		>
			{quickTemplates.map((tmpl) => (
				<button
					key={tmpl.id}
					type="button"
					className="mobile-template-chip"
					onClick={() => onApplyTemplate(tmpl)}
					title="Вставить шаблон в сообщение"
				>
					{tmpl.icon}
					<span>{tmpl.label}</span>
				</button>
			))}
		</div>
	);
};
