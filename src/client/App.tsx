import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

// Ekosistem website utama universitas.
import { MainWebsiteLayout } from './modules/main-website/layouts/MainWebsiteLayout';
import { MainLandingPage } from './modules/main-website/pages/MainLandingPage';
import { AboutPage, AdmissionPage, ResearchPage } from './modules/main-website/pages/MainInfoPages';
import { AcademicsPage, FacultiesPage } from './modules/main-website/pages/FacultiesPage';
import { CampusContactPage, CampusServicesPage } from './modules/main-website/pages/CampusPages';

// Ekosistem website program studi.
import { ProdiWebsiteLayout } from './modules/prodi-website/layouts/ProdiWebsiteLayout';
import { ProdiLandingPage } from './modules/prodi-website/pages/ProdiLandingPage';

// Halaman publik modul CMS.
import { CurriculumPage } from './pages/public/CurriculumPage';
import { DocumentsPage } from './pages/public/DocumentsPage';
import { LecturersPage } from './pages/public/LecturersPage';
import { ContactPage } from './pages/public/ContactPage';
import { ProfilePage } from './pages/public/ProfilePage';
import { VisionMissionPage } from './pages/public/VisionMissionPage';
import { FacilitiesPage } from './pages/public/FacilitiesPage';
import { PostsPage } from './pages/public/PostsPage';
import { GalleriesPage } from './pages/public/GalleriesPage';
import { DynamicCustomPage } from './pages/public/DynamicCustomPage';

// Portal administrasi.
import { Login } from './pages/Login';
import { PortalNewsPage } from './pages/PortalNewsPage';
import { SsoCallback } from './pages/SsoCallback';
import { Dashboard } from './pages/admin/Dashboard';
import { AdminCurriculum } from './pages/admin/AdminCurriculum';
import { AdminDocuments } from './pages/admin/AdminDocuments';
import { AdminLecturers } from './pages/admin/AdminLecturers';
import { AdminFacilities } from './pages/admin/AdminFacilities';
import { AdminPosts } from './pages/admin/AdminPosts';
import { AdminGalleries } from './pages/admin/AdminGalleries';
import { AdminContact } from './pages/admin/AdminContact';
import { AdminMedia } from './pages/admin/AdminMedia';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminBuilder } from './pages/admin/AdminBuilder';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminNavigation } from './pages/admin/AdminNavigation';
import { AdminProfile } from './pages/admin/AdminProfile';
import { AdminMyProfile } from './pages/admin/AdminMyProfile';
import { AdminOrganization } from './pages/admin/AdminOrganization';
import { AdminDomains } from './pages/admin/AdminDomains';
import { AdminRoles } from './pages/admin/AdminRoles';
import { AdminPermissions } from './pages/admin/AdminPermissions';

import { useBootstrap, useTenant } from './hooks/useSite';
import { useSiteStore } from './app/siteStore';
import { RequireAuth, RequirePermission } from './app/guards';
import { AppError, AppLoading, DomainNotRegistered } from './components/ui/AppStates';
import { NotFoundPage } from './pages/public/NotFoundPage';

/**
 * Router aplikasi.
 *
 * Permukaan aplikasi ditentukan backend dari hostname, bukan dari path.
 * Website utama universitas, website program studi, dan portal administrasi
 * memakai susunan rute masing-masing.
 */
