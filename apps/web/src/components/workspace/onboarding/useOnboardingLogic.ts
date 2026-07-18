import { useEffect, useState } from "react";

export type ThemeColor = "teal" | "blue" | "purple" | "rose";

export interface StaffEntry {
  id: string;
  fullName: string;
  role: string;
  phone?: string;
  specialization: string;
  percentage: number;
  canSignMedicalRecords: boolean;
  canManageMoney: boolean;
  canManageImports: boolean;
}

const LS_KEY = "dente-onboarding-draft-v2";

export function useOnboardingLogic(
  onComplete: () => void,
  initialIsDark: boolean = true,
) {
  const [activeDark, setActiveDark] = useState(() => {
    const stored = localStorage.getItem("dente_theme_mode");
    if (stored === "dark") return true;
    if (stored === "light") return false;
    return initialIsDark;
  });
  useEffect(() => {
    const checkDark = () => {
      const stored = localStorage.getItem("dente_theme_mode");
      if (stored === "dark") {
        setActiveDark(true);
        return;
      }
      if (stored === "light") {
        setActiveDark(false);
        return;
      }
      setActiveDark(
        document.documentElement.classList.contains("dark") ||
          document.documentElement.getAttribute("data-theme") === "dark" ||
          document.body.classList.contains("theme-dark") ||
          document.body.classList.contains("dark") ||
          document.body.getAttribute("data-theme") === "dark",
      );
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => observer.disconnect();
  }, [initialIsDark]);

  const isDark = activeDark;

  const [savedData, setSavedData] = useState<any>(() => {
    try {
      const draft = localStorage.getItem(LS_KEY);
      if (draft) return JSON.parse(draft);
    } catch (e) {}
    return null;
  });

  const [step, setStep] = useState(savedData?.step || 0);
  const [launching, setLaunching] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // Step 0: Practice Type
  const [practiceType, setPracticeType] = useState<"solo" | "solo_with_team" | "small_clinic">(
    savedData?.practiceType || "solo"
  );

  // Step 1: Doctor/Owner Info
  const [doctorName, setDoctorName] = useState(savedData?.doctorName || "Иванов И.И.");
  const [specs, setSpecs] = useState<string[]>(savedData?.specs || ["therapy"]);
  const [canSign, setCanSign] = useState<boolean>(savedData?.canSign ?? true);
  
  const toggleSpec = (id: string) =>
    setSpecs((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // Step 2: Team (skipped if solo)
  const [staff, setStaff] = useState<StaffEntry[]>(
    savedData?.staff || []
  );

  // Step 3: Workplace
  const [chairs, setChairs] = useState(savedData?.chairs || 1);
  const [workHours, setWorkHours] = useState<[number, number]>(
    savedData?.workHours || [9, 20],
  );
  const [defaultDuration, setDefaultDuration] = useState(savedData?.defaultDuration || 30);

  // Step 4: Services & Money
  const [services, setServices] = useState(
    savedData?.services || { installments: true, insurance: false }
  );
  const [legal, setLegal] = useState(
    savedData?.legal || { inn: "", ogrn: "", address: "" }
  );
  const toggleService = (k: keyof typeof services) =>
    setServices((p: any) => ({ ...p, [k]: !p[k] }));

  // Step 5: Equipment & Tools
  const [equipment, setEquipment] = useState(
    savedData?.equipment || {
      xray: false,
      lab: false,
      microscope: false,
      inventory: false,
      cso: false
    }
  );
  const toggleEquipment = (k: keyof typeof equipment) =>
    setEquipment((p: any) => ({ ...p, [k]: !p[k] }));

  // Step 6: Growth & CRM (hidden by default for solo)
  const [growth, setGrowth] = useState(
    savedData?.growth || {
      crm: false,
      analytics: false,
      omnichannel: false
    }
  );
  const toggleGrowth = (k: keyof typeof growth) =>
    setGrowth((p: any) => ({ ...p, [k]: !p[k] }));

  // Step 7: Branding & Migration
  const [theme, setTheme] = useState<ThemeColor>(savedData?.theme || "teal");
  const [migrationStatus, setMigrationStatus] = useState<"idle" | "analyzing" | "done">(
    savedData?.migrationStatus || "idle"
  );
  const [logoUploaded, setLogoUploaded] = useState(
    savedData?.logoUploaded || false,
  );

  // Helper to change practice type and auto-configure defaults
  const handleSelectPracticeType = (p: "solo" | "solo_with_team" | "small_clinic") => {
    setPracticeType(p);
    if (p === "solo") {
      setChairs(1);
      setStaff([]);
      setEquipment(prev => ({ ...prev, inventory: false }));
      setGrowth({ crm: false, analytics: false, omnichannel: false });
    } else if (p === "solo_with_team") {
      setChairs(1);
      if (staff.length === 0) {
        setStaff([
          {
            id: "2",
            fullName: "Ассистент А.А.",
            role: "Медсестра",
            phone: "+7 (999) 000-00-01",
            specialization: "Ассистент",
            percentage: 0,
            canSignMedicalRecords: false,
            canManageMoney: false,
            canManageImports: false,
          }
        ]);
      }
    } else if (p === "small_clinic") {
      setChairs(3);
      if (staff.length === 0) {
        setStaff([
          {
            id: "2",
            fullName: "Смирнова С.С.",
            role: "Администратор",
            phone: "+7 (999) 000-00-02",
            specialization: "Ресепшн",
            percentage: 0,
            canSignMedicalRecords: false,
            canManageMoney: true,
            canManageImports: false,
          }
        ]);
      }
      setEquipment(prev => ({ ...prev, inventory: true }));
      setGrowth(prev => ({ ...prev, analytics: true }));
    }
  };

  // Smart defaults when specializations change
  useEffect(() => {
    setEquipment(prev => ({
      ...prev,
      xray: specs.includes("surgery") || specs.includes("orthodontics") || prev.xray,
      lab: specs.includes("orthopedics") || specs.includes("orthodontics") || prev.lab,
      microscope: specs.includes("therapy") || prev.microscope,
    }));
  }, [specs]);

  useEffect(() => {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        step,
        practiceType,
        doctorName,
        specs,
        canSign,
        staff,
        chairs,
        workHours,
        defaultDuration,
        services,
        legal,
        equipment,
        growth,
        theme,
        migrationStatus,
        logoUploaded
      }),
    );
  }, [
    step, practiceType, doctorName, specs, canSign, staff, chairs, workHours, 
    defaultDuration, services, legal, equipment, growth, theme, migrationStatus, logoUploaded
  ]);

  const handleLaunch = async () => {
    localStorage.removeItem(LS_KEY);
    setLaunching(true);
    try {
      const payload = {
        practiceType,
        doctorName,
        specs,
        canSign,
        staff,
        chairs,
        workHours,
        defaultDuration,
        services,
        legal,
        equipment,
        growth,
        theme,
      };
      await fetch("/api/workspace/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error(e);
    }
    setFadeOut(true);
    setTimeout(() => onComplete(), 500);
  };

  return {
    isDark,
    step,
    setStep,
    launching,
    fadeOut,
    
    practiceType,
    handleSelectPracticeType,
    
    doctorName, setDoctorName,
    specs, setSpecs, toggleSpec,
    canSign, setCanSign,

    staff, setStaff,

    chairs, setChairs,
    workHours, setWorkHours,
    defaultDuration, setDefaultDuration,

    services, toggleService,
    legal, setLegal,

    equipment, toggleEquipment,
    growth, toggleGrowth,

    theme, setTheme,
    migrationStatus, setMigrationStatus,
    logoUploaded, setLogoUploaded,

    handleLaunch,
  };
}
