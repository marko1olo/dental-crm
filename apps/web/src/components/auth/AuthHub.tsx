import { useEffect, useState } from "react";
import { AcceptInvite } from "./AcceptInvite";
import { AuthArtBackground } from "./AuthArtBackground";
import { ClinicLogin } from "./ClinicLogin";
import { Register } from "./Register";
import { UserLogin } from "./UserLogin";

interface AuthHubProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	onSuccess: (clinicProfile: any, userProfile?: any) => void;
}

export function AuthHub({ onSuccess }: AuthHubProps) {
	const [view, setView] = useState<
		"clinic_login" | "user_login" | "register" | "accept_invite"
	>("user_login");
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
			}
		};
		checkHash();
		window.addEventListener("hashchange", checkHash);
		return () => window.removeEventListener("hashchange", checkHash);
	}, []);

	// Shared background art layer — wraps all auth views
	const renderContent = () => {
		if (view === "accept_invite" && inviteToken) {
			return (
				<AcceptInvite
					token={inviteToken}
					onSuccess={onSuccess}
					onCancel={() => {
						window.location.hash = "";
						setView("user_login");
					}}
				/>
			);
		}

		if (view === "register") {
			return (
				<Register
					onSuccess={onSuccess}
					onSwitchToLogin={() => setView("user_login")}
				/>
			);
		}

		if (view === "user_login") {
			return (
				<UserLogin
					onSuccess={onSuccess}
					onSwitchToRegister={() => setView("register")}
					onSwitchToClinicMode={() => setView("clinic_login")}
				/>
			);
		}

		return (
			<ClinicLogin
				onLoginSuccess={(cp) => {
					onSuccess(cp, null);
				}}
			/>
		);
	};

	return (
		<div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
			<AuthArtBackground />
			{renderContent()}
		</div>
	);
}
