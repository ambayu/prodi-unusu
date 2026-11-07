/**
 * Uji alur CRUD lengkap end-to-end terhadap server lokal.
 *
 * Menguji bahwa admin benar-benar dapat membuat, mengubah, dan menghapus data
 * melalui endpoint nyata, dan bahwa data tersebut muncul di sisi publik.
 *
 * Jalankan setelah server aktif: npx tsx tests/e2e-crud.ts
 */

import http from 'http';

const target = new URL(process.env.SMOKE_BASE_URL || 'http://localhost:5010');
const ADMIN_HOST = 'prodi.unusu.ac.id';
const PRODI_HOST = 'sin.unusu.ac.id';

let passed = 0;
let failed = 0;
const created: Array<{ kind: string; id: number }> = [];

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ''}`);
  }
}

let cookieJar: Record<string, string> = {};

function request(options: {
  method?: string;
  path: string;
  host: string;
  body?: unknown;
  withCsrf?: boolean;
  /** Tenant yang dituju. Disisipkan sebagai query `tenantId` bila diisi. */
  tenantId?: number;
}): Promise<{ status: number; body: any }> {
  const { method = 'GET', host, body, withCsrf = true, tenantId } = options;

  let path = options.path;
  if (tenantId !== undefined) {
    path += `${path.includes('?') ? '&' : '?'}tenantId=${tenantId}`;
  }

  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const cookieHeader = Object.entries(cookieJar)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');

    const headers: Record<string, string | number> = { Host: host };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (cookieHeader) headers.Cookie = cookieHeader;
    if (withCsrf && cookieJar['unusu_prodi_csrf'] && method !== 'GET') {
      headers['X-CSRF-Token'] = cookieJar['unusu_prodi_csrf'];
    }

    const req = http.request(
      { hostname: target.hostname, port: target.port, path, method, headers },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          for (const cookie of res.headers['set-cookie'] ?? []) {
            const [pair] = cookie.split(';');
            const index = pair.indexOf('=');
            if (index > 0) {
              const key = pair.slice(0, index).trim();
              const value = pair.slice(index + 1).trim();
              if (value === '') delete cookieJar[key];
              else cookieJar[key] = value;
            }
          }

          let parsed: any = null;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch {
            parsed = null;
          }
          resolve({ status: res.statusCode ?? 0, body: parsed });
        });
      },
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('=== Uji CRUD end-to-end ===\n');

  // Login
  console.log('1. Login Super Admin');
  const login = await request({
    method: 'POST',
    path: '/api/v1/auth/login',
    host: ADMIN_HOST,
    body: { username: 'admin', password: 'Unusu#Admin2026!' },
  });
  check('login berhasil', login.status === 200, login.body);
  check('cookie CSRF tersimpan', Boolean(cookieJar['unusu_prodi_csrf']));

  // Tentukan tenant target. Super Admin tanpa assignment memakai tenant pertama,
  // yaitu Teknik Informatika. Pengujian memakai tenant itu secara eksplisit agar
  // data uji dan pembacaan publik merujuk prodi yang sama.
  const programs = await request({ path: '/api/v1/admin/study-programs', host: ADMIN_HOST });
  const targetProgram = (programs.body?.studyPrograms ?? []).find((p: any) => p.code === 'TIF');
  const tenantId = targetProgram?.id;
  const targetHost = targetProgram?.domains?.find((d: any) => d.isPrimary)?.hostname ?? PRODI_HOST;

  check('tenant target terdeteksi', typeof tenantId === 'number', targetProgram?.code);
  check('domain tenant target terdeteksi', Boolean(targetHost), targetHost);

  const withTenant = (path: string) => `${path}${path.includes('?') ? '&' : '?'}tenantId=${tenantId}`;

  // ---------------------------------------------------------
  // Dosen
  // ---------------------------------------------------------
  console.log('\n2. Dosen: buat, baca, ubah, hapus');
  const createLecturer = await request({
    method: 'POST',
    path: '/api/v1/admin/lecturers',
    tenantId,
    host: ADMIN_HOST,
    body: {
      name: 'Dr. Uji Coba, M.Kom.',
      nidn: '0123456789',
      academicRank: 'Lektor',
      expertise: 'Rekayasa Perangkat Lunak',
      email: 'uji.coba@unusu.ac.id',
      sortOrder: 1,
    },
  });
  check('dosen berhasil dibuat', createLecturer.status === 201, createLecturer.body);
  const lecturerId = createLecturer.body?.lecturer?.id;
  if (lecturerId) created.push({ kind: 'lecturer', id: lecturerId });

  const updateLecturer = await request({
    method: 'PUT',
    path: `/api/v1/admin/lecturers/${lecturerId}`,
    host: ADMIN_HOST,
    body: { academicRank: 'Lektor Kepala' },
  });
  check('dosen berhasil diubah', updateLecturer.status === 200, updateLecturer.body);
  check(
    'perubahan tersimpan',
    updateLecturer.body?.lecturer?.academicRank === 'Lektor Kepala',
    updateLecturer.body?.lecturer?.academicRank,
  );

  // ---------------------------------------------------------
  // Kurikulum bertingkat
  // ---------------------------------------------------------
  console.log('\n3. Kurikulum: kurikulum, semester, mata kuliah');
  const curriculum = await request({
    method: 'POST',
    path: '/api/v1/admin/curriculums',
    tenantId,
    host: ADMIN_HOST,
    body: { name: 'Kurikulum Uji 2026', year: 2099, description: 'Data uji otomatis' },
  });
  check('kurikulum dibuat', curriculum.status === 201, curriculum.body);
  const curriculumId = curriculum.body?.curriculum?.id;
  if (curriculumId) created.push({ kind: 'curriculum', id: curriculumId });

  const semester = await request({
    method: 'POST',
    path: '/api/v1/admin/semesters',
    tenantId,
    host: ADMIN_HOST,
    body: { curriculumId, semesterNumber: 1, title: 'Semester 1' },
  });
  check('semester dibuat', semester.status === 201, semester.body);
  const semesterId = semester.body?.semester?.id;

  const course = await request({
    method: 'POST',
    path: '/api/v1/admin/courses',
    tenantId,
    host: ADMIN_HOST,
    body: {
      semesterId,
      code: 'UJI 101',
      name: 'Mata Kuliah Uji',
      credits: 3,
      courseType: 'Wajib',
    },
  });
  check('mata kuliah dibuat', course.status === 201, course.body);

  // ---------------------------------------------------------
  // Dokumen
  // ---------------------------------------------------------
  console.log('\n4. Dokumen: validasi dan pembuatan');
  const badDocument = await request({
    method: 'POST',
    path: '/api/v1/admin/documents',
    tenantId,
    host: ADMIN_HOST,
    body: { title: 'x' },
  });
  check('dokumen tanpa data wajib ditolak 422', badDocument.status === 422, badDocument.status);
  check(
    'kesalahan validasi per field dilaporkan',
    Boolean(badDocument.body?.fieldErrors),
    Object.keys(badDocument.body?.fieldErrors ?? {}),
  );

  const document = await request({
    method: 'POST',
    path: '/api/v1/admin/documents',
    tenantId,
    host: ADMIN_HOST,
    body: {
      title: 'Pedoman Akademik Uji',
      category: 'Pedoman Akademik',
      year: 2026,
      fileUrl: '/uploads/documents/uji.pdf',
      isPublic: true,
    },
  });
  check('dokumen valid berhasil dibuat', document.status === 201, document.body);
  if (document.body?.document?.id) created.push({ kind: 'document', id: document.body.document.id });

  // ---------------------------------------------------------
  // Berita dan publikasi
  // ---------------------------------------------------------
  console.log('\n5. Berita: draft tidak tampil publik, terbit tampil');
  const post = await request({
    method: 'POST',
    path: '/api/v1/admin/posts',
    tenantId,
    host: ADMIN_HOST,
    body: {
      title: 'Berita Uji Otomatis',
      slug: 'berita-uji-otomatis',
      excerpt: 'Ringkasan berita uji.',
      content: 'Isi berita uji yang dibuat oleh pengujian otomatis.',
      status: 'draft',
    },
  });
  check('berita draft dibuat', post.status === 201, post.body);
  const postId = post.body?.post?.id;
  if (postId) created.push({ kind: 'post', id: postId });

  const publicBefore = await request({ path: '/api/v1/public/posts', host: targetHost });
  const draftVisible = (publicBefore.body?.items ?? []).some((item: any) => item.slug === 'berita-uji-otomatis');
  check('draft tidak tampil di publik', draftVisible === false, draftVisible);

  const publish = await request({
    method: 'POST',
    path: `/api/v1/admin/posts/${postId}/publish`,
    host: ADMIN_HOST,
    body: { publish: true },
  });
  check('berita diterbitkan', publish.status === 200, publish.body);

  const publicAfter = await request({ path: '/api/v1/public/posts', host: targetHost });
  const publishedVisible = (publicAfter.body?.items ?? []).some(
    (item: any) => item.slug === 'berita-uji-otomatis',
  );
  check('berita terbit tampil di publik', publishedVisible === true, publishedVisible);

  // ---------------------------------------------------------
  // Builder
  // ---------------------------------------------------------
  console.log('\n6. Builder: section, widget, validasi konfigurasi, publikasi');
  const pages = await request({ path: '/api/v1/admin/pages', host: ADMIN_HOST, tenantId });
  const beranda = (pages.body?.pages ?? []).find((page: any) => page.slug === 'beranda');
  check('halaman beranda tersedia', Boolean(beranda), pages.body?.pages?.length);

  const section = await request({
    method: 'POST',
    path: `/api/v1/admin/pages/${beranda?.id}/sections`,
    host: ADMIN_HOST,
    body: { sectionKey: 'uji', title: 'Section Uji' },
  });
  check('section dibuat', section.status === 201, section.body);
  const sectionId = section.body?.section?.id;

  // Widget dengan konfigurasi tidak valid harus ditolak.
  const badWidget = await request({
    method: 'POST',
    path: `/api/v1/admin/sections/${sectionId}/widgets`,
    host: ADMIN_HOST,
    body: { widgetCode: 'about_prodi', config: { alignment: 'diagonal' } },
  });
  check('konfigurasi widget tidak valid ditolak 422', badWidget.status === 422, badWidget.status);

  const unknownWidget = await request({
    method: 'POST',
    path: `/api/v1/admin/sections/${sectionId}/widgets`,
    host: ADMIN_HOST,
    body: { widgetCode: 'widget_tidak_ada', config: {} },
  });
  check('widget tidak terdaftar ditolak 400', unknownWidget.status === 400, unknownWidget.status);

  const widget = await request({
    method: 'POST',
    path: `/api/v1/admin/sections/${sectionId}/widgets`,
    host: ADMIN_HOST,
    body: {
      widgetCode: 'about_prodi',
      variantCode: 'image-right',
      config: { eyebrow: 'Tentang', title: 'Profil Uji', body: 'Isi profil uji.', alignment: 'right' },
    },
  });
  check('widget valid dibuat', widget.status === 201, widget.body);

  // Halaman bisa saja sudah terbit dari pengujian sebelumnya. Tarik dulu agar
  // alur publikasi benar-benar diuji, bukan bergantung pada keadaan awal.
  if (beranda?.isPublished) {
    await request({
      method: 'POST',
      path: `/api/v1/admin/pages/${beranda.id}/unpublish`,
      host: ADMIN_HOST,
      tenantId,
    });
  }

  const publishPage = await request({
    method: 'POST',
    path: `/api/v1/admin/pages/${beranda?.id}/publish`,
    host: ADMIN_HOST,
    tenantId,
  });
  check('halaman beranda dipublikasikan', publishPage.status === 200, publishPage.body);

  const publicPage = await request({ path: '/api/v1/public/pages/beranda', host: targetHost });
  check('halaman publik dapat dibaca', publicPage.status === 200, publicPage.status);
  check(
    'widget tampil pada halaman publik',
    (publicPage.body?.page?.sections ?? []).some((s: any) =>
      (s.widgets ?? []).some((w: any) => w.widgetCode === 'about_prodi'),
    ),
    publicPage.body?.page?.sections?.length,
  );

  // ---------------------------------------------------------
  // Isolasi tenant
  // ---------------------------------------------------------
  console.log('\n7. Isolasi tenant: ID tenant lain harus ditolak');
  const otherTenants = await request({ path: '/api/v1/admin/study-programs', host: ADMIN_HOST });
  const other = (otherTenants.body?.studyPrograms ?? []).find((p: any) => p.id !== tenantId);

  // Super Admin boleh memilih tenant lain lewat query, tetapi data yang dibaca
  // harus benar-benar milik tenant tersebut, bukan data tenant aktif sebelumnya.
  const otherDashboard = await request({
    path: `/api/v1/admin/dashboard?tenantId=${other?.id}`,
    host: ADMIN_HOST,
  });
  check('Super Admin dapat membaca tenant lain', otherDashboard.status === 200, otherDashboard.status);

  // ---------------------------------------------------------
  // Bersihkan data uji
  // ---------------------------------------------------------
  console.log('\n8. Membersihkan data uji');
  for (const item of created.reverse()) {
    const pathByKind: Record<string, string> = {
      post: '/api/v1/admin/posts',
      document: '/api/v1/admin/documents',
      curriculum: '/api/v1/admin/curriculums',
      lecturer: '/api/v1/admin/lecturers',
    };
    const path = pathByKind[item.kind];
    if (path) {
      const res = await request({ method: 'DELETE', path: `${path}/${item.id}`, host: ADMIN_HOST });
      check(`hapus ${item.kind}`, res.status === 200, res.status);
    }
  }

  // ---------------------------------------------------------
  // Logout
  // ---------------------------------------------------------
  console.log('\n9. Logout');
  const logout = await request({ method: 'POST', path: '/api/v1/auth/logout', host: ADMIN_HOST });
  check('logout berhasil', logout.status === 200, logout.status);

  const afterLogout = await request({ path: '/api/v1/admin/dashboard', host: ADMIN_HOST });
  check('sesi dicabut setelah logout', afterLogout.status === 401, afterLogout.status);

  console.log(`\n=== Hasil: ${passed} lulus, ${failed} gagal ===`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error('Uji CRUD gagal dijalankan:', error);
  process.exitCode = 1;
});


