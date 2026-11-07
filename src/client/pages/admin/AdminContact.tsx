import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { InboxIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
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

/** Pengaturan informasi kontak dan kotak masuk pesan pengunjung. */
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

  const messagesQuery = useQuery({
    queryKey: ['admin', 'messages'],
    queryFn: () => contactApi.messages().then((res) => res.data.messages),
    enabled: has('contact_messages.view'),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => contactApi.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'messages'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  return (
    <AdminLayout
      title="Kontak & Pesan"
      description="Informasi kontak tampil di halaman Kontak. Pesan pengunjung masuk ke kotak masuk di bawah."
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

      {has('contact_messages.view') ? (
        <section className="card">
          <div className="flex items-center gap-2">
            <InboxIcon className="h-5 w-5 text-[#1e3a8a]" />
            <h2 className="text-sm font-bold text-slate-900">Pesan Masuk</h2>
          </div>

          {messagesQuery.isLoading ? (
            <div className="mt-4">
              <LoadingState label="Memuat pesan" rows={2} />
            </div>
          ) : (messagesQuery.data ?? []).length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="Belum ada pesan"
                description="Pesan yang dikirim pengunjung melalui formulir kontak akan tampil di sini."
              />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {(messagesQuery.data ?? []).map((message) => (
                <li key={message.id} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900">
                        {message.subject ?? 'Tanpa subjek'}
                        {!message.isRead ? (
                          <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-[#1e3a8a]">
                            Baru
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {message.name} • {message.email} •{' '}
                        {new Date(message.createdAt).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                    {!message.isRead && has('contact_messages.manage') ? (
                      <button
                        type="button"
                        onClick={() => markReadMutation.mutate(message.id)}
                        className="rounded border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Tandai dibaca
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-slate-600">
                    {message.message}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </AdminLayout>
  );
};

export default AdminContact;
