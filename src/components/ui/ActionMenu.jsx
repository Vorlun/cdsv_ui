import { AnimatePresence, motion } from "motion/react";

export default function ActionMenu({ open, items, onClose }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-white/10 bg-[#0B1220]/95 p-1.5 shadow-2xl backdrop-blur"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={Boolean(item.disabled)}
              onClick={() => {
                if (item.disabled) return;
                item.onClick?.();
                onClose?.();
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35 ${item.className || "text-[#E5E7EB]"}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
