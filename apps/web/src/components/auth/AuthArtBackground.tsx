import React, { useEffect, useMemo, useState } from "react";
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

export function calculateAdaptiveScrimAlpha(
	dominantColor?: string | null,
	baseAlpha = 0.25,
	themeMode?: string,
): number {
	if (!dominantColor) return Math.max(baseAlpha, 0.35);
	try {
		const clean = dominantColor.replace("#", "").trim();
		const r = parseInt(clean.slice(0, 2), 16);
		const g = parseInt(clean.slice(2, 4), 16);
		const b = parseInt(clean.slice(4, 6), 16);
		const lum = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
		if (themeMode === "light") {
			// In light theme, soft scrim preserves morning radiance while softening dark contrast
			if (lum < 0.25) {
				return Math.min(Math.max(baseAlpha, 0.3), 0.45);
			}
			return Math.min(Math.max(baseAlpha, 0.15), 0.25);
		}
		if (lum > 0.35) {
			return Math.max(baseAlpha, 0.55);
		}
		return Math.max(baseAlpha, 0.35);
	} catch {
		return Math.max(baseAlpha, 0.35);
	}
}

export function isThemeLight(theme?: string | null): boolean {
	if (!theme) return false;
	const lightThemes = new Set(["light", "warm_sand", "sakura", "calm_teal", "contrast"]);
	if (lightThemes.has(theme)) return true;
	const darkThemes = new Set(["dark", "night", "ocean", "emerald", "cyber_xray"]);
	if (darkThemes.has(theme)) return false;
	return false;
}

function resolveInitialThemeIsLight(): boolean {
	if (typeof document !== "undefined" && document.documentElement) {
		const dataTheme = document.documentElement.getAttribute?.("data-theme");
		if (dataTheme) {
			if (isThemeLight(dataTheme)) return true;
			if (["dark", "night", "ocean", "emerald", "cyber_xray"].includes(dataTheme)) return false;
		}
		if (document.documentElement.classList?.contains?.("light")) return true;
		if (document.documentElement.classList?.contains?.("dark")) return false;
	}
	const stored = safeLocalStorageGetItem("dente_theme_mode") || safeLocalStorageGetItem("dente_theme");
	if (stored) {
		if (isThemeLight(stored)) return true;
		if (["dark", "night", "ocean", "emerald", "cyber_xray"].includes(stored)) return false;
	}
	if (typeof window !== "undefined" && window.matchMedia) {
		return !window.matchMedia("(prefers-color-scheme: dark)").matches;
	}
	return false;
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
	const [imgError, setImgError] = useState(false);
	const [isLight, setIsLight] = useState<boolean>(resolveInitialThemeIsLight);

	useEffect(() => {
		if (typeof document === "undefined" || !document.documentElement) return;

		const checkTheme = () => {
			setIsLight(resolveInitialThemeIsLight());
		};

		checkTheme();

		let observer: MutationObserver | null = null;
		if (typeof MutationObserver !== "undefined") {
			observer = new MutationObserver(checkTheme);
			observer.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ["data-theme", "class"],
			});
		}

		if (typeof window !== "undefined") {
			window.addEventListener("storage", checkTheme);
		}
		return () => {
			if (observer) observer.disconnect();
			if (typeof window !== "undefined") {
				window.removeEventListener("storage", checkTheme);
			}
		};
	}, []);

	useEffect(() => {
		let isMounted = true;

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
					if (isMounted) {
						setArtSettings((prev) => ({
							...prev,
							...parsed,
						}));
					}
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
				if (isMounted) {
					setManifest(data);
				}
			})
			.catch((e) => logger.error("Failed to load auth art manifest", e));

		return () => {
			isMounted = false;
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

		const pickArt = () => {
			const currentSlot = effectiveSettings.dynamicByTimeOfDay
				? getCurrentTimeSlot(isLight ? "light" : "dark")
				: "day";
			const slot =
				isLight && (currentSlot === "night" || currentSlot === "evening")
					? "morning"
					: currentSlot;
			const isReducedMotion =
				typeof window !== "undefined" &&
				window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			const nav = (typeof navigator !== "undefined" ? navigator : {}) as any;
			const isSaveData =
				nav.connection?.saveData || nav.connection?.effectiveType?.includes("2g");

			const art = selectAuthArt(manifest, {
				pack: effectiveSettings.pack,
				slot,
				saveData: !!isSaveData,
				reducedMotion: isReducedMotion,
				theme: isLight ? "light" : "dark",
			});
			setSelectedArt(art);
		};

		pickArt();

		if (effectiveSettings.dynamicByTimeOfDay) {
			const interval = setInterval(pickArt, 60_000);
			return () => clearInterval(interval);
		}
	}, [manifest, effectiveSettings, isLight]);

	useEffect(() => {
		setLoaded(false);
		setImgError(false);
	}, [selectedArt]);

	const effectiveScrimAlpha = useMemo(() => {
		return calculateAdaptiveScrimAlpha(
			selectedArt?.dominantColor,
			overlayAlpha,
			isLight ? "light" : "dark",
		);
	}, [selectedArt?.dominantColor, overlayAlpha, isLight]);

	if (!effectiveSettings.enabled) {
		return null; // User explicitly disabled auth art
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
				zIndex: 0,
				overflow: "hidden",
				background: isLight
					? "radial-gradient(circle at 50% 35%, var(--teal-soft, #f0fdfa) 0%, var(--surface-muted, #e6fffa) 50%, var(--paper, #ccfbf1) 100%)"
					: "radial-gradient(circle at 50% 35%, var(--paper-soft, #101c24) 0%, var(--paper, #0a1117) 55%, var(--surface, #05080b) 100%)",
				transition: "background 0.3s ease-in-out",
				pointerEvents: "none",
			}}
		>
			{selectedArt && (
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
						ref={(img) => {
							if (img?.complete && img.naturalWidth > 0 && !loaded) {
								setLoaded(true);
							}
						}}
						src={`/auth-art/${selectedArt.webp || selectedArt.avif}`}
						alt=""
						loading="eager"
						decoding="async"
						onLoad={() => setLoaded(true)}
						onError={() => setImgError(true)}
						style={{
							width: "100%",
							height: "100%",
							objectFit: "cover",
							objectPosition: "center",
							opacity: loaded && !imgError ? 1 : 0,
							transition: "opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1)",
							display: "block",
						}}
					/>
				</picture>
			)}
			{/* Scrim layer with vertical gradient for WCAG readability across themes */}
			<div
				className="auth-art-scrim"
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: isLight
						? `linear-gradient(180deg, rgba(240, 253, 250, ${effectiveScrimAlpha * 0.4}) 0%, rgba(204, 251, 241, ${effectiveScrimAlpha * 0.7}) 100%)`
						: `linear-gradient(180deg, rgba(9, 14, 19, ${effectiveScrimAlpha * 0.75}) 0%, rgba(5, 9, 13, ${effectiveScrimAlpha * 0.95}) 100%)`,
				}}
			/>
		</div>
	);
}
