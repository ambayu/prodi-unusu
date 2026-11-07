import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

// Ekosistem website utama universitas.
import { MainWebsiteLayout } from './modules/main-website/layouts/MainWebsiteLayout';
import { MainLandingPage } from './modules/main-website/pages/MainLandingPage';

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

// Portal administrasi.
import { Login } from './pages/Login';
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
  const isCallbackRoute = location.pathname === '/sso/callback';

  if (isCallbackRoute) {
    return (
      <Routes>
        <Route path="/sso/callback" element={<SsoCallback />} />
      </Routes>
    );
  }

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
        Beranda publik. Hanya website utama universitas yang memakai ekosistem
        MainWebsiteLayout. Permukaan prodi memakai ProdiWebsiteLayout, dan
        portal admin tetap membuka landing page prodi karena pengunjung tidak
        perlu login untuk melihatnya.
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
                <MainLandingPage />
              </MainWebsiteLayout>
            }
          />
          <Route
            path="/fakultas"
            element={
              <MainWebsiteLayout>
                <MainLandingPage />
              </MainWebsiteLayout>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </>
      ) : (
        prodiRouteElements()
      )}
    </Routes>
  );
};

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
      <Route path="*" element={wrap(<NotFoundPage />)} />
    </>
  );
}

export default App;
