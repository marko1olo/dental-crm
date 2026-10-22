import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./styles/contrast-fixes.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";
import "./theme.css";
import { FastCheckoutModal } from "./components/finance/FastCheckoutModal";

function PreviewApp() {
	const [isOpen, setIsOpen] = useState(true);

	return (
		<div className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center">
			<FastCheckoutModal
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				totalBillRub={14500}
				patientName="Ковалёв Роман Станиславович"
				patientPhone="+7 (999) 888-77-66"
				doctorName="Д-р Воронов Алексей Владимирович"
				clinicLegalName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
				patientDepositRub={5000}
				patientFamilyBalanceRub={12000}
				familyPayerName="Ковалёва Елена Ивановна"
				orderId="ORD-2026-88"
				cashierFullName="Кассир-администратор Смирнова А.В."
				defaultMethod="split"
				initialSimpleCashierMode={false}
			/>
		</div>
	);
}

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<PreviewApp />);
}
