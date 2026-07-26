import React from 'react';

export function guessGender(fullName?: string): "male" | "female" | "unknown" {
  if (!fullName || !fullName.trim()) return "unknown";
  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length >= 3 && parts[2]) {
    const patronymic = parts[2].toLowerCase();
    if (patronymic.endsWith("ич") || patronymic.endsWith("оглы")) return "male";
    if (patronymic.endsWith("на") || patronymic.endsWith("кызы")) return "female";
  }

  const femaleNames = new Set([
    "анна", "мария", "елена", "ольга", "татьяна", "наталья", "ирина", "светлана",
    "юлия", "виктория", "анастасия", "ксения", "дарья", "алина", "полина", "екатерина",
    "оксана", "людмила", "надежда", "вера", "любовь", "евгения", "александра", "софия", "софья"
  ]);

  const maleExceptions = new Set(["илья", "никита", "данила", "савва", "кузьма", "фома", "лука", "лев", "евгений"]);

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (femaleNames.has(lower)) return "female";
    if (maleExceptions.has(lower)) return "male";
  }
  
  if (parts.length >= 2 && parts[1]) {
    const firstName = parts[1].toLowerCase();
    if (femaleNames.has(firstName)) return "female";
    if (maleExceptions.has(firstName)) return "male";
    if (firstName.endsWith("а") || firstName.endsWith("я")) return "female";
  } else if (parts.length === 1 && parts[0]) {
    const singleName = parts[0].toLowerCase();
    if (femaleNames.has(singleName)) return "female";
    if (maleExceptions.has(singleName)) return "male";
    if (singleName.endsWith("а") || singleName.endsWith("я")) return "female";
  }
  
  const lastName = parts[0];
  if (parts.length >= 2 && lastName) {
    const lowerLast = lastName.toLowerCase();
    if (!maleExceptions.has(lowerLast) && (lowerLast.endsWith("а") || lowerLast.endsWith("я"))) {
      return "female";
    }
  }
  
  return "male"; // default
}

export function getInitials(fullName?: string): string {
  if (!fullName || !fullName.trim()) return "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "";
  if (parts.length === 1) return first.substring(0, 2).toUpperCase();
  const second = parts[1];
  if (!second) return first.substring(0, 2).toUpperCase();
  const char1 = first.charAt(0);
  const char2 = second.charAt(0);
  return (char1 + char2).toUpperCase();
}

export interface PatientAvatarProps {
  fullName?: string;
  size?: number;
  mode?: 'silhouette' | 'initials' | 'auto';
  border?: boolean;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export function PatientAvatar({
  fullName,
  size = 44,
  mode = 'silhouette',
  border = true,
  className = '',
  style,
  title,
}: PatientAvatarProps) {
  const gender = guessGender(fullName || "");
  const isUnknown = gender === "unknown";
  const initials = getInitials(fullName);

  const showInitials = mode === 'initials' || (mode === 'auto' && Boolean(initials));
  
  const femaleSilhouette = (
    <svg viewBox="0 0 100 100" width="100%" height="100%" fill="currentColor">
      <path d="M50 55c11.046 0 20-8.954 20-20S61.046 15 50 15s-20 8.954-20 20 8.954 20 20 20zm-8 4c-14.359 0-26 11.641-26 26v4h68v-4c0-14.359-11.641-26-26-26H42z" opacity="0.9"/>
      <path d="M50 10c-15 0-25 10-25 25 0 5 2 10 5 14 0-10 10-15 20-15s20 5 20 15c3-4 5-9 5-14 0-15-10-25-25-25z" fill="currentColor"/>
    </svg>
  );

  const maleSilhouette = (
    <svg viewBox="0 0 100 100" width="100%" height="100%" fill="currentColor">
      <path d="M50 55c11.046 0 20-8.954 20-20S61.046 15 50 15s-20 8.954-20 20 8.954 20 20 20zm-8 4c-14.359 0-26 11.641-26 26v4h68v-4c0-14.359-11.641-26-26-26H42z"/>
    </svg>
  );

  const neutralSilhouette = (
    <svg viewBox="0 0 100 100" width="100%" height="100%" fill="currentColor">
      <path d="M50 50c9.94 0 18-8.06 18-18s-8.06-18-18-18-18 8.06-18 18 18zm0 8c-12.01 0-36 6.03-36 18v6h72v-6c0-11.97-23.99-18-36-18z" opacity="0.65"/>
    </svg>
  );

  const fontSize = Math.max(11, Math.round(size * 0.38));

  return (
    <div 
      className={`patient-avatar ${className}`.trim()}
      style={{ 
        width: size, 
        height: size, 
        flexShrink: 0, 
        borderRadius: "12px", 
        background: isUnknown ? "var(--line, rgba(140, 140, 160, 0.15))" : "var(--teal-soft)", 
        color: isUnknown ? "var(--ink-muted, #888)" : "var(--teal-dark)", 
        border: border ? "1px solid var(--glass-border, var(--line))" : "none",
        boxShadow: "var(--shadow-1)",
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        overflow: "hidden",
        fontWeight: 700,
        fontSize: `${fontSize}px`,
        lineHeight: 1,
        userSelect: "none",
        ...style
      }}
      title={title || fullName || "Пациент не выбран"}
    >
      {showInitials && initials ? (
        <span>{initials}</span>
      ) : (
        <div style={{ width: "70%", height: "70%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          {isUnknown ? neutralSilhouette : (gender === "female" ? femaleSilhouette : maleSilhouette)}
        </div>
      )}
    </div>
  );
}
