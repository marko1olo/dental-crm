const fs = require('fs');

const path = 'C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/useInventoryLogic.ts';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('fetchHistory')) {
    code = code.replace(
        /const fetchRules = async \(/g,
        `const [itemHistory, setItemHistory] = useState<any[]>([]);
	const [isLoadingHistory, setIsLoadingHistory] = useState(false);

	const fetchHistory = async (itemId: string) => {
		try {
			setIsLoadingHistory(true);
			const res = await fetch(\`/api/inventory/\${organizationId}/\${itemId}/history\`, {
				headers: auth.denteClinicalReadHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				setItemHistory(Array.isArray(data) ? data : []);
			} else {
				showToast("Ошибка загрузки истории", "error");
			}
		} catch (e) {
			console.error(e);
		} finally {
			setIsLoadingHistory(false);
		}
	};

	const fetchRules = async (`
    );

    code = code.replace(
        /return \{/g,
        `return {
		itemHistory,
		isLoadingHistory,
		fetchHistory,
		setItemHistory,`
    );

    fs.writeFileSync(path, code);
    console.log("Added fetchHistory to useInventoryLogic.ts");
}
