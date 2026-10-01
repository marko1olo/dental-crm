import {
	KeyRound,
	Sparkles,
	UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AcceptInvite } from "./AcceptInvite";
import { AuthArtBackground } from "./AuthArtBackground";
import { ClinicLogin } from "./ClinicLogin";
import { DemoTourSelector } from "./DemoTourSelector";
import { Register } from "./Register";
import { UserLogin } from "./UserLogin";

interface AuthHubProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	onSuccess: (clinicProfile: any, userProfile?: any) => void;
}

export type AuthHubView =
	| "user_login"
	| "clinic_login"
	| "register"
	| "demo_tour"
	| "accept_invite";

export function AuthHub({ onSuccess }: AuthHubProps) {
	const [view, setView] = useState<AuthHubView>("user_login");
	const [inviteToken, setInviteToken] = useState<string | null>(null);

	useEffect(() => {
		const checkHash = () => {
			const hash = window.location.hash;
			if (hash.startsWith("#/auth/accept-invite")) {
				const urlParams = new URLSearchParams(hash.split("?")[1]);
				const token = urlParams.get("token");
				if (token) {
					setInviteToken(token);
					setView("accept_invite");
				}
			} else if (hash === "#/auth/register") {
				setView("register");
			} else if (hash === "#/auth/demo") {
				setView("demo_tour");
			}
		};
		checkHash();
		window.addEventListener("hashchange", checkHash);
		return () => window.removeEventListener("hashchange", checkHash);
	}, []);

	if (view === "accept_invite" && inviteToken) {
		return (
			<div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
				<AuthArtBackground />
				<AcceptInvite
					token={inviteToken}
					onSuccess={onSuccess}
					onCancel={() => {
						window.location.hash = "";
						setView("user_login");
					}}
				/>
			</div>
		);
	}

	const activeTab =
		view === "register"
			? "register"
			: view === "demo_tour"
				? "demo"
				: "login";

	return (
		<div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
			<AuthArtBackground />

			<div className="auth-overlay">
				<div className="auth-glow auth-glow--left" />
				<div className="auth-glow auth-glow--right" />

				<div
					className={`auth-modal auth-glass-surface ${view === "demo_tour" ? "auth-modal--demo-tour" : ""}`}
				>
					{/* Unified Segmented Navigation Tab Bar */}
					<div className="auth-segmented-nav">
						<button
							type="button"
							onClick={() => setView("user_login")}
							className={`auth-segmented-btn ${activeTab === "login" ? "active" : ""}`}
							title="Вход по Email, телефону или ID клиники"
						>
							<KeyRound size={14} className="auth-nav-icon" />
							<span>Вход</span>
						</button>

						<button
							type="button"
							onClick={() => setView("register")}
							className={`auth-segmented-btn ${activeTab === "register" ? "active" : ""}`}
							title="Создать рабочий кабинет за 30 секунд без пейволла"
						>
							<UserPlus size={14} className="auth-nav-icon" />
							<span>Регистрация</span>
						</button>

						<button
							type="button"
							onClick={() => setView("demo_tour")}
							className={`auth-segmented-btn auth-segmented-btn--highlight ${activeTab === "demo" ? "active" : ""}`}
							title="Ознакомительный тур по 5 клиническим ролям"
						>
							<Sparkles size={14} className="auth-nav-icon" />
							<span>Демо-тур</span>
						</button>
					</div>

					{/* Active View Container */}
					{view === "register" && (
						<Register
							onSuccess={onSuccess}
							onSwitchToLogin={() => setView("user_login")}
							onSwitchToDemoTour={() => setView("demo_tour")}
						/>
					)}

					{view === "demo_tour" && (
						<DemoTourSelector
							onSuccess={onSuccess}
							onBackToLogin={() => setView("user_login")}
						/>
					)}

					{view === "clinic_login" && (
						<ClinicLogin
							onLoginSuccess={(cp) => onSuccess(cp, null)}
							onSwitchToUserLogin={() => setView("user_login")}
							onSwitchToDemoTour={() => setView("demo_tour")}
						/>
					)}

					{view === "user_login" && (
						<UserLogin
							onSuccess={onSuccess}
							onSwitchToRegister={() => setView("register")}
							onSwitchToClinicMode={() => setView("clinic_login")}
							onSwitchToDemoTour={() => setView("demo_tour")}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
