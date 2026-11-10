import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, FormModal } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { settingsApi, type MenuItem } from '../../services/adminApi';
import { toApiError } from '../../services/api';

const DEFAULT_MENU_DRAFT: {
  title: string;
  url: string;
  target: string;
  isActive: boolean;
  parentId: number | null;
} = {
  title: '',
  url: '/',
  target: '_self',
  isActive: true,
  parentId: null,
};

/**
 * Halaman pengelolaan navigasi website publik program studi.
 *
 * Mendukung pengaturan urutan menu (naik/turun), pengubahan judul/URL,
 * pengaktifan/penonaktifan, serta penambahan menu kustom baru.
 */
export const AdminNavigation: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();

  const [formOpen, setFormOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [menuDraft, setMenuDraft] = useState(DEFAULT_MENU_DRAFT);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const menusQuery = useQuery({
    queryKey: ['admin', 'menus'],
    queryFn: () => settingsApi.menus().then((res) => res.data.menus),
  });

  const sortedMenus = [...(menusQuery.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] });
    void queryClient.invalidateQueries({ queryKey: ['public', 'menus'] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingMenu) {
        return settingsApi.updateMenu(editingMenu.id, menuDraft);
      }
      const nextSortOrder = sortedMenus.length > 0
        ? Math.max(...sortedMenus.map((m) => m.sortOrder)) + 1
        : 1;
      return settingsApi.createMenu({ ...menuDraft, sortOrder: nextSortOrder });
    },
    onSuccess: () => {
      toast.success(editingMenu ? 'Menu berhasil diperbarui.' : 'Menu baru berhasil ditambahkan.');
      setFormOpen(false);
      setEditingMenu(null);
      setMenuDraft(DEFAULT_MENU_DRAFT);
      refresh();
    },
    onError: (err) => {
      toast.error(toApiError(err).message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => settingsApi.deleteMenu(id),
    onSuccess: () => {
      toast.success('Menu navigasi berhasil dihapus.');
      setDeleteTarget(null);
      refresh();
    },
    onError: (err) => {
      toast.error(toApiError(err).message);
    },
  });

  const handleMove = async (menu: MenuItem, direction: 'up' | 'down') => {
    const index = sortedMenus.findIndex((m) => m.id === menu.id);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedMenus.length) return;

    const reordered = [...sortedMenus];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setIsReordering(true);
    try {
      await settingsApi.reorderMenus(
        reordered.map((item, idx) => ({ id: item.id, sortOrder: idx + 1 }))
      );
      toast.success(`Urutan menu "${menu.title}" berhasil diubah.`);
      refresh();
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setIsReordering(false);
    }
  };

  const handleToggleActive = async (menu: MenuItem) => {
    if (menu.isRequired && menu.isActive) {
      toast.error('Menu wajib universitas tidak dapat dinonaktifkan.');
      return;
    }
    try {
      await settingsApi.updateMenu(menu.id, { isActive: !menu.isActive });
      toast.success(`Menu "${menu.title}" kini ${!menu.isActive ? 'Aktif' : 'Nonaktif'}.`);
      refresh();
    } catch (err) {
      toast.error(toApiError(err).message);
    }
  };

  const openCreateModal = () => {
    setEditingMenu(null);
    setMenuDraft(DEFAULT_MENU_DRAFT);
    setFormOpen(true);
  };

  const openEditModal = (menu: MenuItem) => {
    setEditingMenu(menu);
    setMenuDraft({
      title: menu.title,
      url: menu.url,
      target: menu.target || '_self',
      isActive: menu.isActive,
      parentId: menu.parentId ?? null,
    });
    setFormOpen(true);
  };

  return (
    <AdminLayout
      title="Navigasi Website"
      description="Kelola urutan dan menu navigasi website publik program studi. Urutan dapat digeser langsung dengan tombol panah."
      actions={
        has('navigation.create') ? (
          <button type="button" onClick={openCreateModal} className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Tambah Menu
          </button>
        ) : null
      }
    >
      {menusQuery.isLoading ? (
        <LoadingState label="Memuat navigasi" />
      ) : menusQuery.isError ? (
        <ErrorState message={toApiError(menusQuery.error).message} onRetry={() => void menusQuery.refetch()} />
      ) : sortedMenus.length === 0 ? (
        <EmptyState
          title="Belum ada menu navigasi"
          description="Menu standar dibuat otomatis saat program studi dibuat. Hubungi Super Admin bila menu belum ada."
        />
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-[#CBD5E1] bg-white shadow-2xs">
          <table className="table-base">
            <thead>
              <tr>
                <th className="w-28 text-center">Urutan</th>
                <th>Judul Menu</th>
                <th>URL Tujuan</th>
                <th className="w-24 text-center">Wajib</th>
                <th className="w-28 text-center">Status</th>
                <th className="w-24 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sortedMenus.map((menu, index) => (
                <tr key={menu.id} className="hover:bg-slate-50/70 transition-colors">
                  <td>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        title="Geser ke Atas"
                        disabled={index === 0 || isReordering || !has('navigation.update')}
                        onClick={() => void handleMove(menu, 'up')}
                        className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ArrowUpIcon className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center font-mono text-xs font-bold text-slate-600">
                        {index + 1}
                      </span>
                      <button
                        type="button"
                        title="Geser ke Bawah"
                        disabled={index === sortedMenus.length - 1 || isReordering || !has('navigation.update')}
                        onClick={() => void handleMove(menu, 'down')}
                        className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ArrowDownIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {menu.parentId ? (
                        <span className="text-slate-400 font-mono text-xs pl-2">↳</span>
                      ) : null}
                      <span className={`text-slate-900 ${menu.parentId ? 'text-xs font-medium text-slate-700' : 'font-bold'}`}>
                        {menu.title}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="font-mono text-[11px] text-[#1e3a8a]">{menu.url}</span>
                  </td>
                  <td className="text-center">
                    {menu.isRequired ? (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        Wajib
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Pilihan</span>
                    )}
                  </td>
                  <td className="text-center">
                    <button
                      type="button"
                      disabled={menu.isRequired || !has('navigation.update')}
                      onClick={() => void handleToggleActive(menu)}
                      title={menu.isRequired ? 'Menu wajib universitas selalu aktif' : 'Klik untuk mengubah status'}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-opacity ${
                        menu.isActive
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      } ${menu.isRequired ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${menu.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {menu.isActive ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {has('navigation.update') ? (
                        <button
                          type="button"
                          onClick={() => openEditModal(menu)}
                          title="Ubah Menu"
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#1e3a8a]"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                      ) : null}
                      {!menu.isRequired && has('navigation.delete') ? (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(menu)}
                          title="Hapus Menu"
                          className="rounded p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah / Ubah Menu */}
      <FormModal
        open={formOpen}
        title={editingMenu ? `Ubah Menu "${editingMenu.title}"` : 'Tambah Menu Navigasi'}
        busy={saveMutation.isPending}
        onClose={() => {
          setFormOpen(false);
          setEditingMenu(null);
        }}
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
      >
        <Field label="Judul Menu" htmlFor="menu-title" required>
          <input
            id="menu-title"
            className="field-input"
            required
            value={menuDraft.title}
            onChange={(e) => setMenuDraft({ ...menuDraft, title: e.target.value })}
            placeholder="Contoh: Akreditasi, Prestasi"
          />
        </Field>

        <Field label="URL Tujuan" htmlFor="menu-url" required>
          <input
            id="menu-url"
            className="field-input font-mono text-xs"
            required
            value={menuDraft.url}
            onChange={(e) => setMenuDraft({ ...menuDraft, url: e.target.value })}
            placeholder="Contoh: /akreditasi atau https://..."
          />
        </Field>

        <Field label="Induk Menu / Dropdown Navbar" htmlFor="menu-parent" hint="Pilih jika menu ini ingin dimasukkan sebagai sub-menu dropdown.">
          <select
            id="menu-parent"
            className="field-input"
            value={menuDraft.parentId ?? ''}
            onChange={(e) =>
              setMenuDraft({
                ...menuDraft,
                parentId: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">-- Menu Utama (Tingkat Teratas / Bukan Sub-Menu) --</option>
            {sortedMenus
              .filter((m) => (!editingMenu || m.id !== editingMenu.id) && !m.parentId)
              .map((parent) => (
                <option key={parent.id} value={parent.id}>
                  Dropdown: {parent.title} ({parent.url})
                </option>
              ))}
          </select>
        </Field>

        <Field label="Target Buka Link" htmlFor="menu-target">
          <select
            id="menu-target"
            className="field-input"
            value={menuDraft.target}
            onChange={(e) => setMenuDraft({ ...menuDraft, target: e.target.value })}
          >
            <option value="_self">Tab Saat Ini (_self)</option>
            <option value="_blank">Tab Baru (_blank)</option>
          </select>
        </Field>

        <div className="flex items-center gap-2 pt-1">
          <input
            id="menu-active"
            type="checkbox"
            checked={menuDraft.isActive}
            onChange={(e) => setMenuDraft({ ...menuDraft, isActive: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a]"
          />
          <label htmlFor="menu-active" className="text-xs font-semibold text-slate-700 cursor-pointer">
            Tampilkan menu ini di navigasi publik
          </label>
        </div>
      </FormModal>

      {/* Dialog Konfirmasi Hapus Menu */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus Menu Navigasi"
        description={`Apakah Anda yakin ingin menghapus menu "${deleteTarget?.title}"? Menu ini akan langsung hilang dari website publik.`}
        confirmLabel="Hapus Menu"
        busy={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
};

export default AdminNavigation;
