import { create } from 'zustand';

interface SplitPayment {
  method: 'cash' | 'card' | 'dms' | 'installment_balance';
  amount: number;
}

interface BillingState {
  currentInvoiceId: string | null;
  splitPayments: SplitPayment[];
  receiptBuffer: any | null;
  addSplitPayment: (payment: SplitPayment) => void;
  removeSplitPayment: (index: number) => void;
  setReceiptBuffer: (receipt: any) => void;
  setCurrentInvoiceId: (id: string | null) => void;
  purgeState: () => void;
}

export const useBillingStore = create<BillingState>((set) => ({
  currentInvoiceId: null,
  splitPayments: [],
  receiptBuffer: null,
  addSplitPayment: (payment) => set((state) => ({ splitPayments: [...state.splitPayments, payment] })),
  removeSplitPayment: (index) => set((state) => ({ splitPayments: state.splitPayments.filter((_, i) => i !== index) })),
  setReceiptBuffer: (receipt) => set({ receiptBuffer: receipt }),
  setCurrentInvoiceId: (id) => set({ currentInvoiceId: id }),
  purgeState: () => set({ currentInvoiceId: null, splitPayments: [], receiptBuffer: null })
}));