export const App: React.FC = () => {
  useBootstrap();
  const { surface, tenant, loading, error } = useTenant();
  const user = useSiteStore((state) => state.user);
  const location = useLocation();

  // Callback SSO didahulukan sebelum pemeriksaan bootstrap.
  //
  // Halaman ini hanya bertugas menukar tiket menjadi sesi, dan tidak
  // memerlukan tenant maupun status bootstrap. Bila diperiksa setelah
  // `loading`/`error`, kegagalan bootstrap (misalnya domain belum terdaftar)
  // akan menutupi halaman callback sehingga pengguna melihat layar kosong
  // dan tidak pernah tahu penyebab kegagalan login.
  if (location.pathname === '/sso/callback') {
    return (
      <Routes>
        <Route path="/sso/callback" element={<SsoCallback />} />
      </Routes>
    );
  }

  if (loading) {
    return <AppLoading />;
  }

  // Domain tidak terdaftar: tampilkan penjelasan, bukan data prodi lain.
  if (error) {
    if (error.toLowerCase().includes('domain')) {
      return <DomainNotRegistered hostname={window.location.hostname} message={error} />;
    }
    return <AppError message={error} />;
  }

  // Rute portal administrasi melayani semua permukaan, sehingga login dapat
  // dibuka dari domain prodi maupun domain portal.
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/login';


  // Landing page bersifat publik. Redirect ke login hanya terjadi pada path
  // yang memang milik portal, bukan pada beranda.
  if (isAdminRoute && location.pathname === '/login' && user) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <Routes>
      {/* ===== PORTAL ADMINISTRASI ===== */}
      <Route path="/login" element={<Login />} />

      <Route
        path="/admin"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/builder"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['builder.view']}>
              <AdminBuilder />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/kurikulum"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['curriculum.view']}>
              <AdminCurriculum />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/dokumen"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['documents.view']}>
              <AdminDocuments />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/dosen"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['lecturers.view']}>
              <AdminLecturers />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/sarpras"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['facilities.view']}>
              <AdminFacilities />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/berita"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['posts.view']}>
              <AdminPosts />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/galeri"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['galleries.view']}>
              <AdminGalleries />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/kontak"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['contacts.view', 'contact_messages.view']}>
              <AdminContact />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/pesan"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['contact_messages.view']}>
              <AdminContact />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/media"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['media.view']}>
              <AdminMedia />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/pengguna"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['users.view']}>
              <AdminUsers />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/peran"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['users.view']}>
              <AdminRoles />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/izin"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['users.view']}>
              <AdminPermissions />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/pengaturan"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['website.view', 'theme.view', 'seo.view']}>
              <AdminSettings />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/website/identitas"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['website.view']}>
              <AdminSettings />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/website/navigasi"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['navigation.view']}>
              <AdminNavigation />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/website/tema"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['theme.view']}>
              <AdminSettings />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/website/seo"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['seo.view']}>
              <AdminSettings />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/konten/profil"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['profile.view']}>
              <AdminProfile />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/konten/visi-misi"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['vision_mission.view']}>
              <AdminProfile />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/profil-saya"
        element={
          <RequireAuth>
            <AdminMyProfile />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/organisasi"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['organization.view']}>
              <AdminOrganization />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/domain"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['domain.view']}>
              <AdminDomains />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/website-list"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['tenant.view']}>
              <AdminOrganization />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <RequireAuth>
            <RequirePermission anyOf={['audit_logs.view']}>
              <AdminDomains />
            </RequirePermission>
          </RequireAuth>
        }
      />

      {/*
        Alias rute menu.

        Rute di bawah ini adalah `route` resmi pada ADMIN_MENUS
        (src/shared/constants/organization.ts). Sebelumnya menu tersebut
        mengarah ke path yang tidak terdaftar sehingga klik menu berakhir 404.
        Alias ini menjaga agar menu dan router selalu sejalan.

        Induk grup (Website, Konten, Pengelolaan) diarahkan ke halaman pertama
        yang masuk akal bagi anggotanya; halaman itu sendiri tetap dijaga
        RequirePermission sehingga tidak membuka akses baru.
      */}
      <Route path="/admin/website" element={<Navigate to="/admin/website/identitas" replace />} />
      <Route path="/admin/konten" element={<Navigate to="/admin/konten/profil" replace />} />
      <Route path="/admin/pengelolaan" element={<Navigate to="/admin/media" replace />} />

      {/* Nama rute pada menu berbeda dengan nama rute halaman; disamakan di sini. */}
      <Route path="/admin/users" element={<Navigate to="/admin/pengguna" replace />} />
      <Route path="/admin/system-settings" element={<Navigate to="/admin/pengaturan" replace />} />
      <Route path="/admin/audit" element={<Navigate to="/admin/audit-logs" replace />} />

      {/*
        Roles & Permissions dan Widget Library belum memiliki halaman tersendiri
        di klien. Keduanya diarahkan ke Pengaturan agar menu tidak menghasilkan
        404; begitu halamannya dibuat, cukup ganti tujuan alias ini.
      */}
      <Route path="/admin/roles" element={<Navigate to="/admin/pengaturan" replace />} />
      <Route path="/admin/widget" element={<Navigate to="/admin/pengaturan" replace />} />

      {/*
        Beranda publik. Hanya website utama universitas yang memakai ekosistem
        MainWebsiteLayout. Permukaan prodi memakai ProdiWebsiteLayout.

        Permukaan `admin` (ADMIN_HOST, yaitu prodi.unusu.ac.id) sengaja TIDAK
        memakai tenant: portal administrasi memilih program studi dari
        penugasan pengguna, bukan dari domain yang sedang dibuka. Karena itu
        beranda diarahkan ke halaman login, bukan ke galat "domain belum
        terdaftar" yang dulu muncul karena surface admin ikut dicabang ke
        rute prodi.
      */}
      {surface === 'main' ? (
        <>
          <Route
            path="/"
            element={
              <MainWebsiteLayout>
                <MainLandingPage />
              </MainWebsiteLayout>
            }
          />
          <Route
            path="/tentang"
            element={
              <MainWebsiteLayout>
                <AboutPage />
              </MainWebsiteLayout>
            }
          />
          <Route
            path="/fakultas"
            element={
              <MainWebsiteLayout>
                <FacultiesPage />
              </MainWebsiteLayout>
            }
          />
          <Route
            path="/akademik"
            element={
              <MainWebsiteLayout>
                <AcademicsPage />
              </MainWebsiteLayout>
            }
          />
          <Route
            path="/pmb"
            element={
              <MainWebsiteLayout>
                <AdmissionPage />
              </MainWebsiteLayout>
            }
          />
          <Route
            path="/lppm"
            element={
              <MainWebsiteLayout>
                <ResearchPage />
              </MainWebsiteLayout>
            }
          />
          <Route
            path="/kontak"
            element={
              <MainWebsiteLayout>
                <CampusContactPage />
              </MainWebsiteLayout>
            }
          />
          <Route
            path="/layanan"
            element={
              <MainWebsiteLayout>
                <CampusServicesPage />
              </MainWebsiteLayout>
            }
          />
          <Route
            path="/berita"
            element={
              <MainWebsiteLayout>
                <PortalNewsPage />
              </MainWebsiteLayout>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </>
      ) : surface === 'admin' ? (
        adminPortalRouteElements()
      ) : (
        prodiRouteElements()
      )}
    </Routes>
  );
};

