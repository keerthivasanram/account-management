import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Open/close state for drawers and menus with the keyboard behaviour they need:
 * Escape closes, focus moves into the panel on open and back to the trigger on close.
 *
 *   const nav = useDisclosure();
 *   <button ref={nav.triggerRef} aria-expanded={nav.open} aria-controls="id" onClick={nav.toggle} />
 *   {nav.open && <div id="id" ref={nav.panelRef}>…</div>}
 */
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
      const first = panelRef.current?.querySelector('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      first?.focus();
      const onKey = (e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          setOpen(false);
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
