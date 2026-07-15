import React, { useState, useEffect } from "react";
import { Users, Wallet, ArrowRight, Activity, ShieldCheck } from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import { useCountUp } from "../../hooks/useCountUp";
import { useWebsocket } from "../../hooks/useWebsocket";

interface FamilyMember {
  id: string;
  fullName: string;
  phone: string;
}

interface FamilyGroup {
  id: string;
  name: string;
  balance: string;
  members: FamilyMember[];
}

interface FamilyWalletPanelProps {
  patientId: string;
  remainingDebtRub: number;
  onPaymentSuccess?: () => void;
}

export const FamilyWalletPanel: React.FC<FamilyWalletPanelProps> = ({ patientId, remainingDebtRub, onPaymentSuccess }) => {
  const [family, setFamily] = useState<FamilyGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [amount, setAmount] = useState<number>(remainingDebtRub || 0);

  const fetchFamily = async () => {
    try {
      const res = await fetch(`/api/finance/family/patient/${patientId}`, {
        headers: denteAdminSecretRequestHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setFamily(data);
      } else {
        setFamily(null);
      }
    } catch (e) {
      console.error(e);
      setFamily(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) fetchFamily();
  }, [patientId]);

  // Sync balance with WS
  const { lastMessage } = useWebsocket("ws://localhost:4100/ws");
  useEffect(() => {
    if (lastMessage?.type === "FAMILY_BALANCE_UPDATED" && family) {
      if (lastMessage.payload.familyGroupId === family.id) {
        setFamily(prev => prev ? { ...prev, balance: lastMessage.payload.balance } : null);
      }
    }
  }, [lastMessage, family?.id]);

  const balanceVal = Number(family?.balance || 0);
  const animatedBalance = useCountUp(balanceVal, 1000);

  const handlePay = async () => {
    if (!family) return;
    if (amount <= 0) {
      showToast("Введите сумму", "error");
      return;
    }
    if (amount > balanceVal) {
      showToast("Недостаточно средств на семейном балансе", "error");
      return;
    }

    setIsPaying(true);
    try {
      const res = await fetch("/api/finance/family/pay", {
        method: "POST",
        headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          patientId,
          familyGroupId: family.id,
          amountRub: amount
        })
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.message || "Ошибка оплаты", "error");
      } else {
        showToast("Оплата списана с семейного кошелька", "success");
        if (onPaymentSuccess) onPaymentSuccess();
        // UI updates via WS, but we can refetch just in case
        fetchFamily();
      }
    } catch (e) {
      showToast("Сетевая ошибка", "error");
    } finally {
      setIsPaying(false);
    }
  };

  if (isLoading) return <div className="text-zinc-500 text-sm p-4"><Activity className="w-4 h-4 animate-spin inline mr-2"/>Загрузка семейного кошелька...</div>;
  if (!family) return null; // Not in a family group

  return (
    <div className="dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-zinc-200 rounded-xl p-5 shadow-lg relative overflow-hidden group mt-4">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
        <Users className="w-24 h-24 text-blue-500" />
      </div>

      <div className="flex justify-between items-start relative z-10">
        <div>
          <h3 className="text-lg font-bold dark:text-zinc-100 text-zinc-800 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-500" />
            Семейный Кошелек: {family.name}
          </h3>
          <p className="text-sm dark:text-zinc-400 text-zinc-500 mt-1">Единый счет для семьи ({family.members.length} чел.)</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono font-black text-emerald-400 tracking-tight drop-shadow-md">
            {animatedBalance.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mt-0.5 flex items-center justify-end gap-1">
            <ShieldCheck className="w-3 h-3"/>
            ДОСТУПНЫЙ БАЛАНС
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 space-y-2">
          <label className="text-xs uppercase tracking-wider dark:text-zinc-400 text-zinc-500 font-semibold">Сумма списания (₽)</label>
          <input
            type="number"
            className="w-full dark:bg-zinc-900 bg-zinc-50 border dark:border-zinc-500 border-zinc-300 rounded-lg p-3 dark:text-white text-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
            value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="0.00"
            disabled={isPaying}
            max={balanceVal}
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={handlePay}
            disabled={isPaying || balanceVal < amount || amount <= 0}
            className="h-[46px] px-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium shadow-lg transition-colors flex items-center gap-2"
          >
            {isPaying ? "Списание..." : "Списать с баланса"} <ArrowRight className="w-4 h-4"/>
          </button>
        </div>
      </div>
    </div>
  );
};
