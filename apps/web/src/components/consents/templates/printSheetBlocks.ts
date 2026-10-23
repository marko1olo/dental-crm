import type { RenderedConsentTemplate } from "./types";

export function renderSectionsAndRisksHtml(rendered: RenderedConsentTemplate): string {
	const sections = rendered.renderedSections
		.map(
			(sec) => `
        <div class="section-title">${sec.title}</div>
        <p>${sec.content}</p>
        ${sec.bullets && sec.bullets.length > 0 ? `<ul class="bullets-list">${sec.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>` : ""}
      `,
		)
		.join("");

	const risks =
		rendered.riskFactors.length > 0
			? `<div class="risk-block"><strong>Факторы риска:</strong><ul class="bullets-list">${rendered.riskFactors.map((rf) => `<li>${rf}</li>`).join("")}</ul></div>`
			: "";

	const aftercare =
		rendered.aftercareInstructions.length > 0
			? `<div class="aftercare-block"><strong>Рекомендации:</strong><ul class="bullets-list">${rendered.aftercareInstructions.map((ac) => `<li>${ac}</li>`).join("")}</ul></div>`
			: "";

	return `${sections}${risks}${aftercare}`;
}

export function renderSignaturesRowHtml(ptName: string, docName: string, today: string): string {
	return `
      <div class="signatures-row">
        <div class="sign-box">
          Пациент (законный представитель):<br>
          <strong>${ptName}</strong>
          <div class="sign-line"></div>
          <div class="sign-hint">(личная подпись / дата: ${today})</div>
        </div>
        <div class="sign-box">
          Лечащий врач-стоматолог:<br>
          <strong>${docName}</strong>
          <div class="sign-line"></div>
          <div class="sign-hint">(подпись медицинского работника / дата: ${today})</div>
        </div>
      </div>`;
}
