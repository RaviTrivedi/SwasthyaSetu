"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import styles from "./AppointmentReviewModal.module.css";

export default function AppointmentReviewModal({ open, onClose, children, requestedHref }: {
  open: boolean; onClose: () => void; children: ReactNode; requestedHref: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      previousFocus?.focus();
    };
  }, [open]);

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="review-modal-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className={styles.heading}>
      <h2 id="review-modal-title">Review appointment request</h2>
      <button type="button" onClick={onClose} aria-label="Close review">Close</button>
    </div>
    {open && children}
    <div className={styles.actions}>
      <button type="button" onClick={onClose}>Edit patient details</button>
      <Link href={requestedHref} className={styles.send}>Send appointment request (demo)</Link>
    </div>
  </dialog>;
}
