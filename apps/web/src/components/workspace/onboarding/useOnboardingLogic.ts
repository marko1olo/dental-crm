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

const LS_KEY = "dente-onboarding-draft-v1";

export function useOnboardingLogic(
  onComplete: () => void,
  initialIsDark: boolean = true,
) {
  const [activeDark, setActiveDark] = useState(initialIsDark);
  useEffect(() => {
    const checkDark = () => {
      setActiveDark(
        document.documentElement.classList.contains("dark") ||
          document.documentElement.getAttribute("data-theme") === "dark",
      );
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
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

  const [step, setStep] = useState(savedData?.step || 1);
  const [launching, setLaunching] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // Step 1: Specializations
  const [specs, setSpecs] = useState<string[]>(savedData?.specs || ["therapy"]);
  const toggleSpec = (id: string) =>
    setSpecs((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // Step 2: Infrastructure
  const [chairs, setChairs] = useState(savedData?.chairs || 3);
  const [workHours, setWorkHours] = useState<[number, number]>(
    savedData?.workHours || [9, 20],
  ); // [start, end]

  // Step 3: Modules
  const [modules, setModules] = useState(
    savedData?.modules || {
      lab: true,
      dms: false,
      installments: true,
      egisz: false,
      aiTreatmentPlan: true,
      aiRecommendations: true,
      aiDocuments: true,
    },
  );
  const toggleModule = (k: keyof typeof modules) =>
    setModules((p: any) => ({ ...p, [k]: !p[k] }));

  // Step 4: Branding
  const [theme, setTheme] = useState<ThemeColor>(savedData?.theme || "teal");

  // Step 5: Staff
  const [staff, setStaff] = useState<StaffEntry[]>(
    savedData?.staff || [
      {
        id: "1",
        fullName: "Иванов И.И.",
        role: "Врач",
        phone: "+7 (999) 000-00-00",
        specialization: "Терапевт",
        percentage: 25,
        canSignMedicalRecords: true,
        canManageMoney: false,
        canManageImports: false,
      },
    ],
  );

  // Step 6: Legal
  const [legal, setLegal] = useState(
    savedData?.legal || { inn: "", ogrn: "", address: "" },
  );
  const [logoUploaded, setLogoUploaded] = useState(
    savedData?.logoUploaded || false,
  );

  // Step 7: Migration
  const [migrationStatus, setMigrationStatus] = useState<
    "idle" | "analyzing" | "done"
  >(savedData?.migrationStatus || "idle");

  // Save to LocalStorage on change
  useEffect(() => {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        step,
        specs,
        chairs,
        workHours,
        modules,
        theme,
        staff,
        legal,
        logoUploaded,
        migrationStatus,
      }),
    );
  }, [
    step,
    specs,
    chairs,
    workHours,
    modules,
    theme,
    staff,
    legal,
    logoUploaded,
    migrationStatus,
  ]);

  const handleLaunch = async () => {
    localStorage.removeItem(LS_KEY);
    setLaunching(true);
    try {
      const payload = {
        specs,
        chairs,
        workHours,
        modules,
        theme,
        staff,
        legal,
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
    specs,
    setSpecs,
    toggleSpec,
    chairs,
    setChairs,
    workHours,
    setWorkHours,
    modules,
    toggleModule,
    theme,
    setTheme,
    staff,
    setStaff,
    legal,
    setLegal,
    logoUploaded,
    setLogoUploaded,
    migrationStatus,
    setMigrationStatus,
    handleLaunch,
  };
}
