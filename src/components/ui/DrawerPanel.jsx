import { AnimatePresence, motion } from "motion/react";

export default function DrawerPanel({ open, onClose, title, children, footer }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[430px] flex-col border-l border-white/10 bg-[#0F172A]"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <button type="button" onClick={onClose} className="rounded px-2 py-1 text-xs text-[#9CA3AF] hover:bg-white/10 hover:text-white">
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer ? <div className="border-t border-white/10 px-4 py-3">{footer}</div> : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
