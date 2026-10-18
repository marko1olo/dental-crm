/**
 * DENTE CRM — Patient Odontogram Embedded CSS Styles
 * Compliant with Mandate 8b (<= 120 lines).
 */

export const PATIENT_ODONTOGRAM_CSS = `
.patient-odontogram-arch-container {
	padding: 14px;
	background-color: var(--pc-bg, #0f172a);
	border: 1px solid var(--pc-border, #334155);
	border-radius: 12px;
	display: flex;
	flex-direction: column;
	gap: 12px;
	overflow: hidden;
	max-width: 100%;
	box-sizing: border-box;
}
.patient-odontogram-arch {
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
}
.patient-odontogram-jaw-title {
	font-size: 12px;
	color: var(--pc-text-muted, #94a3b8);
	text-align: center;
	margin-bottom: 6px;
	font-weight: 700;
	letter-spacing: 0.5px;
}
.patient-odontogram-quadrants-row {
	display: flex;
	justify-content: center;
	align-items: flex-start;
	gap: 12px;
	width: 100%;
	max-width: 100%;
	box-sizing: border-box;
}
.patient-odontogram-quadrant {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	box-sizing: border-box;
}
.patient-odontogram-quadrant-title {
	font-size: 12px;
	font-weight: 700;
	color: var(--pc-text-muted, #94a3b8);
	text-align: center;
}
.patient-odontogram-teeth-row {
	display: flex;
	gap: 4px;
	flex-wrap: nowrap;
	justify-content: center;
}
.patient-odontogram-divider {
	height: 1px;
	background-color: var(--pc-border, #334155);
	margin: 4px 0;
	width: 100%;
}
@media (max-width: 639px) {
	.patient-odontogram-arch-container { padding: 10px 8px; gap: 10px; }
	.patient-odontogram-quadrants-row { flex-direction: column; align-items: center; gap: 10px; }
	.patient-odontogram-quadrant {
		width: 100%;
		max-width: 340px;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid var(--pc-border, #334155);
		border-radius: 10px;
		padding: 8px 4px;
	}
	.patient-odontogram-teeth-row {
		display: grid;
		grid-template-columns: repeat(4, 44px);
		gap: 6px;
		justify-content: center;
		width: 100%;
	}
}
`;
