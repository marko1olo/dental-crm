import React, { useEffect, useState } from "react";
import { AcceptInvite } from "./AcceptInvite";
import { ClinicLogin } from "./ClinicLogin";
import { Register } from "./Register";
import { UserLogin } from "./UserLogin";
import { AuthArtBackground } from "./AuthArtBackground";

interface AuthHubProps {
	onSuccess: (clinicProfile: any, userProfile?: any) => void;
}

export function AuthHub({ onSuccess }: AuthHubProps) {
	const [view, setView] = useState<
		"clinic_login" | "user_login" | "register" | "accept_invite"
	>("user_login");
	const [inviteToken, setInviteToken] = useState<string | null>(null);

	useEffect(() => {
		// Store original theme states to restore them on unmount
		const originalDataTheme = document.body.getAttribute("data-theme");
		const hadDarkClassDoc = document.documentElement.classList.contains("dark");
		const hadThemeDarkClassBody = document.body.classList.contains("theme-dark");

		// Force dark theme for the login screen to ensure glassmorphism visibility
		// against all possible art backgrounds (especially bright ones).
		document.body.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.body.classList.add("theme-dark");

		return () => {
			// Restore original theme states so the Workspace (post-login) theme isn't broken
			if (originalDataTheme) {
				document.body.setAttribute("data-theme", originalDataTheme);
			} else {
				document.body.removeAttribute("data-theme");
			}

			if (!hadDarkClassDoc) {
				document.documentElement.classList.remove("dark");
			}
			if (!hadThemeDarkClassBody) {
				document.body.classList.remove("theme-dark");
			}
		};
	}, []);

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

	if (view === "accept_invite" && inviteToken) {
		return (
			<>
				<AuthArtBackground />
				<AcceptInvite
					token={inviteToken}
					onSuccess={onSuccess}
					onCancel={() => {
						window.location.hash = "";
						setView("user_login");
					}}
				/>
			</>
		);
	}

	if (view === "register") {
		return (
			<>
				<AuthArtBackground />
				<Register
					onSuccess={onSuccess}
					onSwitchToLogin={() => setView("user_login")}
				/>
			</>
		);
	}

	if (view === "user_login") {
		return (
			<>
				<AuthArtBackground />
				<UserLogin
					onSuccess={onSuccess}
					onSwitchToRegister={() => setView("register")}
					onSwitchToClinicMode={() => setView("clinic_login")}
				/>
			</>
		);
	}

	// Fallback to legacy shared-device clinic login mode
	return (
		<>
			<AuthArtBackground />
			<ClinicLogin
				onLoginSuccess={(cp) => {
					// Legacy clinic login only returns clinicProfile, NO staffToken yet
					onSuccess(cp, null);
				}}
			/>
		</>
	);
}
