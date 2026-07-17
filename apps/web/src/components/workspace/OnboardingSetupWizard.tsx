import React from "react";
import { ChevronLeft, ChevronRight, ListTodo, Loader2, Play, Sparkles } from "lucide-react";
import { useOnboardingLogic } from "./onboarding/useOnboardingLogic";
import { THEME_COLORS } from "./onboarding/ui/SharedOnboardingUI";
import { Step1Specializations } from "./onboarding/steps/Step1Specializations";
import { Step2Infrastructure } from "./onboarding/steps/Step2Infrastructure";
import { Step3Modules } from "./onboarding/steps/Step3Modules";
import { Step4Branding } from "./onboarding/steps/Step4Branding";
import { Step5Staff } from "./onboarding/steps/Step5Staff";
import { Step6Legal } from "./onboarding/steps/Step6Legal";
import { Step7Migration } from "./onboarding/steps/Step7Migration";

export function OnboardingSetupWizard({
	onComplete,
	isDark: initialIsDark = true,
}: {
	onComplete: () => void;
	isDark?: boolean;
}) {
	const logic = useOnboardingLogic(onComplete, initialIsDark);
	
	const bg = logic.isDark
		? `radial-gradient(ellipse at 50% 0%, hsl(240 30% 15%), hsl(230 25% 8%) 80%)`
		: `radial-gradient(ellipse at 50% 0%, hsl(210 60% 95%), hsl(220 40% 88%) 80%)`;
	const textColor = logic.isDark ? "#e8eaf0" : "#1a1d2e";
	const accentColor = THEME_COLORS[logic.theme] || THEME_COLORS.teal;

	return (
		<div
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				right: 0,
				minHeight: "100vh",
				zIndex: 9999,
				background: bg,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				padding: "40px 16px 80px",
				opacity: logic.fadeOut ? 0 : 1,
				transition: "opacity .45s ease, background 0.3s",
				color: textColor,
				overflowX: "hidden",
			}}
		>
			<div
				style={{
					textAlign: "center",
					marginBottom: 32,
					maxWidth: 800,
					width: "100%",
				}}
			>
				<div
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: 10,
						padding: "6px 18px",
						borderRadius: 20,
						background: `${accentColor}22`,
						border: `1px solid ${accentColor}44`,
						marginBottom: 24,
						fontSize: 13,
						color: accentColor,
						transition: "all 0.3s",
					}}
				>
					<Sparkles size={14} /> DENTE Setup Wizard
				</div>
				<h1
					style={{
						margin: "0 0 24px",
						fontSize: "clamp(24px,4vw,34px)",
						fontWeight: 800,
						letterSpacing: "-0.5px",
					}}
				>
					{logic.step === 1 && "Шаг 1. Кто мы?"}
					{logic.step === 2 && "Шаг 2. Инфраструктура"}
					{logic.step === 3 && "Шаг 3. Инструменты"}
					{logic.step === 4 && "Шаг 4. Брендинг"}
					{logic.step === 5 && "Шаг 5. Команда"}
					{logic.step === 6 && "Шаг 6. Реквизиты"}
					{logic.step === 7 && "Шаг 7. База Данных"}
				</h1>
				<div
					style={{
						display: "flex",
						gap: 6,
						justifyContent: "center",
						marginBottom: 32,
					}}
				>
					{[1, 2, 3, 4, 5, 6, 7].map((s) => (
						<div
							key={s}
							style={{
								width: s === logic.step ? 32 : 12,
								height: 6,
								borderRadius: 3,
								background:
									s <= logic.step
										? accentColor
										: logic.isDark
											? "rgba(255,255,255,0.1)"
											: "rgba(0,0,0,0.1)",
								transition: "all 0.3s",
							}}
						/>
					))}
				</div>
			</div>

			<div
				style={{
					width: "100%",
					maxWidth: 1000,
					display: "flex",
					gap: 32,
					flexDirection: "row",
					flexWrap: "wrap",
					justifyContent: "center",
				}}
			>
				{/* Main Content Area */}
				<div
					style={{
						flex: "1 1 600px",
						maxWidth: 700,
						minWidth: 320,
						width: "100%",
					}}
				>
					{logic.step === 1 && (
						<Step1Specializations 
							specs={logic.specs} 
							toggleSpec={logic.toggleSpec} 
							setSpecs={logic.setSpecs} 
							accentColor={accentColor} 
							isDark={logic.isDark} 
							textColor={textColor} 
						/>
					)}
					{logic.step === 2 && (
						<Step2Infrastructure 
							chairs={logic.chairs} 
							setChairs={logic.setChairs} 
							workHours={logic.workHours} 
							setWorkHours={logic.setWorkHours} 
							accentColor={accentColor} 
							isDark={logic.isDark} 
						/>
					)}
					{logic.step === 3 && (
						<Step3Modules 
							modules={logic.modules} 
							toggleModule={logic.toggleModule} 
							accentColor={accentColor} 
							isDark={logic.isDark} 
						/>
					)}
					{logic.step === 4 && (
						<Step4Branding 
							theme={logic.theme} 
							setTheme={logic.setTheme} 
							isDark={logic.isDark} 
						/>
					)}
					{logic.step === 5 && (
						<Step5Staff 
							staff={logic.staff} 
							setStaff={logic.setStaff} 
							specs={logic.specs} 
							accentColor={accentColor} 
							isDark={logic.isDark} 
							textColor={textColor} 
						/>
					)}
					{logic.step === 6 && (
						<Step6Legal 
							legal={logic.legal} 
							setLegal={logic.setLegal} 
							logoUploaded={logic.logoUploaded} 
							setLogoUploaded={logic.setLogoUploaded} 
							accentColor={accentColor} 
							isDark={logic.isDark} 
							textColor={textColor} 
						/>
					)}
					{logic.step === 7 && (
						<Step7Migration 
							migrationStatus={logic.migrationStatus} 
							setMigrationStatus={logic.setMigrationStatus} 
							accentColor={accentColor} 
							isDark={logic.isDark} 
						/>
					)}

					{/* Navigation */}
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							marginTop: 40,
							borderTop: `1px solid ${logic.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
							paddingTop: 24,
						}}
					>
						<button
							onClick={() => logic.setStep(Math.max(1, logic.step - 1))}
							disabled={logic.step === 1 || logic.launching}
							style={{
								padding: "12px 24px",
								borderRadius: 12,
								background: "transparent",
								border: `1px solid ${logic.isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`,
								color: textColor,
								cursor: logic.step === 1 ? "not-allowed" : "pointer",
								opacity: logic.step === 1 ? 0.5 : 1,
							}}
						>
							Назад
						</button>
						<button
							onClick={() => (logic.step < 7 ? logic.setStep(logic.step + 1) : logic.handleLaunch())}
							disabled={logic.launching || (logic.step === 1 && logic.specs.length === 0)}
							style={{
								display: "flex",
								alignItems: "center",
								gap: 8,
								padding: "12px 32px",
								borderRadius: 12,
								background: logic.step === 1 && logic.specs.length === 0 ? "gray" : accentColor,
								color: "#fff",
								border: "none",
								cursor: logic.step === 1 && logic.specs.length === 0 ? "not-allowed" : "pointer",
								fontWeight: 600,
								fontSize: 16,
								boxShadow: logic.step === 1 && logic.specs.length === 0 ? "none" : `0 4px 12px ${accentColor}66`,
							}}
						>
							{logic.launching ? (
								<Loader2 size={20} className="lucide-spin" />
							) : logic.step < 7 ? (
								"Далее"
							) : (
								"Запустить DENTE"
							)}
							{!logic.launching && logic.step < 7 && <ChevronRight size={20} />}
							{!logic.launching && logic.step === 7 && <Play size={20} />}
						</button>
					</div>
				</div>

				{/* Sticky Summary */}
				<div
					style={{
						flex: "0 1 300px",
						background: logic.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
						padding: 24,
						borderRadius: 24,
						backdropFilter: "blur(20px)",
						height: "fit-content",
						position: "sticky",
						top: 20,
					}}
				>
					<h3
						style={{
							marginBottom: 16,
							display: "flex",
							alignItems: "center",
							gap: 8,
						}}
					>
						<ListTodo size={20} color={accentColor} /> Итог настройки
					</h3>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 12,
							fontSize: 14,
						}}
					>
						<div style={{ display: "flex", justifyContent: "space-between" }}>
							<span>Направления:</span>{" "}
							<span style={{ fontWeight: 600 }}>{logic.specs.length} выбр.</span>
						</div>
						<div style={{ display: "flex", justifyContent: "space-between" }}>
							<span>Кресел:</span>{" "}
							<span style={{ fontWeight: 600 }}>{logic.chairs} шт.</span>
						</div>
						<div style={{ display: "flex", justifyContent: "space-between" }}>
							<span>Часы работы:</span>{" "}
							<span style={{ fontWeight: 600 }}>
								{logic.workHours[0]}:00 - {logic.workHours[1]}:00
							</span>
						</div>
						<div style={{ display: "flex", justifyContent: "space-between" }}>
							<span>Врачей:</span>{" "}
							<span style={{ fontWeight: 600 }}>{logic.staff.length} чел.</span>
						</div>
						{logic.legal.inn && (
							<div style={{ display: "flex", justifyContent: "space-between" }}>
								<span>ИНН:</span>{" "}
								<span style={{ fontWeight: 600 }}>{logic.legal.inn}</span>
							</div>
						)}
						{logic.migrationStatus === "done" && (
							<div style={{ display: "flex", justifyContent: "space-between" }}>
								<span>База:</span>{" "}
								<span style={{ fontWeight: 600, color: "#10b981" }}>4521 пац.</span>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
