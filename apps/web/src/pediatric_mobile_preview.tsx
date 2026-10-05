import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";

import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles/modules/header.css";
import "./styles/modules/documents.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./styles/contrast-fixes.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";

import {
	PediatricTeethChart,
	type PediatricDentitionMode,
	type ToothClinicalFinding,
	type ToothSurfaceCode,
} from "./components/pediatric/PediatricTeethChart";
import {
	VisitPediatricProtocolWidget,
	type PediatricServiceItem,
} from "./components/pediatric/VisitPediatricProtocolWidget";
import type {
	FranklRating,
	ResorptionStagePercent,
} from "./components/odontogram/pediatricDentitionEngine";

export const PediatricMobilePreviewApp: React.FC = () => {
	const [theme, setTheme] = useState<"light" | "dark">("light");
	const [activeTooth, setActiveTooth] = useState<number | null>(54);
	const [activeSurfaces, setActiveSurfaces] = useState<readonly string[]>(["O", "M"]);
	const [dentitionMode, setDentitionMode] = useState<PediatricDentitionMode>("primary");
	const [franklRating, setFranklRating] = useState<FranklRating>(3);
	const [findings, setFindings] = useState<Record<number, ToothClinicalFinding>>({
		54: "Caries",
		64: "Filled",
		75: "Healthy",
		85: "Healthy",
	});
	const [resorptionStages, setResorptionStages] = useState<Record<number, ResorptionStagePercent>>({
		71: 50,
		81: 25,
	});
	const [toothSurfaces, setToothSurfaces] = useState<Record<number, readonly ToothSurfaceCode[]>>({
		54: ["O", "M"],
	});
	const [toastMsg, setToastMsg] = useState<string | null>(null);

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
		if (theme === "dark") {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	}, [theme]);

	const showToast = (msg: string) => {
		setToastMsg(msg);
		setTimeout(() => setToastMsg(null), 3000);
	};

	const handleToothFindingChange = (tooth: number, finding: ToothClinicalFinding) => {
		setFindings((prev) => ({ ...prev, [tooth]: finding }));
		showToast(`Зуб ${tooth}: статус изменен на ${finding}`);
	};

	const handleResorptionChange = (tooth: number, stage: ResorptionStagePercent) => {
		setResorptionStages((prev) => ({ ...prev, [tooth]: stage }));
		showToast(`Зуб ${tooth}: резорбция корня ${stage}%`);
	};

	const handleSurfaceToggle = (tooth: number, surf: ToothSurfaceCode) => {
		setToothSurfaces((prev) => {
			const current = prev[tooth] || [];
			const next = current.includes(surf)
				? current.filter((s) => s !== surf)
				: [...current, surf];
			return { ...prev, [tooth]: next };
		});
		if (tooth === activeTooth) {
			setActiveSurfaces((prev) =>
				prev.includes(surf) ? prev.filter((s) => s !== surf) : [...prev, surf],
			);
		}
	};

	return (
		<div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col" data-testid="pediatric-preview-root">
			{/* Preview Control Header */}
			<header className="sticky top-0 z-40 bg-[var(--paper-strong)] border-b border-[var(--line)] px-4 py-2 flex items-center justify-between shadow-xs">
				<div className="flex items-center gap-2">
					<span className="font-bold text-sm tracking-tight text-[var(--primary)]">DENTE Детство</span>
					<span className="text-xs text-[var(--muted)] hidden sm:inline">| Apple HIG Mobile & Clean Russian</span>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
						className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--surface-muted)] text-[var(--ink)] border border-[var(--line)] cursor-pointer"
						data-testid="toggle-theme-btn"
					>
						{theme === "light" ? "🌙 Тёмная тема" : "☀️ Светлая тема"}
					</button>
					<button
						type="button"
						onClick={() => setDentitionMode((m) => (m === "primary" ? "mixed" : "primary"))}
						className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--line)] cursor-pointer"
						data-testid="toggle-mode-btn"
					>
						{dentitionMode === "primary" ? "Сменный прикус (24 зуба)" : "Молочный прикус (20 зубов)"}
					</button>
				</div>
			</header>

			{toastMsg && (
				<div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[var(--accent)] text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg transition-all">
					{toastMsg}
				</div>
			)}

			<main className="flex-1 p-2 sm:p-4 max-w-5xl mx-auto w-full flex flex-col gap-4">
				{/* Patient summary badge for context */}
				<div className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-xs">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-full bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center font-bold text-sm">
							ВА
						</div>
						<div>
							<div className="font-semibold text-sm">Алексеев Владимир Дмитриевич, 5 лет</div>
							<div className="text-xs text-[var(--muted)]">Представитель: Алексеева Елена (Мать) • Риск: Низкий</div>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-xs px-2.5 py-1 rounded-full font-medium bg-[var(--success-subtle,#e8f5e9)] text-[var(--success,#2e7d32)]">
							Согласие оформлено
						</span>
					</div>
				</div>


				{/* 2. Pediatric Visit Protocol Widget with Zero Bird Language & Floating Bottom Bar */}
				<VisitPediatricProtocolWidget
					activeTooth={activeTooth}
					activeSurfaces={activeSurfaces}
					onSelectSurfaces={setActiveSurfaces}
					initialFranklRating={franklRating}
					onFranklChange={setFranklRating}
					patientName="Алексеев Владимир Дмитриевич"
					patientAgeYears={5}
					patientWeightKg={19}
					doctorName="д-р Смирнова А.В."
					clinicName="DENTE Kids"
					representativeFullName="Алексеева Елена Сергеевна"
					representativePhone="+7 (999) 123-45-67"
					representativeRole="Мать"
					initialShowDetails={true}
					onApplyProtocolText={(_text) => showToast("Протокол успешно внесен в медицинскую карту!")}
					onAddToInvoice={(services: readonly PediatricServiceItem[]) =>
						showToast(`В смету добавлено услуг: ${services.length}`)
					}
				/>
			</main>
		</div>
	);
};

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<PediatricMobilePreviewApp />);
}
