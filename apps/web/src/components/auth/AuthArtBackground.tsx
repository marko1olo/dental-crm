import React, { useEffect, useState } from "react";
import { AuthArtItem, getCurrentTimeSlot, selectAuthArt } from "./authArtSelector";

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
		try {
			const saved = localStorage.getItem("dente_auth_art_settings");
			if (saved) {
				setArtSettings(JSON.parse(saved));
			}
		} catch (e) {
			console.error("Failed to parse auth art settings from local storage", e);
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
		const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const nav = navigator as any;
		const isSaveData = nav.connection?.saveData || nav.connection?.effectiveType?.includes("2g");

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

	// Calculate a scrim based on dominant color to ensure readability
	// We want to darken light images slightly and give a very dark overlay to dark images
	// This ensures both dark mode and light mode forms are legible.
	const hex = selectedArt.dominantColor;
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	const isLight = (r * 299 + g * 587 + b * 114) / 1000 > 128;
	const overlayAlpha = isLight ? 0.3 : 0.6; // Darker overlay for dark images to contrast light forms, lighter for light images

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
					filter: "blur(20px)",
					transform: "scale(1.1)", // prevent blurry edges
				}}
			/>
			<picture>
				{selectedArt.avif && <source srcSet={`/auth-art/${selectedArt.avif}`} type="image/avif" />}
				{selectedArt.webp && <source srcSet={`/auth-art/${selectedArt.webp}`} type="image/webp" />}
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
						transition: "opacity 1.5s ease-in-out",
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
					mixBlendMode: "multiply",
				}}
			/>
		</div>
	);
}