/**
 * Rute untuk permukaan portal administrasi (ADMIN_HOST).
 *
 * Portal tidak memiliki tenant, sehingga tidak boleh jatuh ke rute website
 * prodi. Beranda menampilkan landing page portal (hero + direktori fakultas
 * dan prodi) sehingga publik tetap dapat menjelajah website prodi, sedangkan
 * path lain diarahkan ke login agar pengelola langsung menemukan pintu masuk.
 */
function adminPortalRouteElements() {
  const wrap = (children: React.ReactNode) => <MainWebsiteLayout>{children}</MainWebsiteLayout>;

  return (
    <>
      <Route path="/" element={wrap(<MainLandingPage />)} />
      <Route path="/tentang" element={wrap(<AboutPage />)} />
      <Route path="/fakultas" element={wrap(<FacultiesPage />)} />
      <Route path="/akademik" element={wrap(<AcademicsPage />)} />
      <Route path="/pmb" element={wrap(<AdmissionPage />)} />
      <Route path="/lppm" element={wrap(<ResearchPage />)} />
      <Route path="/kontak" element={wrap(<CampusContactPage />)} />
      <Route path="/layanan" element={wrap(<CampusServicesPage />)} />
      <Route path="/berita" element={wrap(<PortalNewsPage />)} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </>
  );
}

/**
 * Rute website prodi.
 *
 * Ditulis sebagai fungsi yang mengembalikan elemen `<Route>` langsung, bukan
 * sebagai komponen React. `Routes` hanya menerima anak berupa `<Route>` atau
 * `<Fragment>`, sehingga membungkusnya dalam komponen sendiri akan gagal dengan
 * kesalahan "[ProdiRoutes] is not a Route component".
 *
 * Seluruh rute di sini bersifat publik. Rute `/login`, `/admin`, dan
 * `/sso/callback` sudah ditangani lebih awal dan tidak bergantung permukaan.
 */
function prodiRouteElements() {
  const tenant = useSiteStore.getState().tenant;

  if (!tenant) {
    return (
      <Route
        path="*"
        element={<DomainNotRegistered hostname={window.location.hostname} message="Tenant website tidak ditemukan." />}
      />
    );
  }

  const wrap = (children: React.ReactNode) => <ProdiWebsiteLayout>{children}</ProdiWebsiteLayout>;

  return (
    <>
      <Route path="/" element={wrap(<ProdiLandingPage />)} />
      <Route path="/profil" element={wrap(<ProfilePage />)} />
      <Route path="/visi-misi" element={wrap(<VisionMissionPage />)} />
      <Route path="/kurikulum" element={wrap(<CurriculumPage />)} />
      <Route path="/dokumen" element={wrap(<DocumentsPage />)} />
      <Route path="/dosen" element={wrap(<LecturersPage />)} />
      <Route path="/sarana-prasarana" element={wrap(<FacilitiesPage />)} />
      <Route path="/sarpras" element={wrap(<FacilitiesPage />)} />
      <Route path="/berita" element={wrap(<PostsPage />)} />
      <Route path="/galeri" element={wrap(<GalleriesPage />)} />
      <Route path="/kontak" element={wrap(<ContactPage />)} />
      <Route path="/halaman/:slug" element={wrap(<DynamicCustomPage />)} />
      <Route path="*" element={wrap(<NotFoundPage />)} />
    </>
  );
}

export default App;
