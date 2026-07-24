import { X } from "lucide-react";
import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CheckoutDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
}

export function CheckoutDrawer({ isOpen, onClose, children }: CheckoutDrawerProps) {
	// Close on Escape key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
						style={{ zIndex: 1000 }}
						onClick={onClose}
						aria-hidden="true"
					/>

					{/* Drawer */}
					<motion.aside
						initial={{ x: "100%" }}
						animate={{ x: 0 }}
						exit={{ x: "100%" }}
						transition={{ type: "spring", damping: 25, stiffness: 200 }}
						className="fixed top-0 right-0 h-full w-[500px] max-w-[100vw] bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col z-50"
						style={{ zIndex: 1001 }}
						role="dialog"
						aria-modal="true"
						aria-label="Панель кассира"
					>
						{/* Header */}
						<header className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
							<h2 className="text-xl font-semibold text-slate-900 dark:text-zinc-100 m-0">
								Касса
							</h2>
							<button
								onClick={onClose}
								className="p-2 -mr-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-900 transition-colors"
								aria-label="Закрыть панель"
							>
								<X size={20} />
							</button>
						</header>

						{/* Content */}
						<div className="flex-1 overflow-y-auto p-6 space-y-6">
							{children}
						</div>
					</motion.aside>
				</>
			)}
		</AnimatePresence>
	);
}
