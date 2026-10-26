import React from "react";
import { DoctorPrivacyShieldPinPad } from "../DoctorPrivacyShieldPinPad";
import type { DoctorPrivacyShieldProps } from "../doctorPrivacyShieldHelpers";
import { PrivacyShieldCardHeader } from "./PrivacyShieldCardHeader";
import { PrivacyShieldDotsAndError } from "./PrivacyShieldDotsAndError";
import { PrivacyShieldFooter } from "./PrivacyShieldFooter";
import { usePrivacyShieldArt } from "./usePrivacyShieldArt";
import { usePrivacyShieldPin } from "./usePrivacyShieldPin";

export function DoctorPrivacyShield({
	isOpen,
	doctor,
	onUnlock,
	onClinicLogout,
	onFullLock,
	className = "",
}: DoctorPrivacyShieldProps) {
	const { selectedArt, artLoaded, setArtLoaded, artError, setArtError } = usePrivacyShieldArt(isOpen);
	const { pin, errorShake, loading, errorText, handleKeyPress, handleBackspace, handleClear } =
		usePrivacyShieldPin(isOpen, doctor, onUnlock);

	if (!isOpen) return null;

	const dominantBg = selectedArt?.dominantColor || "#0a0f1d";

	return (
		<div
			className={`dnt-doctor-privacy-shield ${className}`}
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				zIndex: 9999,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: dominantBg,
				backdropFilter: "blur(24px)",
				WebkitBackdropFilter: "blur(24px)",
				transition: "opacity 0.25s ease-out",
			}}
		>
			{/* Фоновый арт */}
			{selectedArt && !artError && (
				<picture style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}>
					<source srcSet={`/auth-art/${selectedArt.avif}`} type="image/avif" />
					<source srcSet={`/auth-art/${selectedArt.webp}`} type="image/webp" />
					<img
						src={`/auth-art/${selectedArt.webp}`}
						alt=""
						onLoad={() => setArtLoaded(true)}
						onError={() => setArtError(true)}
						style={{
							width: "100%",
							height: "100%",
							objectFit: "cover",
							opacity: artLoaded ? 0.35 : 0.1,
							filter: "blur(12px) brightness(0.55)",
							transform: "scale(1.08)",
							transition: "opacity 0.6s ease-out",
						}}
					/>
				</picture>
			)}

			{/* Тёмный полупрозрачный оверлей */}
			<div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(5, 8, 16, 0.75)", zIndex: 1 }} />

			{/* Центрированная карточка врача */}
			<div
				style={{
					position: "relative",
					zIndex: 2,
					width: "min(380px, 92vw)",
					padding: "24px 20px 20px 20px",
					borderRadius: "20px",
					backgroundColor: "rgba(15, 23, 42, 0.85)",
					backdropFilter: "blur(20px)",
					border: "1px solid rgba(255, 255, 255, 0.12)",
					boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					textAlign: "center",
					animation: errorShake ? "dnt-privacy-shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both" : "none",
				}}
			>
				<PrivacyShieldCardHeader doctor={doctor} />
				<PrivacyShieldDotsAndError pin={pin} errorText={errorText} />
				<DoctorPrivacyShieldPinPad
					pin={pin}
					loading={loading}
					onKeyPress={handleKeyPress}
					onClear={handleClear}
					onBackspace={handleBackspace}
				/>
				<PrivacyShieldFooter onFullLock={onFullLock} onClinicLogout={onClinicLogout} />
			</div>
		</div>
	);
}
