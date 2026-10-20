"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./Modal.module.css";

export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return <dialog ref={ref} className={styles.modal} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header className={styles.heading}><h3 id={titleId}>{title}</h3><button type="button" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}>Close</button></header>
    {children}
  </dialog>;
}
