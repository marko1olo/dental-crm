import { denteAdminSecretRequestHeaders } from "../lib/denteRequestHeaders";
import type { DoctorPreferences } from "../store/doctorPreferencesStore";

/**
 * Fetches doctor clinical preferences from PostgreSQL (127.0.0.1:5432).
 */
export async function fetchDoctorPreferencesFromApi(): Promise<Partial<DoctorPreferences> | null> {
	try {
		const res = await fetch("/api/settings/doctor-preferences", {
			headers: denteAdminSecretRequestHeaders(),
		});
		if (!res.ok) return null;
		const data = (await res.json()) as {
			preferences?: Partial<DoctorPreferences> | null;
		};
		return data.preferences ?? null;
	} catch {
		return null;
	}
}

/**
 * Persists doctor clinical preferences directly to PostgreSQL (127.0.0.1:5432).
 */
export async function saveDoctorPreferencesToApi(
	preferences: DoctorPreferences,
	specialty?: string,
): Promise<boolean> {
	try {
		const res = await fetch("/api/settings/doctor-preferences", {
			method: "PUT",
			headers: denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				preferences,
				specialty: specialty || preferences.specialty,
			}),
		});
		return res.ok;
	} catch {
		return false;
	}
}
