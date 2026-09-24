import { useEffect, useMemo, useState } from "react";
import { actionFailureToast } from "../../lib/panelStateText";
import { safeLocalStorageGetItem } from "../../lib/safeLocalStorage";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import {
	type AuthArtItem,
	type AuthArtPack,
	getCurrentTimeSlot,
	selectAuthArt,
} from "./authArtSelector";

export interface AuthArtSettingsState {
	enabled: boolean;
	pack: AuthArtPack | string;
	dynamicByTimeOfDay: boolean;
}

export interface AuthArtBackgroundProps {
	readonly settings?: Partial<AuthArtSettingsState> | undefined;
	readonly overlayAlpha?: number | undefined;
	readonly className?: string | undefined;
}

export function AuthArtBackground({
	settings: propSettings,
	overlayAlpha = 0.25,
	className,
}: AuthArtBackgroundProps = {}) {
	const [manifest, setManifest] = useState<AuthArtItem[]>([]);
	const [selectedArt, setSelectedArt] = useState<AuthArtItem | null>(null);
	const [artSettings, setArtSettings] = useState<AuthArtSettingsState>({
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
				setArtSettings((prev) => ({
					...prev,
					...JSON.parse(saved),
				}));
			} catch (e) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(e as { status?: number })?.status ?? null,
					),
					"error",
				);
				logger.error("Failed to parse auth art settings from local storage", e);
			}
		}

		// Listen to storage events for cross-tab or settings sync
		const handleStorage = (e: StorageEvent) => {
			if (e.key === "dente_auth_art_settings" && e.newValue) {
				try {
					const parsed = JSON.parse(e.newValue);
					setArtSettings((prev) => ({
						...prev,
						...parsed,
					}));
				} catch {
					// ignore
				}
			}
		};
		window.addEventListener("storage", handleStorage);

		// Fetch manifest
		fetch("/auth-art/manifest.json")
			.then((res) => {
				/*
				 * Промис `fetch` на 404 и 500 не отклоняется. Без этой проверки тело
				 * отказа (или страница ошибки сервера) уходило бы в `setManifest`, и
				 * `manifest.length` становился undefined — выбор оформления ниже
				 * получал мусор вместо списка.
				 */
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data) => {
				if (!Array.isArray(data)) {
					throw new Error("Манифест оформления не является списком");
				}
				setManifest(data);
			})
			.catch((e) => logger.error("Failed to load auth art manifest", e));

		return () => {
			window.removeEventListener("storage", handleStorage);
		};
	}, []);

	const effectiveSettings = useMemo(
		() => ({
			...artSettings,
			...(propSettings || {}),
		}),
		[artSettings, propSettings],
	);

	useEffect(() => {
		if (!effectiveSettings.enabled || manifest.length === 0) {
			setSelectedArt(null);
			return;
		}

		const slot = effectiveSettings.dynamicByTimeOfDay
			? getCurrentTimeSlot()
			: "day";
		const isReducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const nav = navigator as any;
		const isSaveData =
			nav.connection?.saveData || nav.connection?.effectiveType?.includes("2g");

		const art = selectAuthArt(manifest, {
			pack: effectiveSettings.pack,
			slot,
			saveData: !!isSaveData,
			reducedMotion: isReducedMotion,
		});
		setSelectedArt(art);
	}, [manifest, effectiveSettings]);

	if (!effectiveSettings.enabled || !selectedArt) {
		return null; // Let the fallback mesh gradient handle the background
	}

	return (
		<div
			aria-hidden="true"
			className={`auth-art-background ${className || ""}`}
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				zIndex: -1,
				overflow: "hidden",
				backgroundColor: selectedArt.dominantColor,
				pointerEvents: "none",
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
					loading="lazy"
					decoding="async"
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
