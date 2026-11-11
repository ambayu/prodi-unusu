import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { Field } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { profileApi } from '../../services/contentApi';
import { toApiError, firstFieldError } from '../../services/api';

/**
 * Pengelolaan visi, misi, tujuan, dan sasaran strategis program studi.
 *
 * Sumber data resmi adalah tabel `visions_missions`. Halaman ini sengaja
 * dipisahkan dari Profil agar kedua konten tidak lagi berbagi satu formulir
 * panjang, dan agar label menu "Visi & Misi" sesuai dengan isi halaman.
 */
export const AdminVisionMission: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();

  const [vision, setVision] = useState('');
  const [missions, setMissions] = useState<string[]>(['']);
  const [objectives, setObjectives] = useState('');
  const [strategicGoals, setStrategicGoals] = useState('');

  const dataQuery = useQuery({
    queryKey: ['admin', 'profile'],
    queryFn: () => profileApi.get().then((res) => res.data),
  });

  /**
   * Isi formulir dari database.
   *
   * Kolom `missions` disimpan sebagai teks satu misi per baris, sehingga perlu
   * dipecah menjadi butir agar dapat disunting satu per satu.
   */
  useEffect(() => {
    const stored = dataQuery.data?.visionMission as Record<string, unknown> | null;
    if (!stored) return;

    setVision((stored.vision as string) ?? '');
    setObjectives((stored.objectives as string) ?? '');
    setStrategicGoals((stored.strategicGoals as string) ?? '');

    const rawMissions = (stored.missions as string) ?? '';
    const parsed = rawMissions
      .split('\n')
      .map((line) => line.replace(/^[-•*\d.)\s]+/, '').trim())
      .filter(Boolean);

    setMissions(parsed.length > 0 ? parsed : ['']);
  }, [dataQuery.data]);

  const missionCount = useMemo(() => missions.filter((item) => item.trim() !== '').length, [missions]);

  const updateMission = (index: number, value: string) => {
    setMissions((current) => current.map((item, i) => (i === index ? value : item)));
  };

  const addMission = () => setMissions((current) => [...current, '']);

  const removeMission = (index: number) => {
    setMissions((current) => {
      const next = current.filter((_, i) => i !== index);
      return next.length > 0 ? next : [''];
    });
  };

  const saveVision = useMutation({
    mutationFn: () =>
      profileApi.updateVisionMission({
        vision,
        missions: missions
          .map((item) => item.trim())
          .filter(Boolean)
          .join('\n'),
        objectives,
        strategicGoals,
      }),
    onSuccess: () => {
      toast.success('Visi dan misi berhasil disimpan.');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'profile'] });
      void queryClient.invalidateQueries({ queryKey: ['public', 'profile'] });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  return (
    <AdminLayout
      title="Visi & Misi Program Studi"
      description="Rumusan visi, misi, tujuan, dan sasaran strategis yang tampil pada halaman Visi & Misi website publik."
    >
      {dataQuery.isLoading ? (
        <LoadingState label="Memuat visi dan misi" rows={3} />
      ) : dataQuery.isError ? (
        <ErrorState message={toApiError(dataQuery.error).message} onRetry={() => void dataQuery.refetch()} />
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900">
            <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <p className="leading-relaxed">
              Data pada halaman ini menjadi acuan resmi visi dan misi program studi. Bagian
              &ldquo;Komitmen Akademik&rdquo; pada beranda dikelola terpisah melalui{' '}
              <a href="/admin/builder" className="font-bold underline hover:text-blue-950">
                Page Builder &rsaquo; Beranda
              </a>
              .
            </p>
          </div>

          <section className="card space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Visi Program Studi</h2>
            <Field label="Rumusan visi" htmlFor="vision-text" hint="Satu paragraf utuh, tanpa penomoran.">
              <textarea
                id="vision-text"
                className="field-textarea min-h-[120px]"
                value={vision}
                onChange={(event) => setVision(event.target.value)}
              />
            </Field>
          </section>

          <section className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Misi Program Studi</h2>
                <p className="text-[11px] text-slate-500">{missionCount} butir misi terisi.</p>
              </div>
              <button type="button" onClick={addMission} className="btn-secondary">
                <PlusIcon className="h-3.5 w-3.5" />
                Tambah Misi
              </button>
            </div>

            <div className="space-y-2">
              {missions.map((mission, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[11px] font-bold text-emerald-900">
                    {index + 1}
                  </span>
                  <textarea
                    rows={2}
                    aria-label={`Butir misi ke-${index + 1}`}
                    className="field-textarea flex-1 text-xs"
                    placeholder={`Tuliskan butir misi ke-${index + 1}...`}
                    value={mission}
                    onChange={(event) => updateMission(index, event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeMission(index)}
                    className="mt-2 rounded p-1 text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-800"
                    aria-label={`Hapus butir misi ke-${index + 1}`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="card space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Tujuan &amp; Sasaran Strategis</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tujuan" htmlFor="vision-objectives">
                <textarea
                  id="vision-objectives"
                  className="field-textarea"
                  value={objectives}
                  onChange={(event) => setObjectives(event.target.value)}
                />
              </Field>
              <Field label="Sasaran strategis" htmlFor="vision-goals">
                <textarea
                  id="vision-goals"
                  className="field-textarea"
                  value={strategicGoals}
                  onChange={(event) => setStrategicGoals(event.target.value)}
                />
              </Field>
            </div>
          </section>

          {has('vision_mission.update') ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => saveVision.mutate()}
                disabled={saveVision.isPending}
                className="btn-primary"
              >
                {saveVision.isPending ? 'Menyimpan...' : 'Simpan Visi & Misi'}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminVisionMission;
