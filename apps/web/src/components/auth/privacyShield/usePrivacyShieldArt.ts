import { useEffect, useState } from "react";
import { logger } from "../../../utils/logger";
import {
	type AuthArtItem,
	getCurrentTimeSlot,
	selectAuthArt,
} from "../authArtSelector";

export function usePrivacyShieldArt(isOpen: boolean) {
	const [manifest, setManifest] = useState<AuthArtItem[]>([]);
	const [selectedArt, setSelectedArt] = useState<AuthArtItem | null>(null);
	const [artLoaded, setArtLoaded] = useState(false);
	const [artError, setArtError] = useState(false);

	useEffect(() => {
		setArtLoaded(false);
		setArtError(false);
	}, [selectedArt]);

	useEffect(() => {
		if (!isOpen) return;
		let isMounted = true;
		fetch("/auth-art/manifest.json")
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data) => {
				if (isMounted && Array.isArray(data)) setManifest(data);
			})
			.catch((err) => {
				logger.warn("[DoctorPrivacyShield] Failed to load auth art manifest:", err);
			});
		return () => { isMounted = false; };
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen || manifest.length === 0) {
			setSelectedArt(null);
			return;
		}
		const slot = getCurrentTimeSlot();
		const isReducedMotion =
			typeof window !== "undefined" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		const art = selectAuthArt(manifest, {
			pack: "dental-epic",
			slot,
			saveData: false,
			reducedMotion: isReducedMotion,
		});
		setSelectedArt(art);
	}, [isOpen, manifest]);

	return { selectedArt, artLoaded, setArtLoaded, artError, setArtError };
}
