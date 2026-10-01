import type React from "react";
import { useCallback, useState } from "react";
import { AlertCircle, Eye, Sparkles, X } from "lucide-react";
import { isDemoShowcaseMode, disableDemoShowcaseMode } from "../../utils/demoModeEngine.js";

export interface DemoModeBannerProps {
	readonly onExitDemo?: () => void;
	readonly onRegisterClinic?: () => void;
}

export const DemoModeBanner: React.FC<DemoModeBannerProps> = ({ onExitDemo, onRegisterClinic }) => {
	const isDemo = isDemoShowcaseMode();
	const [isDismissed, setIsDismissed] = useState(false);

	const handleExitDemo = useCallback(() => {
		disableDemoShowcaseMode();
		if (onExitDemo) {
			onExitDemo();
		} else if (typeof window !== "undefined") {
			// Очистить параметры URL и перезагрузить в чистом боевом режиме
			const url = new URL(window.location.href);
			url.searchParams.delete("demo");
			url.searchParams.delete("showcase");
			if (url.hash.includes("demo")) {
				url.hash = "";
			}
			window.location.href = url.pathname + (url.search ? url.search : "");
		}
	}, [onExitDemo]);

	const handleRegisterClinic = useCallback(() => {
		disableDemoShowcaseMode();
		if (onRegisterClinic) {
			onRegisterClinic();
		} else if (typeof window !== "undefined") {
			try {
				localStorage.removeItem("dente_clinic_token");
				localStorage.removeItem("dente_staff_token");
				localStorage.removeItem("dente_demo_showcase");
			} catch {
				// storage error
			}
			const url = new URL(window.location.href);
			url.searchParams.delete("demo");
			url.searchParams.delete("showcase");
			url.hash = "#/auth/register";
			window.location.href = url.pathname + (url.search ? url.search : "") + url.hash;
			window.location.reload();
		}
	}, [onRegisterClinic]);

	if (!isDemo || isDismissed) {
		return null;
	}

	return (
		<aside
			role="status"
			aria-label="Уведомление о демонстрационном режиме"
			data-testid="demo-mode-banner"
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "12px",
				padding: "6px 16px",
				background: "var(--brand-accent-bg, rgba(99, 102, 241, 0.12))",
				borderBottom: "1px solid var(--brand-accent-border, rgba(99, 102, 241, 0.3))",
				color: "var(--ink, #1e293b)",
				fontSize: "12px",
				fontWeight: 500,
				lineHeight: "1.4",
				zIndex: 9999,
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
				<Eye size={15} style={{ color: "var(--brand-accent, #6366f1)", flexShrink: 0 }} aria-hidden="true" />
				<span>
					<strong>ДЕМО-РЕЖИМ (Витрина):</strong> Ознакомительный режим: отображаются синтетические данные расписания, картотеки и клинических сценариев.
				</span>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
				<button
					type="button"
					onClick={handleRegisterClinic}
					data-testid="create-clinic-free-btn"
					style={{
						background: "var(--teal, #0d9488)",
						color: "#ffffff",
						border: "none",
						borderRadius: "4px",
						padding: "4px 12px",
						fontSize: "11px",
						fontWeight: 600,
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						gap: "5px",
					}}
				>
					<Sparkles size={13} aria-hidden="true" />
					Создать свою клинику бесплатно
				</button>

				<button
					type="button"
					onClick={handleExitDemo}
					data-testid="exit-demo-button"
					style={{
						background: "var(--brand-accent, #6366f1)",
						color: "#ffffff",
						border: "none",
						borderRadius: "4px",
						padding: "4px 10px",
						fontSize: "11px",
						fontWeight: 600,
						cursor: "pointer",
					}}
				>
					Выйти из демо
				</button>

				<button
					type="button"
					onClick={() => setIsDismissed(true)}
					aria-label="Скрыть предупреждение"
					title="Скрыть"
					style={{
						background: "transparent",
						border: "none",
						color: "var(--muted, #64748b)",
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						padding: "2px",
					}}
				>
					<X size={14} />
				</button>
			</div>
		</aside>
	);
};
