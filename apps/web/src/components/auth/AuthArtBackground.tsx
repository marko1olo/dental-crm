import { showToast } from "../GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
import { useEffect, useState } from "react";
import { safeLocalStorageGetItem } from "../../lib/safeLocalStorage";
import {
	type AuthArtItem,
	getCurrentTimeSlot,
	selectAuthArt,
} from "./authArtSelector";

export function AuthArtBackground() {
	const [manifest, setManifest] = useState<AuthArtItem[]>([]);
	const [selectedArt, setSelectedArt] = useState<AuthArtItem | null>(null);
	const [artSettings, setArtSettings] = useState({
		enabled: true,
		pack: "nature",
		dynamicByTimeOfDay: true,
	});
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		// Read settings from localStorage to handle unauthenticated state
		const saved = safeLocalStorageGetItem("dente_auth_art_settings");
		if (saved) {
			try {
				setArtSettings(JSON.parse(saved));
			} catch (e) {
			showToast(actionFailureToast("Ошибка выполнения операции", (e as { status?: number })?.status ?? null), "error");
				console.error(
					"Failed to parse auth art settings from local storage",
					e,
				);
			}
		}

		// Fetch manifest
		fetch("/auth-art/manifest.json")
			.then((res) => res.json())
			.then((data) => setManifest(data))
			.catch((e) => console.error("Failed to load auth art manifest", e));
	}, []);

	useEffect(() => {
		if (!artSettings.enabled || manifest.length === 0) return;

		const slot = artSettings.dynamicByTimeOfDay ? getCurrentTimeSlot() : "day";
		const isReducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		const nav = navigator as any;
		const isSaveData =
			nav.connection?.saveData || nav.connection?.effectiveType?.includes("2g");

		const art = selectAuthArt(manifest, {
			pack: artSettings.pack,
			slot,
			saveData: !!isSaveData,
			reducedMotion: isReducedMotion,
		});
		setSelectedArt(art);
	}, [manifest, artSettings]);

	if (!artSettings.enabled || !selectedArt) {
		return null; // Let the fallback mesh gradient handle the background
	}

	const overlayAlpha = 0.2; // Subtle scrim so background image stays crisp & clearly visible

	return (
		<div
			aria-hidden="true"
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				zIndex: -1,
				overflow: "hidden",
				backgroundColor: selectedArt.dominantColor,
			}}
		>
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					backgroundImage: `url(${selectedArt.lqip})`,
					backgroundSize: "cover",
					backgroundPosition: "center",
				}}
			/>
			<picture
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					display: "block",
				}}
			>
				{selectedArt.avif && (
					<source srcSet={`/auth-art/${selectedArt.avif}`} type="image/avif" />
				)}
				{selectedArt.webp && (
					<source srcSet={`/auth-art/${selectedArt.webp}`} type="image/webp" />
				)}
				<img
					src={`/auth-art/${selectedArt.webp || selectedArt.avif}`}
					alt=""
					onLoad={() => setLoaded(true)}
					style={{
						width: "100%",
						height: "100%",
						objectFit: "cover",
						objectPosition: "center",
						opacity: loaded ? 1 : 0,
						transition: "opacity 0.8s ease-in-out",
						display: "block",
					}}
				/>
			</picture>
			{/* Scrim layer for readability */}
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					backgroundColor: `rgba(0,0,0,${overlayAlpha})`,
				}}
			/>
		</div>
	);
}
