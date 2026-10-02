import React from "react";
import {
	Activity,
	ArrowUpRight,
	Calendar,
	CheckCircle2,
	FileText,
	Gift,
	Sparkles,
	Star,
	Zap,
} from "lucide-react";
import type { OmnichannelTemplate } from "./omnichannelTypes.js";

export interface OmnichannelTemplatesTabProps {
	readonly templates: readonly OmnichannelTemplate[];
	readonly selectedContactName: string;
	readonly onApplyTemplate: (template: OmnichannelTemplate) => void;
}

/**
 * Standardized Clinical & Administrative Messaging Templates Library Tab.
 */
export const OmnichannelTemplatesTab: React.FC<OmnichannelTemplatesTabProps> = ({
	templates,
	selectedContactName,
	onApplyTemplate,
}) => {
	return (
		<div className="hub-templates-workspace">
			<div className="hub-templates-header">
				<div>
					<h3 className="hub-templates-title">Библиотека стандартизированных шаблонов</h3>
					<p className="hub-templates-sub">
						1-кликовая отправка с авто-подстановкой ФИО, дат визитов, смет и ссылок на оплату
					</p>
				</div>
			</div>

			<div className="hub-templates-grid">
				{templates.map((tpl) => (
					<div key={tpl.id} className="hub-template-card">
						<div className="hub-tpl-card-top">
							<div className="hub-tpl-badge-category">
								{tpl.category === "visit_reminder" && (
									<span className="inline-flex items-center gap-1"><Calendar size={13} /> Напоминание</span>
								)}
								{tpl.category === "appointment_confirmation" && (
									<span className="inline-flex items-center gap-1"><CheckCircle2 size={13} /> Подтверждение</span>
								)}
								{tpl.category === "treatment_plan" && (
									<span className="inline-flex items-center gap-1"><Activity size={13} /> План лечения</span>
								)}
								{tpl.category === "nps_survey" && (
									<span className="inline-flex items-center gap-1"><Star size={13} /> Опрос NPS</span>
								)}
								{tpl.category === "sbp_payment" && (
									<span className="inline-flex items-center gap-1"><Zap size={13} /> Оплата СБП</span>
								)}
								{tpl.category === "birthday_greeting" && (
									<span className="inline-flex items-center gap-1"><Gift size={13} /> Поздравление</span>
								)}
								{tpl.category === "hygiene_recall" && (
									<span className="inline-flex items-center gap-1"><Sparkles size={13} /> Профгигиена (6 мес)</span>
								)}
								{tpl.category === "custom" && (
									<span className="inline-flex items-center gap-1"><FileText size={13} /> Шаблон</span>
								)}
							</div>
							<span className="hub-tpl-channel-tag">{tpl.channel.toUpperCase()}</span>
						</div>

						<h4 className="hub-tpl-name">{tpl.name}</h4>
						<p className="hub-tpl-desc">{tpl.description}</p>

						<div className="hub-tpl-preview-box">
							{tpl.templateText}
						</div>

						<div className="hub-tpl-variables-row">
							<span className="hub-tpl-vars-label">Переменные:</span>
							{tpl.variables.map((v) => (
								<span key={v} className="hub-tpl-var-chip">
									{v}
								</span>
							))}
						</div>

						<button
							type="button"
							className="hub-btn-apply-template min-h-[44px]"
							style={{ minHeight: "44px" }}
							onClick={() => onApplyTemplate(tpl)}
						>
							<ArrowUpRight size={15} /> Применить в диалог с {selectedContactName}
						</button>
					</div>
				))}
			</div>
		</div>
	);
};
