import {
	ChevronLeft,
	Loader2,
	Play,
	Sparkles,
} from "lucide-react";
import React from "react";
import { Step0PracticeType } from "./onboarding/steps/Step0PracticeType";
import { Step1Doctor } from "./onboarding/steps/Step1Doctor";
import { Step2Team } from "./onboarding/steps/Step2Team";
import { Step3Workplace } from "./onboarding/steps/Step3Workplace";
import { Step4Services } from "./onboarding/steps/Step4Services";
import { Step5Equipment } from "./onboarding/steps/Step5Equipment";
import { Step6Growth } from "./onboarding/steps/Step6Growth";
import { Step7Branding } from "./onboarding/steps/Step7Branding";
import { THEME_COLORS } from "./onboarding/ui/SharedOnboardingUI";
import { useOnboardingLogic } from "./onboarding/useOnboardingLogic";

export function OnboardingSetupWizard({
	onComplete,
	isDark: initialIsDark = true,
}: {
	onComplete: () => void;
	isDark?: boolean;
}) {
	const logic = useOnboardingLogic(onComplete, initialIsDark);

	React.useEffect(() => {
		document.body.setAttribute("data-theme", logic.isDark ? "dark" : "light");
		if (logic.isDark) {
			document.documentElement.classList.add("dark");
			document.body.classList.add("theme-dark");
		} else {
			document.documentElement.classList.remove("dark");
			document.body.classList.remove("theme-dark");
		}
	}, [logic.isDark]);

	const bg = logic.isDark
		? `radial-gradient(ellipse at 50% 0%, hsl(240 30% 15%), hsl(230 25% 8%) 80%)`
		: `radial-gradient(ellipse at 50% 0%, hsl(210 60% 95%), hsl(220 40% 88%) 80%)`;
	const textColor = logic.isDark ? "#e8eaf0" : "#1a1d2e";
	const accentColor = THEME_COLORS[logic.theme] || THEME_COLORS.teal;

	const goBack = () => {
		let prev = logic.step - 1;
		if (logic.practiceType === "solo" && prev === 2) prev = 1; // Skip team step back
		logic.setStep(Math.max(0, prev));
	};

	const goNext = () => {
		if (logic.step < 7) {
			let next = logic.step + 1;
			if (logic.practiceType === "solo" && next === 2) next = 3; // Skip team step forward
			logic.setStep(next);
		} else {
			logic.handleLaunch();
		}
	};

	const stepsList = [0, 1, 2, 3, 4, 5, 6, 7].filter(
		(s) => !(logic.practiceType === "solo" && s === 2)
	);

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
				<div
					style={{
						display: "flex",
						gap: 6,
						justifyContent: "center",
						marginBottom: 32,
					}}
				>
					{stepsList.map((s) => (
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
					{logic.step === 0 && (
						<Step0PracticeType
							practiceType={logic.practiceType}
							handleSelectPracticeType={logic.handleSelectPracticeType}
							accentColor={accentColor}
							isDark={logic.isDark}
							textColor={textColor}
						/>
					)}
					{logic.step === 1 && (
						<Step1Doctor
							doctorName={logic.doctorName}
							setDoctorName={logic.setDoctorName}
							specs={logic.specs}
							toggleSpec={logic.toggleSpec}
							canSign={logic.canSign}
							setCanSign={logic.setCanSign}
							accentColor={accentColor}
							isDark={logic.isDark}
							textColor={textColor}
						/>
					)}
					{logic.step === 2 && (
						<Step2Team
							staff={logic.staff}
							setStaff={logic.setStaff}
							accentColor={accentColor}
							isDark={logic.isDark}
							textColor={textColor}
						/>
					)}
					{logic.step === 3 && (
						<Step3Workplace
							chairs={logic.chairs}
							setChairs={logic.setChairs}
							workHours={logic.workHours}
							setWorkHours={logic.setWorkHours}
							defaultDuration={logic.defaultDuration}
							setDefaultDuration={logic.setDefaultDuration}
							practiceType={logic.practiceType}
							accentColor={accentColor}
							isDark={logic.isDark}
							textColor={textColor}
						/>
					)}
					{logic.step === 4 && (
						<Step4Services
							services={logic.services}
							toggleService={logic.toggleService}
							legal={logic.legal}
							setLegal={logic.setLegal}
							accentColor={accentColor}
							isDark={logic.isDark}
							textColor={textColor}
						/>
					)}
					{logic.step === 5 && (
						<Step5Equipment
							equipment={logic.equipment}
							toggleEquipment={logic.toggleEquipment}
							accentColor={accentColor}
							isDark={logic.isDark}
							textColor={textColor}
						/>
					)}
					{logic.step === 6 && (
						<Step6Growth
							growth={logic.growth}
							toggleGrowth={logic.toggleGrowth}
							accentColor={accentColor}
							isDark={logic.isDark}
							textColor={textColor}
						/>
					)}
					{logic.step === 7 && (
						<Step7Branding
							theme={logic.theme}
							setTheme={logic.setTheme}
							migrationStatus={logic.migrationStatus}
							setMigrationStatus={logic.setMigrationStatus}
							logoUploaded={logic.logoUploaded}
							setLogoUploaded={logic.setLogoUploaded}
							accentColor={accentColor}
							isDark={logic.isDark}
							textColor={textColor}
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
							onClick={goBack}
							disabled={logic.step === 0 || logic.launching}
							style={{
								padding: "12px 24px",
								borderRadius: 12,
								background: "transparent",
								border: `1px solid ${logic.isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`,
								color: textColor,
								cursor: logic.step === 0 ? "not-allowed" : "pointer",
								opacity: logic.step === 0 ? 0.5 : 1,
							}}
						>
							Назад
						</button>
						<button
							onClick={goNext}
							disabled={
								logic.launching ||
								(logic.step === 1 && logic.specs.length === 0) ||
								(logic.step === 1 && !logic.doctorName.trim())
							}
							style={{
								display: "flex",
								alignItems: "center",
								gap: 8,
								padding: "12px 32px",
								borderRadius: 12,
								background:
									(logic.step === 1 && logic.specs.length === 0) || (logic.step === 1 && !logic.doctorName.trim())
										? "gray"
										: accentColor,
								color: "#fff",
								border: "none",
								cursor:
									(logic.step === 1 && logic.specs.length === 0) || (logic.step === 1 && !logic.doctorName.trim())
										? "not-allowed"
										: "pointer",
								fontWeight: 600,
								fontSize: 16,
								boxShadow:
									(logic.step === 1 && logic.specs.length === 0) || (logic.step === 1 && !logic.doctorName.trim())
										? "none"
										: `0 4px 12px ${accentColor}66`,
							}}
						>
							{logic.launching ? (
								<Loader2 size={20} className="lucide-spin" />
							) : logic.step < 7 ? (
								"Далее"
							) : (
								<>
									<Play size={18} fill="currentColor" />
									Запустить DENTE
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
