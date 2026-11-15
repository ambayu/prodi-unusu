import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { FormPageTemplate, type FormSection } from '../../components/ui/FormPageTemplate';
import { Field } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { curriculumApi, type Curriculum } from '../../services/contentApi';
import { firstFieldError, toApiError } from '../../services/api';

interface Draft {
  name: string;
  year: string;
  description: string;
  isActive: boolean;
}

const emptyDraft = (): Draft => ({
  name: '',
  year: String(new Date().getFullYear()),
  description: '',
  isActive: true,
});

export const AdminCurriculumCreate: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [formError, setFormError] = useState<string | null>(null);

  const curriculumsQuery = useQuery({
    queryKey: ['admin', 'curriculums'],
    queryFn: async () => {
      const res = await curriculumApi.list();
      return res.data.curriculums;
    },
  });

  useEffect(() => {
    if (!isEdit || !curriculumsQuery.data) return;
    const cur = curriculumsQuery.data.find((c) => String(c.id) === id);
    if (cur) {
      setDraft({
        name: cur.name,
        year: String(cur.year),
        description: cur.description ?? '',
        isActive: cur.isActive,
      });
    }
  }, [isEdit, id, curriculumsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: draft.name.trim(),
        year: Number(draft.year),
        description: draft.description.trim() || null,
        isActive: draft.isActive,
      };

      if (isEdit && id) {
        return await curriculumApi.updateCurriculum(Number(id), payload);
      }
      return await curriculumApi.createCurriculum(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Kurikulum berhasil diperbarui.' : 'Kurikulum berhasil dibuat.');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'curriculums'] });
      navigate('/admin/kurikulum');
    },
    onError: (err) => {
      const apiErr = toApiError(err);
      setFormError(firstFieldError(apiErr) ?? apiErr.message ?? 'Gagal menyimpan kurikulum.');
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!draft.name.trim()) {
      setFormError('Nama kurikulum wajib diisi.');
      return;
    }
    const yearNum = Number(draft.year);
    if (!yearNum || yearNum < 1990 || yearNum > 2100) {
      setFormError('Tahun kurikulum harus berupa angka antara 1990 dan 2100.');
      return;
    }

    saveMutation.mutate();
  };

  const pageTitle = isEdit ? 'Ubah Kurikulum' : 'Tambah Kurikulum';
  const pageDescription = isEdit
    ? 'Perbarui nama, tahun pemberlakuan, deskripsi, atau status kurikulum.'
    : 'Buat kurikulum baru untuk program studi aktif.';

  const sections: FormSection[] = [
    {
      id: 'section-identitas',
      title: 'Identitas Kurikulum',
      description: 'Nama dan tahun rujukan kurikulum akademik.',
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nama Kurikulum" htmlFor="curriculum-name" required>
            <input
              id="curriculum-name"
              type="text"
              className="field-input"
              placeholder="Contoh: Kurikulum 2024 Teknik Informatika"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Tahun Pemberlakuan" htmlFor="curriculum-year" required>
            <input
              id="curriculum-year"
              type="number"
              min={1990}
              max={2100}
              className="field-input"
              placeholder="2024"
              value={draft.year}
              onChange={(e) => setDraft({ ...draft, year: e.target.value })}
              required
            />
          </Field>
        </div>
      ),
    },
    {
      id: 'section-keterangan',
      title: 'Keterangan dan Status',
      description: 'Catatan ringkas tujuan kurikulum serta status keaktifannya.',
      content: (
        <div className="space-y-4">
          <Field label="Keterangan / Deskripsi" htmlFor="curriculum-description">
            <textarea
              id="curriculum-description"
              rows={4}
              className="field-input py-2"
              placeholder="Tuliskan keterangan profil kurikulum, landasan SK, atau kompetensi lulusan..."
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </Field>

          <div>
            <label className="mb-2 block text-xs font-bold text-slate-700">Status Kurikulum</label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={draft.isActive}
                  onChange={() => setDraft({ ...draft, isActive: true })}
                  className="h-4 w-4 text-[#1e3a8a] focus:ring-[#1e3a8a]"
                />
                <span>Aktif</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={!draft.isActive}
                  onChange={() => setDraft({ ...draft, isActive: false })}
                  className="h-4 w-4 text-[#1e3a8a] focus:ring-[#1e3a8a]"
                />
                <span>Nonaktif</span>
              </label>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Kurikulum nonaktif tetap tersimpan di arsip prodi tetapi tidak diprioritaskan di website publik.
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout
      title={pageTitle}
      description={pageDescription}
      actions={
        <Link to="/admin/kurikulum" className="btn-secondary">
          <ArrowLeftIcon className="h-4 w-4" />
          Kembali
        </Link>
      }
    >
      <FormPageTemplate
        mode={isEdit ? 'edit' : 'create'}
        title={pageTitle}
        description={pageDescription}
        showHeader={false}
        busy={saveMutation.isPending}
        error={formError}
        sections={sections}
        cancelTo="/admin/kurikulum"
        onSubmit={handleSubmit}
      />
    </AdminLayout>
  );
};

export default AdminCurriculumCreate;
