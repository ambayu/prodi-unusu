import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../../components/AdminLayout';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { Field } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { contactApi, type ContactInfo } from '../../services/contentApi';
import { toApiError, firstFieldError } from '../../services/api';

const EMPTY: ContactInfo = {
  address: '',
  email: '',
  phone: '',
  whatsapp: '',
  mapsEmbedUrl: '',
  instagramUrl: '',
  facebookUrl: '',
  youtubeUrl: '',
};

/** Pengaturan informasi kontak yang tampil pada halaman Kontak publik. */
export const AdminContact: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();

  const [draft, setDraft] = useState<ContactInfo>(EMPTY);

  const contactQuery = useQuery({
    queryKey: ['admin', 'contact'],
    queryFn: () => contactApi.get().then((res) => res.data.contact),
  });

  useEffect(() => {
    if (contactQuery.data) {
      setDraft({ ...EMPTY, ...contactQuery.data });
    }
  }, [contactQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      contactApi.update({
        ...draft,
        email: draft.email || null,
        address: draft.address || null,
        phone: draft.phone || null,
        whatsapp: draft.whatsapp || null,
        mapsEmbedUrl: draft.mapsEmbedUrl || null,
        instagramUrl: draft.instagramUrl || null,
        facebookUrl: draft.facebookUrl || null,
        youtubeUrl: draft.youtubeUrl || null,
      }),
    onSuccess: () => {
      toast.success('Informasi kontak berhasil disimpan.');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'contact'] });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  return (
    <AdminLayout
      title="Informasi Kontak"
      description="Alamat, telepon, dan tautan media sosial yang tampil pada halaman Kontak website publik."
    >
      {contactQuery.isLoading ? (
        <LoadingState label="Memuat informasi kontak" rows={2} />
      ) : contactQuery.isError ? (
        <ErrorState message={toApiError(contactQuery.error).message} onRetry={() => void contactQuery.refetch()} />
      ) : (
        <div className="card space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Informasi Kontak Publik</h2>

          <Field label="Alamat" htmlFor="contact-address">
            <textarea
              id="contact-address"
              className="field-textarea"
              value={draft.address ?? ''}
              onChange={(event) => setDraft({ ...draft, address: event.target.value })}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Email" htmlFor="contact-email">
              <input
                id="contact-email"
                type="email"
                className="field-input"
                value={draft.email ?? ''}
                onChange={(event) => setDraft({ ...draft, email: event.target.value })}
              />
            </Field>
            <Field label="Telepon" htmlFor="contact-phone">
              <input
                id="contact-phone"
                className="field-input"
                value={draft.phone ?? ''}
                onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
              />
            </Field>
            <Field label="WhatsApp" htmlFor="contact-whatsapp">
              <input
                id="contact-whatsapp"
                className="field-input"
                value={draft.whatsapp ?? ''}
                onChange={(event) => setDraft({ ...draft, whatsapp: event.target.value })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Instagram" htmlFor="contact-instagram">
              <input
                id="contact-instagram"
                className="field-input"
                value={draft.instagramUrl ?? ''}
                onChange={(event) => setDraft({ ...draft, instagramUrl: event.target.value })}
              />
            </Field>
            <Field label="Facebook" htmlFor="contact-facebook">
              <input
                id="contact-facebook"
                className="field-input"
                value={draft.facebookUrl ?? ''}
                onChange={(event) => setDraft({ ...draft, facebookUrl: event.target.value })}
              />
            </Field>
            <Field label="YouTube" htmlFor="contact-youtube">
              <input
                id="contact-youtube"
                className="field-input"
                value={draft.youtubeUrl ?? ''}
                onChange={(event) => setDraft({ ...draft, youtubeUrl: event.target.value })}
              />
            </Field>
          </div>

          <Field label="URL sematan peta" htmlFor="contact-maps" hint="Alamat iframe Google Maps, diawali https://">
            <input
              id="contact-maps"
              className="field-input"
              value={draft.mapsEmbedUrl ?? ''}
              onChange={(event) => setDraft({ ...draft, mapsEmbedUrl: event.target.value })}
            />
          </Field>

          {has('contacts.update') ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="btn-primary"
              >
                {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Kontak'}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/*
        Kotak masuk pesan kini punya halaman sendiri (`/admin/pesan`) agar menu
        "Pesan Masuk" membuka daftar pesan, bukan formulir kontak.
      */}
    </AdminLayout>
  );
};

export default AdminContact;
