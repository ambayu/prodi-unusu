import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSeo } from '../../hooks/useSeo';
import { useTenant } from '../../hooks/useSite';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { contactApi } from '../../services/contentApi';
import { toApiError, firstFieldError } from '../../services/api';

const SOCIALS = [
  { key: 'instagramUrl', label: 'Instagram' },
  { key: 'facebookUrl', label: 'Facebook' },
  { key: 'youtubeUrl', label: 'YouTube' },
] as const;

/** Halaman publik kontak beserta formulir pesan. */
export const ContactPage: React.FC = () => {
  const { tenant } = useTenant();
  useSeo({ tenant, title: 'Kontak', description: 'Alamat, email, dan formulir pesan program studi.' });

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const contactQuery = useQuery({
    queryKey: ['public', 'contact'],
    queryFn: () => contactApi.public().then((res) => res.data.contact),
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      contactApi.sendMessage({
        name: form.name,
        email: form.email,
        subject: form.subject || undefined,
        message: form.message,
      }),
    onSuccess: () => {
      setSent(true);
      setFormError(null);
      setForm({ name: '', email: '', subject: '', message: '' });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      setFormError(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const contact = contactQuery.data;

  return (
    <>
      <PageHeader
        eyebrow="Informasi"
        title="Hubungi Kami"
        description="Sampaikan pertanyaan seputar akademik, pendaftaran, atau layanan program studi."
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {contactQuery.isLoading ? (
          <LoadingState label="Memuat informasi kontak" rows={2} />
        ) : contactQuery.isError ? (
          <ErrorState
            message={toApiError(contactQuery.error).message}
            onRetry={() => void contactQuery.refetch()}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-sm font-bold text-slate-900">Alamat &amp; Kontak</h2>

                {!contact ? (
                  <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
                    Informasi kontak belum diisi oleh pengelola program studi.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {contact.address ? (
                      <li className="flex items-start gap-3">
                        <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#1e3a8a]" />
                        <span className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                          {contact.address}
                        </span>
                      </li>
                    ) : null}

                    {contact.email ? (
                      <li className="flex items-center gap-3">
                        <EnvelopeIcon className="h-4 w-4 shrink-0 text-[#1e3a8a]" />
                        <a href={`mailto:${contact.email}`} className="text-sm text-slate-700 hover:underline">
                          {contact.email}
                        </a>
                      </li>
                    ) : null}

                    {contact.phone ? (
                      <li className="flex items-center gap-3">
                        <PhoneIcon className="h-4 w-4 shrink-0 text-[#1e3a8a]" />
                        <a href={`tel:${contact.phone}`} className="text-sm text-slate-700 hover:underline">
                          {contact.phone}
                        </a>
                      </li>
                    ) : null}

                    {contact.whatsapp ? (
                      <li className="flex items-center gap-3">
                        <ChatBubbleLeftRightIcon className="h-4 w-4 shrink-0 text-[#1e3a8a]" />
                        <a
                          href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-slate-700 hover:underline"
                        >
                          WhatsApp {contact.whatsapp}
                        </a>
                      </li>
                    ) : null}
                  </ul>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {SOCIALS.map((social) => {
                    const url = contact?.[social.key];
                    if (!url) return null;
                    return (
                      <a
                        key={social.key}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        {social.label}
                      </a>
                    );
                  })}
                </div>
              </div>

              {contact?.mapsEmbedUrl ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <iframe
                    src={contact.mapsEmbedUrl}
                    title="Peta lokasi program studi"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="h-64 w-full border-0"
                  />
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-sm font-bold text-slate-900">Kirim Pesan</h2>
              <p className="mt-1 text-xs text-slate-500">
                Pesan Anda akan diterima langsung oleh pengelola program studi.
              </p>

              {sent ? (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold text-emerald-900">Pesan terkirim</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-emerald-800">
                      Terima kasih. Kami akan menindaklanjuti pesan Anda melalui email.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSent(false)}
                      className="mt-2 text-[11px] font-bold text-emerald-800 underline"
                    >
                      Kirim pesan lain
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  className="mt-5 space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    sendMutation.mutate();
                  }}
                >
                  <div>
                    <label htmlFor="contact-name" className="field-label">
                      Nama lengkap <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="contact-name"
                      className="field-input"
                      required
                      minLength={2}
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-email" className="field-label">
                      Email <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      className="field-input"
                      required
                      value={form.email}
                      onChange={(event) => setForm({ ...form, email: event.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-subject" className="field-label">
                      Subjek
                    </label>
                    <input
                      id="contact-subject"
                      className="field-input"
                      value={form.subject}
                      onChange={(event) => setForm({ ...form, subject: event.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-message" className="field-label">
                      Pesan <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      className="field-textarea"
                      required
                      minLength={10}
                      value={form.message}
                      onChange={(event) => setForm({ ...form, message: event.target.value })}
                    />
                  </div>

                  {formError ? (
                    <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
                      {formError}
                    </p>
                  ) : null}

                  <button type="submit" disabled={sendMutation.isPending} className="btn-primary w-full">
                    {sendMutation.isPending ? 'Mengirim...' : 'Kirim Pesan'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
};

export default ContactPage;

