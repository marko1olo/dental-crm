/**
 * Utility module to interface with Rutoken Web Plugin
 * for signing documents with GOST Hardware Tokens.
 */

declare global {
	interface Window {
		rutoken?: any;
		rutokenPluginLoaded?: boolean;
	}
}

export interface RutokenCertificate {
	subjectName: string;
	issuerName: string;
	validFrom: string;
	validTo: string;
	id: string; // The certificate ID on the device
	deviceId: number;
}

/**
 * Checks if the Rutoken Web Plugin is installed and loaded.
 */
export async function checkRutokenPlugin(): Promise<boolean> {
	if (typeof window === "undefined") return false;

	try {
		if (window.rutokenPluginLoaded && window.rutoken) {
			return true;
		}

		// Basic check if the script is loaded
		if (window.rutoken && window.rutoken.ready) {
			await window.rutoken.ready;
			const isExtensionInstalled = await window.rutoken.isExtensionInstalled();
			if (!isExtensionInstalled) return false;
			
			const isPluginInstalled = await window.rutoken.isPluginInstalled();
			if (!isPluginInstalled) return false;

			await window.rutoken.loadPlugin();
			window.rutokenPluginLoaded = true;
			return true;
		}
		
		return false;
	} catch (e) {
		console.warn("Rutoken plugin check failed:", e);
		return false;
	}
}

/**
 * Retrieves a list of available personal certificates from all connected Rutoken devices.
 */
export async function getRutokenCertificates(): Promise<RutokenCertificate[]> {
	const hasPlugin = await checkRutokenPlugin();
	if (!hasPlugin) {
		throw new Error("Rutoken Web Plugin не установлен или не запущен.");
	}

	const plugin = window.rutoken;
	try {
		const devices = await plugin.enumerateDevices();
		if (devices.length === 0) {
			return []; // No physical devices connected
		}

		const certs: RutokenCertificate[] = [];

		for (const deviceId of devices) {
			// Get certificates for user category
			const deviceCerts = await plugin.enumerateCertificates(deviceId, plugin.CERT_CATEGORY_USER);
			
			for (const certId of deviceCerts) {
				const subjectName = await plugin.getCertificateInfo(deviceId, certId, plugin.CERT_INFO_SUBJECT);
				const issuerName = await plugin.getCertificateInfo(deviceId, certId, plugin.CERT_INFO_ISSUER);
				const validFrom = await plugin.getCertificateInfo(deviceId, certId, plugin.CERT_INFO_NOT_VALID_BEFORE);
				const validTo = await plugin.getCertificateInfo(deviceId, certId, plugin.CERT_INFO_NOT_VALID_AFTER);
				
				certs.push({
					subjectName: parseCommonName(subjectName),
					issuerName: parseCommonName(issuerName),
					validFrom: new Date(validFrom * 1000).toLocaleDateString("ru-RU"),
					validTo: new Date(validTo * 1000).toLocaleDateString("ru-RU"),
					id: certId,
					deviceId: deviceId,
				});
			}
		}

		return certs;
	} catch (error: any) {
		console.error("Failed to read Rutoken certificates:", error);
		throw new Error(`Ошибка при чтении Рутокена: ${error.message || error}`);
	}
}

/**
 * Signs string data using a specific certificate on a specific Rutoken device.
 */
export async function signDataWithRutoken(
	deviceId: number,
	certId: string,
	data: string,
	pin: string
): Promise<string> {
	const hasPlugin = await checkRutokenPlugin();
	if (!hasPlugin) {
		throw new Error("Rutoken Web Plugin не установлен или не запущен.");
	}

	const plugin = window.rutoken;

	try {
		// Login to the device using the PIN
		await plugin.login(deviceId, pin);

		// Calculate hash (GOST 34.11-2012 256)
		// We first need to convert string to hex or base64 as required by the plugin
		const hashHex = await plugin.digest(deviceId, plugin.HASH_TYPE_GOST3411_12_256, data);
		
		// Sign the hash (Detached signature)
		const signatureHex = await plugin.sign(deviceId, certId, hashHex, false, {
			detached: true,
			addSignCertV2: true,
		});

		// Logout
		await plugin.logout(deviceId);

		// Convert hex signature to Base64 (Assuming backend expects Base64 for PKCS7/CMS)
		// Usually plugin.sign with addSignCertV2 produces CMS.
		return hexToBase64(signatureHex);
	} catch (error: any) {
		console.error("Rutoken signing error:", error);
		try {
			await plugin.logout(deviceId);
		} catch (e) {
			// ignore logout errors on failure
		}
		
		// Common error codes mapped to user-friendly messages
		if (error.message && error.message.includes("PIN")) {
			throw new Error("Неверный PIN-код устройства.");
		}
		
		throw new Error(`Ошибка подписания Рутокеном: ${error.message || error}`);
	}
}

// Helpers
function parseCommonName(dnInfo: string): string {
	const match = dnInfo.match(/CN=(.*?)(?:,|$)/);
	return match && match[1] ? match[1].trim() : dnInfo;
}

function hexToBase64(hexstring: string): string {
	const matches = hexstring.match(/\w{2}/g);
	if (!matches) return "";
	return btoa(String.fromCharCode.apply(null, matches.map(a => parseInt(a, 16))));
}
