/**
 * Utility module to interface with CryptoPro Browser Plug-in (cadesplugin)
 * for signing documents with Qualified Electronic Signature (УКЭП).
 */

declare global {
	interface Window {
		cadesplugin?: any;
	}
}

export interface CryptoProCertificate {
	subjectName: string;
	issuerName: string;
	validFrom: string;
	validTo: string;
	thumbprint: string;
	hasPrivateKey: boolean;
	isValid: boolean;
	certObject: any;
}

/**
 * Checks if the CryptoPro Browser Plug-in is installed and loaded in the browser.
 */
export async function checkCryptoProPlugin(): Promise<boolean> {
	if (typeof window === "undefined") return false;

	try {
		// Wait for cadesplugin global object to be injected and ready
		if (!window.cadesplugin) {
			return false;
		}

		// Try to run a simple API call to check if it's operational
		await window.cadesplugin.then;
		return true;
	} catch (e) {
		console.warn("CryptoPro plugin check failed:", e);
		return false;
	}
}

/**
 * Retrieves a list of available personal certificates from the CryptoPro store.
 */
export async function getPersonalCertificates(): Promise<
	CryptoProCertificate[]
> {
	const hasPlugin = await checkCryptoProPlugin();
	if (!hasPlugin) {
		throw new Error(
			"КриптоПро ЭЦП Browser Plug-in не установлен или не запущен.",
		);
	}

	const cades = window.cadesplugin;

	try {
		// Create Store object
		const oStore = await cades.CreateObjectAsync("CAdESCOM.Store");
		// Open personal certificates store read-only
		await oStore.Open(
			cades.CADESCOM_CONTAINER_STORE,
			cades.CAPICOM_MY_STORE,
			cades.CAPICOM_STORE_OPEN_READ_ONLY,
		);

		const oCertificates = await oStore.Certificates;
		const count = await oCertificates.Count;
		const certs: CryptoProCertificate[] = [];

		for (let i = 1; i <= count; i++) {
			try {
				const cert = await oCertificates.Item(i);
				const subjectName = await cert.SubjectName;
				const issuerName = await cert.IssuerName;
				const validFrom = await cert.ValidFromDate;
				const validTo = await cert.ValidToDate;
				const thumbprint = await cert.Thumbprint;
				const hasPrivateKey = await cert.HasPrivateKey();
				const isValid = await (await cert.IsValid()).Result;

				certs.push({
					subjectName,
					issuerName,
					validFrom: String(validFrom),
					validTo: String(validTo),
					thumbprint,
					hasPrivateKey,
					isValid,
					certObject: cert,
				});
			} catch (certError) {
				console.warn(`Failed to parse certificate index ${i}:`, certError);
			}
		}

		await oStore.Close();
		return certs;
	} catch (error: any) {
		console.error("Failed to read CryptoPro certificates store:", error);
		throw new Error(
			`Ошибка при чтении хранилища сертификатов: ${error.message || error}`,
		);
	}
}

/**
 * Signs base64 data (PDF file or XML) using a specific certificate thumbprint
 * in detached CAdES-BES format.
 */
export async function signBase64WithCertificate(
	base64Content: string,
	thumbprint: string,
): Promise<string> {
	const hasPlugin = await checkCryptoProPlugin();
	if (!hasPlugin) {
		throw new Error(
			"КриптоПро ЭЦП Browser Plug-in не установлен или не запущен.",
		);
	}

	const cades = window.cadesplugin;

	try {
		// Find certificate by thumbprint
		const oStore = await cades.CreateObjectAsync("CAdESCOM.Store");
		await oStore.Open(
			cades.CADESCOM_CONTAINER_STORE,
			cades.CAPICOM_MY_STORE,
			cades.CAPICOM_STORE_OPEN_READ_ONLY,
		);

		const oCertificates = await oStore.Certificates;
		const foundCerts = await oCertificates.Find(
			cades.CAPICOM_CERTIFICATE_FIND_SHA1_HASH,
			thumbprint,
		);

		const foundCount = await foundCerts.Count;
		if (foundCount === 0) {
			await oStore.Close();
			throw new Error(
				`Сертификат с отпечатком ${thumbprint} не найден в хранилище.`,
			);
		}

		const cert = await foundCerts.Item(1);

		// Prepare signer
		const oSigner = await cades.CreateObjectAsync("CAdESCOM.CPSigner");
		await oSigner.propset_Certificate(cert);
		// Detached signature (separated from content)
		await oSigner.propset_CheckCertificate(true);

		// Prepare signed data structure
		const oSignedData = await cades.CreateObjectAsync(
			"CAdESCOM.CadesSignedData",
		);
		await oSignedData.propset_ContentEncoding(cades.CADESCOM_BASE64_TO_BINARY);
		await oSignedData.propset_Content(base64Content);

		// Generate detached CAdES-BES signature
		const pkcs7Signature = await oSignedData.SignCades(
			oSigner,
			cades.CADESCOM_CADES_BES,
			true, // Detached
		);

		await oStore.Close();
		return pkcs7Signature;
	} catch (error: any) {
		console.error("CryptoPro signing error:", error);
		throw new Error(`Ошибка подписания документа: ${error.message || error}`);
	}
}
