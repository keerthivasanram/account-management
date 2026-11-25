import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Open/close state for drawers and menus with the keyboard behaviour they need:
 * Escape closes, focus moves into the panel on open and back to the trigger on close.
 *
 *   const nav = useDisclosure();
 *   <button ref={nav.triggerRef} aria-expanded={nav.open} aria-controls="id" onClick={nav.toggle} />
 *   {nav.open && <div id="id" ref={nav.panelRef}>…</div>}
 */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const useDisclosure = () => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const wasOpen = useRef(false);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      // Move focus into the panel so keyboard users land on its first control
      const first = panelRef.current?.querySelector(FOCUSABLE);
      first?.focus();
      const onKey = (e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          setOpen(false);
          return;
        }
        // Modal panels (aria-modal="true", e.g. the navigation drawer) keep Tab inside them
        const panel = panelRef.current;
        if (e.key !== 'Tab' || !panel || panel.getAttribute('aria-modal') !== 'true') return;
        const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === firstEl || !panel.contains(document.activeElement))) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && (document.activeElement === lastEl || !panel.contains(document.activeElement))) {
          e.preventDefault();
          firstEl.focus();
        }
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus();
    }
    return undefined;
  }, [open]);

  return { open, setOpen, close, toggle, triggerRef, panelRef };
};

export default useDisclosure;
