import React, { useEffect, useRef } from 'react';
import { useNotifier } from './Notifier';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  /** Aksi sedang berjalan; modal menampilkan keadaan tunggu. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Jembatan untuk pemanggil lama yang mengatur sendiri state target konfirmasi.
 *
 * Dialognya kini dirender oleh `NotifierProvider` supaya seluruh aplikasi
 * memakai satu modal yang sama. Pemanggil baru sebaiknya memakai
 * `useNotifier().confirmAction()` langsung.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  tone = 'danger',
  onConfirm,
  onCancel,
}) => {
  const notifier = useNotifier();
  const jalanRef = useRef(onConfirm);
  jalanRef.current = onConfirm;
  const batalRef = useRef(onCancel);
  batalRef.current = onCancel;
  const sudahTampilRef = useRef(false);

  useEffect(() => {
    if (!open) {
      sudahTampilRef.current = false;
      return;
    }
    if (sudahTampilRef.current) return;
    sudahTampilRef.current = true;

    void notifier
      .confirmAction(description, { title, confirmLabel, cancelLabel, tone }, () => jalanRef.current())
      .then((setuju) => {
        /* Batal: pemanggil wajib mereset targetnya agar dialog tidak muncul lagi. */
        if (!setuju) batalRef.current();
      });
  }, [open]);

  return null;
};

export default ConfirmDialog;
