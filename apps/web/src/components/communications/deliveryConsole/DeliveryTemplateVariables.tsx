import React from "react";
import type { TemplateVariable } from "./types";

export interface DeliveryTemplateVariablesProps {
	variableCatalog: TemplateVariable[];
	insertTemplateVariable: (key: string) => void;
}

export function DeliveryTemplateVariables({
	variableCatalog,
	insertTemplateVariable,
}: DeliveryTemplateVariablesProps) {
	if (variableCatalog.length === 0) return null;

	return (
		<div
			role="toolbar"
			className="ops-variable-catalog"
			data-testid="comm-template-variables"
			aria-label="Подстановки для шаблона"
		>
			<span className="ops-note ops-variable-catalog__title">
				Подстановки — нажмите, чтобы вставить в текст:
			</span>
			{variableCatalog.map((v) => (
				<button
					key={v.key}
					type="button"
					data-testid={`comm-template-var-${v.key}`}
					title={v.phi ? `${v.label} · пример: ${v.example} · медицинские данные` : `${v.label} · пример: ${v.example}`}
					onClick={() => insertTemplateVariable(v.key)}
					className={v.phi ? "quick-chip quick-chip--phi" : "quick-chip"}
				>
					{`{${v.key}}`}
					<span className="quick-chip__label">
						{v.label}
						{v.phi ? " · мед." : ""}
					</span>
				</button>
			))}
		</div>
	);
}
