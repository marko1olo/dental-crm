import React from "react";
import { Check } from "lucide-react";

export const PendingOnlineBookingsEmptyState: React.FC = () => (
  <div className="text-center py-12 px-4">
    <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
      <Check size={28} />
    </div>
    <h3 className="font-bold text-base text-[var(--ink)] mb-1">
      Все онлайн-заявки подтверждены
    </h3>
    <p className="text-sm text-[var(--muted)] max-w-sm mx-auto">
      Ожидающих подтверждения записей нет. Новые заявки с сайта появятся здесь автоматически.
    </p>
  </div>
);
