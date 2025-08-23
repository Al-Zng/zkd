/* ==========================================================
   ZKD WebApp - App Logic (كامل)
   إصلاحات وتحسينات شاملة
   ========================================================== */

// 1) تهيئة Supabase
const SB_URL = 'https://ekiaasbrzkbckmtyptxw.supabase.co';
const SB_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVraWFhc2JyemtiY2ttdHlwdHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4ODk0OTEsImV4cCI6MjA3MTQ2NTQ5MX0.4IAlkSVs_ILeSWf2NpvJJSYat3NzkMT-WieYyM9BPUA';

// التحقق من وجود Supabase
if (!window.supabase || !window.supabase.createClient) {
  console.error('Supabase UMD not loaded. تأكد من تضمين سكربت supabase-js في index.html');
}

// إنشاء العميل
const sb = window.supabase.createClient(SB_URL, SB_ANON_KEY);

// 2) DOM & State
const splashScreen = document.querySelector('.splash-screen');
const views = document.querySelectorAll('.view');
const bottomNav = document.querySelector('.bottom-nav');
const sidebar = document.getElementById('sidebar');
const overlay = document.createElement('div');
overlay.className = 'overlay';
document.body.appendChild(overlay);

// عناصر الشبكات
const latestChaptersGrid = document.getElementById('latestChapters');
const categoriesGrid = document.getElementById('categoriesGrid');
const allMangaGrid = document.getElementById('allMangaGrid');
const savedMangaGrid = document.getElementById('savedManga');
const continueReadingGrid = document.getElementById('continueReading');
const readingHistoryGrid = document.getElementById('readingHistory');

// عناصر البروفايل
const profileAvatar = document.getElementById('profileAvatar');
const profileName = document.getElementById('profileName');
const profileRole = document.getElementById('profileRole');
const profileStats = document.getElementById('profileStats');
const profileActions = document.getElementById('profileActions');
const openLogin = document.getElementById('openLogin');
const openRegister = document.getElementById('openRegister');

// عناصر القارئ
const readerCanvas = document.getElementById('readerCanvas');
const readerMangaTitle = document.getElementById('readerMangaTitle');
const readerChapterTitle = document.getElementById('readerChapterTitle');
const backFromReaderBtn = document.querySelector('[data-action="back-from-reader"]');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const fitModeBtn = document.getElementById('fitMode');
const toggleThemeBtn = document.getElementById('toggleTheme');
const prevChapterBtn = document.getElementById('prevChapter');
const nextChapterBtn = document.getElementById('nextChapter');
const readerSettingsBtn = document.getElementById('readerSettings');

// عناصر الإعدادات
const darkModeToggle = document.getElementById('darkModeToggle');
const autoDownloadToggle = document.getElementById('autoDownloadToggle');
const offlineReadingToggle = document.getElementById('offlineReadingToggle');
const notificationsToggle = document.getElementById('notificationsToggle');

// عناصر لوحة التحكم
const adminPanelLink = document.getElementById('adminPanelLink');
const totalMangaEl = document.getElementById('totalManga');
const totalChaptersEl = document.getElementById('totalChapters');
const totalUsersEl = document.getElementById('totalUsers');
const totalTeamsEl = document.getElementById('totalTeams');
const adminActivityList = document.getElementById('adminActivityList');
const addMangaBtn = document.getElementById('addMangaBtn');
const addChapterBtn = document.getElementById('addChapterBtn');
const manageUsersBtn = document.getElementById('manageUsersBtn');
const manageTeamsBtn = document.getElementById('manageTeamsBtn');

// النمط العام
const root = document.documentElement;

// حالة التطبيق
let currentUser = null;
let currentView = 'home';
let isAdmin = false;
let readerState = {
  mangaId: null,
  chapterId: null,
  pages: [],
  zoom: 1,
  fitMode: 'width',
  theme: 'dark',
  chapterIndexInList: null,
  chapterList: [],
};

// 3) دوال المساعدة
function showNotification(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `notification notification-${type}`;
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  }, 3000);
}

function showLoading(el) {
  el.innerHTML = `<div class="loading"><div class="loading-spinner"></div></div>`;
}

function showNoData(el, text = 'لا توجد بيانات متاحة حالياً') {
  el.innerHTML = `<div class="no-data">${text}</div>`;
}

function showError(el, text = 'حدث خطأ في تحميل البيانات') {
  el.innerHTML = `<div class="error-message">${text}</div>`;
}

function truncate(t, n = 60) {
  if (!t) return '';
  return t.length > n ? t.slice(0, n) + '…' : t;
}

function formatDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return d;
  }
}

// 4) إدارة العرض والتنقل
function switchView(view) {
  currentView = view;
  views.forEach(v => v.classList.toggle('active', v.dataset.view === view));
  document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.nav === view));
  
  // تحميل المحتوى بناءً على الصفحة
  if (view === 'home') loadLatestChapters();
  if (view === 'categories') renderCategories();
  if (view === 'manga-list') loadAllManga();
  if (view === 'library') {
    renderSavedManga();
    document.querySelector('.tab[data-tab="saved"]').click();
  }
  if (view === 'account') loadProfileStats();
  if (view === 'admin-panel' && isAdmin) loadAdminDashboard();
  
  // إغلاق القائمة الجانبية
  hideSidebar();
}

function toggleSidebar() {
  sidebar.classList.toggle('active');
  overlay.classList.toggle('active');
}

function hideSidebar() {
  sidebar.classList.remove('active');
  overlay.classList.remove('active');
}

// إعداد مستمعي الأحداث للتنقل
if (bottomNav) {
  bottomNav.addEventListener('click', (e) => {
    const link = e.target.closest('.nav-item');
    if (!link) return;
    e.preventDefault();
    const v = link.dataset.nav;
    if (v) switchView(v);
  });
}

// مستمعي الأحداث للقائمة الجانبية
document.querySelectorAll('.sidebar-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const view = item.dataset.nav;
    if (view) switchView(view);
  });
});

document.querySelectorAll('#menuToggle, #menuToggleCategories, #menuToggleMangaList, #menuToggleLibrary, #menuToggleAccount, #menuToggleSettings, #menuToggleAdmin').forEach(btn => {
  btn.addEventListener('click', toggleSidebar);
});

document.getElementById('closeSidebar').addEventListener('click', hideSidebar);
overlay.addEventListener('click', hideSidebar);

// 5) إدارة النوافذ المنبثقة
function showModal(m) {
  m.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function hideModal(m) {
  m.classList.remove('active');
  document.body.style.overflow = 'auto';
}

document.querySelectorAll('.close-modal').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const id = e.currentTarget.getAttribute('data-close');
    const modal = document.getElementById(id);
    if (modal) hideModal(modal);
  });
});

// 6) نظام المصادقة
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    currentUser = data.user;
    hideModal(loginModal);
    updateUIForAuthState();
    showNotification('تم تسجيل الدخول بنجاح!', 'success');
    
    // إذا كان المستخدم مسؤولاً
    if (email === 'admin@zkd.com') {
      isAdmin = true;
      adminPanelLink.hidden = false;
    }
  } catch (err) {
    showNotification('فشل تسجيل الدخول: ' + (err?.message || 'خطأ غير معروف'), 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const username = document.getElementById('regUsername').value.trim();
  const userType = document.getElementById('userType').value;
  
  try {
    const { data: authData, error: authErr } = await sb.auth.signUp({ email, password });
    if (authErr) throw authErr;
    
    const userId = authData?.user?.id;
    if (userId) {
      const { error: userErr } = await sb.from('users').insert([{ id: userId, email, username, role: userType }]);
      if (userErr) console.warn('Insert users warn:', userErr.message);
    }
    
    showNotification('تم إنشاء الحساب! تحقق من بريدك للتأكيد.', 'success');
    hideModal(registerModal);
  } catch (err) {
    showNotification('فشل إنشاء الحساب: ' + (err?.message || 'خطأ غير معروف'), 'error');
  }
}

async function checkAuthState() {
  try {
    const { data } = await sb.auth.getSession();
    if (data.session) {
      currentUser = data.session.user;
      updateUIForAuthState();
      
      // التحقق إذا كان المستخدم مسؤولاً
      if (currentUser.email === 'admin@zkd.com') {
        isAdmin = true;
        adminPanelLink.hidden = false;
      }
    }
  } catch (err) {
    console.error('Error checking auth state:', err);
  }
}

function updateUIForAuthState() {
  if (currentUser) {
    const name = currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'مستخدم';
    profileName.textContent = name;
    profileRole.textContent = 'مسجل';
    profileAvatar.textContent = (name[0] || 'U').toUpperCase();
    
    // تحديث أزرار الحساب
    profileActions.innerHTML = `
      <button class="btn-secondary" id="logoutBtn">تسجيل الخروج</button>
    `;
    
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // تحميل إحصائيات البروفايل
    loadProfileStats();
  } else {
    profileName.textContent = 'زائر';
    profileRole.textContent = 'Guest';
    profileAvatar.textContent = 'U';
    
    // إعادة أزرار التسجيل
    profileActions.innerHTML = `
      <button class="btn-secondary" id="openLogin">تسجيل الدخول</button>
      <button class="btn-primary" id="openRegister">إنشاء حساب</button>
    `;
    
    // إعادة إضافة مستمعي الأحداث
    document.getElementById('openLogin').addEventListener('click', () => showModal(loginModal));
    document.getElementById('openRegister').addEventListener('click', () => showModal(registerModal));
    
    profileStats.innerHTML = '';
  }
}

async function handleLogout() {
  try {
    const { error } = await sb.auth.signOut();
    if (error) throw error;
    
    currentUser = null;
    isAdmin = false;
    adminPanelLink.hidden = true;
    updateUIForAuthState();
    showNotification('تم تسجيل الخروج بنجاح', 'success');
  } catch (err) {
    showNotification('فشل تسجيل الخروج: ' + (err?.message || 'خطأ غير معروف'), 'error');
  }
}

// متتبع حالة المصادقة
sb.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    currentUser = session.user;
    updateUIForAuthState();
    showNotification('مرحباً بعودتك!', 'success');
    
    // التحقق إذا كان المستخدم مسؤولاً
    if (currentUser.email === 'admin@zkd.com') {
      isAdmin = true;
      adminPanelLink.hidden = false;
    }
  } else if (event === 'SIGNED_OUT') {
    currentUser = null;
    isAdmin = false;
    adminPanelLink.hidden = true;
    updateUIForAuthState();
  }
});

// 7) تحميل البيانات وعرضها
async function loadLatestChapters() {
  showLoading(latestChaptersGrid);
  try {
    const { data, error } = await sb.from('chapters')
      .select(`
        id,
        manga_id,
        title,
        updated_at,
        created_at,
        cover_url,
        number,
        chapter_number,
        manga:manga_id(id, title, cover_url, status, type, genre)
      `)
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (error) throw error;
    renderChapterGrid(latestChaptersGrid, data);
  } catch (err) {
    console.error('Error loading latest chapters:', err);
    showError(latestChaptersGrid, 'حدث خطأ في تحميل الفصول');
  }
}

async function loadAllManga() {
  showLoading(allMangaGrid);
  try {
    const { data, error } = await sb.from('manga')
      .select('id, title, cover_url, status, type, genre, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (error) throw error;
    renderMangaGrid(allMangaGrid, data);
  } catch (err) {
    console.error('Error loading all manga:', err);
    showError(allMangaGrid, 'حدث خطأ في تحميل المانغا');
  }
}

// 8) نظام التصنيفات
const DEFAULT_CATEGORIES = [
  { key: 'أكشن', icon: 'ri-sword-line' },
  { key: 'رومانسي', icon: 'ri-heart-3-line' },
  { key: 'كوميدي', icon: 'ri-emotion-laugh-line' },
  { key: 'خيال علمي', icon: 'ri-planet-line' },
  { key: 'رعب', icon: 'ri-ghost-2-line' },
  { key: 'دراما', icon: 'ri-drama-line' },
  { key: 'غموض', icon: 'ri-spy-line' },
  { key: 'فانتازيا', icon: 'ri-magic-line' },
  { key: 'شوجو', icon: 'ri-hearts-line' },
  { key: 'شونين', icon: 'ri-fire-line' },
  { key: 'سيين', icon: 'ri-user-voice-line' },
  { key: 'رياضة', icon: 'ri-basketball-line' },
];

function renderCategories() {
  if (!categoriesGrid) return;
  categoriesGrid.innerHTML = '';
  
  DEFAULT_CATEGORIES.forEach(cat => {
    const el = document.createElement('div');
    el.className = 'category-card';
    el.innerHTML = `<i class="${cat.icon}"></i><span>${cat.key}</span>`;
    el.addEventListener('click', () => filterByGenre(cat.key));
    categoriesGrid.appendChild(el);
  });
}

async function filterByGenre(genre) {
  switchView('manga-list');
  showLoading(allMangaGrid);
  
  try {
    const { data, error } = await sb.from('manga')
      .select('id, title, cover_url, status, type, genre, created_at')
      .ilike('genre', `%${genre}%`)
      .order('created_at', { ascending: false })
      .limit(30);
      
    if (error) throw error;
    
    if (data.length === 0) {
      showNoData(allMangaGrid, `لا توجد مانغا في تصنيف ${genre}`);
    } else {
      renderMangaGrid(allMangaGrid, data);
      showNotification(`عرض مانغا من تصنيف ${genre}`, 'info');
    }
  } catch (err) {
    console.error('Error filtering by genre:', err);
    showError(allMangaGrid, 'حدث خطأ في التصفية');
  }
}

// 9) نظام المكتبة الشخصية
const storage = {
  getSaved() {
    try {
      return JSON.parse(localStorage.getItem('zkd_saved') || '[]');
    } catch {
      return [];
    }
  },
  
  setSaved(arr) {
    localStorage.setItem('zkd_saved', JSON.stringify(arr));
  },
  
  getProgress() {
    try {
      return JSON.parse(localStorage.getItem('zkd_progress') || '{}');
    } catch {
      return {};
    }
  },
  
  setProgress(obj) {
    localStorage.setItem('zkd_progress', JSON.stringify(obj));
  },
  
  getHistory() {
    try {
      return JSON.parse(localStorage.getItem('zkd_history') || '[]');
    } catch {
      return [];
    }
  },
  
  setHistory(arr) {
    localStorage.setItem('zkd_history', JSON.stringify(arr));
  },
  
  getLists() {
    try {
      return JSON.parse(localStorage.getItem('zkd_lists') || '{}');
    } catch {
      return {};
    }
  },
  
  setLists(obj) {
    localStorage.setItem('zkd_lists', JSON.stringify(obj));
  }
};

function toggleSaveManga(mangaId) {
  if (!currentUser) {
    showNotification('يجب تسجيل الدخول لحفظ المانغا', 'warning');
    showModal(loginModal);
    return;
  }
  
  const saved = new Set(storage.getSaved());
  
  if (saved.has(mangaId)) {
    saved.delete(mangaId);
    showNotification('تم الإزالة من المحفوظات', 'info');
  } else {
    saved.add(mangaId);
    showNotification('تم الحفظ في المكتبة', 'success');
  }
  
  storage.setSaved([...saved]);
  
  if (currentView === 'library') {
    renderSavedManga();
  }
}

async function renderSavedManga() {
  const saved = storage.getSaved();
  
  if (!saved.length) {
    showNoData(savedMangaGrid, 'لا توجد عناصر محفوظة بعد');
    return;
  }
  
  showLoading(savedMangaGrid);
  
  try {
    const { data, error } = await sb.from('manga')
      .select('id, title, cover_url, status, type, genre, created_at')
      .in('id', saved);
      
    if (error) throw error;
    renderMangaGrid(savedMangaGrid, data);
  } catch (err) {
    console.error('Error loading saved manga:', err);
    showError(savedMangaGrid, 'حدث خطأ في تحميل المحفوظات');
  }
}

async function renderContinueReading() {
  const progress = storage.getProgress();
  const items = Object.entries(progress)
    .map(([chapterId, v]) => ({ chapterId: Number(chapterId), ...v }))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 20);
  
  if (!items.length) {
    showNoData(continueReadingGrid, 'لا يوجد تقدم قراءة محفوظ');
    return;
  }
  
  showLoading(continueReadingGrid);
  
  try {
    const ids = items.map(i => i.chapterId);
    const { data, error } = await sb.from('chapters')
      .select(`
        id,
        manga_id,
        title,
        updated_at,
        created_at,
        cover_url,
        number,
        chapter_number,
        manga:manga_id(id, title, cover_url)
      `)
      .in('id', ids);
      
    if (error) throw error;
    renderChapterGrid(continueReadingGrid, data);
  } catch (err) {
    console.error('Error loading continue reading:', err);
    showError(continueReadingGrid, 'حدث خطأ في تحميل متابعة القراءة');
  }
}

async function renderReadingHistory() {
  const history = storage.getHistory();
  
  if (!history.length) {
    showNoData(readingHistoryGrid, 'لا يوجد سجل مشاهدة');
    return;
  }
  
  showLoading(readingHistoryGrid);
  
  try {
    // تجميع chapter IDs من السجل
    const chapterIds = history.map(item => item.chapterId);
    
    const { data, error } = await sb.from('chapters')
      .select(`
        id,
        manga_id,
        title,
        updated_at,
        created_at,
        cover_url,
        number,
        chapter_number,
        manga:manga_id(id, title, cover_url)
      `)
      .in('id', chapterIds);
      
    if (error) throw error;
    
    // دمج بيانات السجل مع بيانات الفصول
    const historyWithData = history.map(historyItem => {
      const chapterData = data.find(ch => ch.id === historyItem.chapterId);
      return {
        ...historyItem,
        ...chapterData
      };
    });
    
    renderChapterGrid(readingHistoryGrid, historyWithData);
  } catch (err) {
    console.error('Error loading reading history:', err);
    showError(readingHistoryGrid, 'حدث خطأ في تحميل سجل المشاهدة');
  }
}

// 10) نظام التبويبات
if (document.querySelectorAll('.tab').length) {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      
      // إزالة النشاط من جميع الأزرار والمحتويات
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      // إضافة النشاط للزر والمحتوى المحدد
      btn.classList.add('active');
      document.querySelector(`.tab-content[data-content="${tab}"]`).classList.add('active');
      
      // تحميل المحتوى بناءً على التبويب
      if (tab === 'saved') renderSavedManga();
      if (tab === 'continue') renderContinueReading();
      if (tab === 'history') renderReadingHistory();
    });
  });
}

// 11) دوال العرض
function renderMangaGrid(target, list) {
  if (!list || !list.length) {
    showNoData(target);
    return;
  }
  
  target.innerHTML = '';
  
  list.forEach(manga => {
    const card = document.createElement('div');
    card.className = 'manga-card';
    
    const cover = manga.cover_url || 'https://via.placeholder.com/300x420/1a1a1a/4361ee?text=No+Image';
    const title = manga.title || '—';
    const meta = manga.genre || manga.type || manga.status || '';
    
    card.innerHTML = `
      <img src="${cover}" alt="${title}" class="manga-cover">
      <div class="manga-info">
        <h3 class="manga-title" title="${title}">${title}</h3>
        <p class="manga-meta">${truncate(meta, 50)}</p>
        <div style="display:flex;gap:.4rem;margin-top:.4rem">
          <button class="btn-secondary" data-action="save" title="حفظ"><i class="ri-bookmark-line"></i></button>
          <button class="btn-primary" data-action="open" title="عرض"><i class="ri-eye-line"></i></button>
        </div>
      </div>
    `;
    
    // إضافة مستمعي الأحداث للأزرار
    card.querySelector('[data-action="save"]').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSaveManga(manga.id);
    });
    
    card.querySelector('[data-action="open"]').addEventListener('click', (e) => {
      e.stopPropagation();
      openMangaDetails(manga);
    });
    
    // فتح تفاصيل المانغا عند النقر على البطاقة
    card.addEventListener('click', () => {
      openMangaDetails(manga);
    });
    
    target.appendChild(card);
  });
}

function renderChapterGrid(target, list) {
  if (!list || !list.length) {
    showNoData(target);
    return;
  }
  
  target.innerHTML = '';
  
  list.forEach(ch => {
    const card = document.createElement('div');
    card.className = 'chapter-card';
    
    const thumb = ch.cover_url || ch.manga?.cover_url || 'https://via.placeholder.com/200x200/1a1a1a/4361ee?text=Chapter';
    const title = ch.manga?.title || '—';
    const num = ch.number ?? ch.chapter_number ?? null;
    const chTitle = ch.title || (num != null ? `الفصل ${num}` : `فصل #${ch.id}`);
    
    card.innerHTML = `
      <div class="thumb"><img src="${thumb}" alt="${chTitle}"></div>
      <div class="chapter-info">
        <h4 title="${chTitle}">${chTitle}</h4>
        <div class="chapter-meta">
          <span class="chip">${truncate(title, 24)}</span>
          <span class="muted">${formatDate(ch.updated_at || ch.created_at)}</span>
        </div>
      </div>
    `;
    
    card.addEventListener('click', () => {
      openChapter(ch.id, ch.manga_id);
    });
    
    target.appendChild(card);
  });
}

// 12) نظام القارئ
async function openMangaDetails(manga) {
  try {
    // البحث عن آخر فصل للمانغا
    const { data, error } = await sb.from('chapters')
      .select('id, manga_id, updated_at, created_at')
      .eq('manga_id', manga.id)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (error) throw error;
    
    if (data?.length) {
      openChapter(data[0].id, manga.id);
    } else {
      showNotification(`لا يوجد فصول متاحة لـ: ${manga.title}`, 'info');
    }
  } catch (err) {
    console.error('Error opening manga details:', err);
    showNotification('تعذر فتح تفاصيل المانغا', 'error');
  }
}

async function openChapter(chapterId, mangaId) {
  try {
    // الحصول على قائمة الفصول للتنقل
    const { data: chapList, error: listErr } = await sb.from('chapters')
      .select('id, manga_id, title, created_at, number, chapter_number')
      .eq('manga_id', mangaId)
      .order('created_at', { ascending: true });
      
    if (listErr) throw listErr;
    readerState.chapterList = chapList || [];
    
    // الحصول على بيانات الفصل الحالي
    const { data, error } = await sb.from('chapters')
      .select(`
        id,
        manga_id,
        title,
        updated_at,
        created_at,
        pages,
        cover_url,
        number,
        chapter_number,
        manga:manga_id(title)
      `)
      .eq('id', chapterId)
      .single();
      
    if (error) throw error;
    
    // تحديث حالة القارئ
    readerState.mangaId = mangaId;
    readerState.chapterId = chapterId;
    readerState.pages = Array.isArray(data.pages) ? data.pages : [];
    readerState.zoom = 1;
    
    // تحديث عناوين القارئ
    readerMangaTitle.textContent = data.manga?.title || '—';
    const num = data.number ?? data.chapter_number ?? null;
    readerChapterTitle.textContent = data.title || (num != null ? `الفصل ${num}` : `فصل #${data.id}`);
    
    // تحديد موقع الفصل في القائمة
    const idx = readerState.chapterList.findIndex(c => c.id === chapterId);
    readerState.chapterIndexInList = idx;
    
    // عرض صفحات الفصل
    renderReaderPages();
    
    // التبديل إلى عرض القارئ
    switchView('reader');
    
    // حفظ تقدم القراءة
    saveReadingProgress(chapterId, mangaId, 0);
    
    // إضافة إلى سجل المشاهدة
    addToReadingHistory(chapterId, mangaId);
  } catch (err) {
    console.error('Error opening chapter:', err);
    showNotification('تعذر فتح الفصل', 'error');
  }
}

function renderReaderPages() {
  readerCanvas.innerHTML = '';
  
  if (!readerState.pages.length) {
    readerCanvas.innerHTML = `<div class="no-data">لا توجد صفحات لهذا الفصل.</div>`;
    return;
  }
  
  readerState.pages.forEach((url, i) => {
    const page = document.createElement('div');
    page.className = 'page';
    
    const img = document.createElement('img');
    img.src = url;
    img.alt = `صفحة ${i + 1}`;
    img.style.transform = `scale(${readerState.zoom})`;
    img.style.transformOrigin = 'center top';
    
    page.appendChild(img);
    readerCanvas.appendChild(page);
  });
}

function saveReadingProgress(chapterId, mangaId, pageIndex) {
  const progress = storage.getProgress();
  progress[chapterId] = { mangaId, pageIndex, updatedAt: Date.now() };
  storage.setProgress(progress);
}

function addToReadingHistory(chapterId, mangaId) {
  const history = storage.getHistory();
  
  // إزالة أي وجود سابق لهذا الفصل في السجل
  const filteredHistory = history.filter(item => item.chapterId !== chapterId);
  
  // إضافة الفصل إلى بداية السجل
  filteredHistory.unshift({
    chapterId,
    mangaId,
    readAt: Date.now()
  });
  
  // حفظ السجل (الحد الأقصى 100 عنصر)
  storage.setHistory(filteredHistory.slice(0, 100));
}

function navigateChapter(direction) {
  const list = readerState.chapterList;
  let idx = readerState.chapterIndexInList;
  
  if (idx == null || !list?.length) return;
  
  if (direction === 'next' && idx < list.length - 1) {
    const nextChapter = list[idx + 1];
    openChapter(nextChapter.id, nextChapter.manga_id);
  } else if (direction === 'prev' && idx > 0) {
    const prevChapter = list[idx - 1];
    openChapter(prevChapter.id, prevChapter.manga_id);
  } else {
    showNotification(direction === 'next' ? 'لا يوجد فصل لاحق' : 'لا يوجد فصل سابق', 'info');
  }
}

// 13) نظام الإعدادات
function initSettings() {
  // تحميل الإعدادات المحفوظة
  const settings = JSON.parse(localStorage.getItem('zkd_settings') || '{}');
  
  // تطبيق الإعدادات
  if (settings.darkMode !== undefined) {
    darkModeToggle.checked = settings.darkMode;
    toggleDarkMode(settings.darkMode);
  }
  
  if (settings.autoDownload !== undefined) {
    autoDownloadToggle.checked = settings.autoDownload;
  }
  
  if (settings.offlineReading !== undefined) {
    offlineReadingToggle.checked = settings.offlineReading;
  }
  
  if (settings.notifications !== undefined) {
    notificationsToggle.checked = settings.notifications;
  }
  
  // إضافة مستمعي الأحداث
  darkModeToggle.addEventListener('change', (e) => {
    toggleDarkMode(e.target.checked);
    saveSettings();
  });
  
  autoDownloadToggle.addEventListener('change', saveSettings);
  offlineReadingToggle.addEventListener('change', saveSettings);
  notificationsToggle.addEventListener('change', saveSettings);
}

function toggleDarkMode(enabled) {
  if (enabled) {
    root.style.setProperty('--primary-bg', '#0a0a0a');
    root.style.setProperty('--secondary-bg', '#121212');
    root.style.setProperty('--card-bg', '#1a1a1a');
  } else {
    root.style.setProperty('--primary-bg', '#f5f5f5');
    root.style.setProperty('--secondary-bg', '#ffffff');
    root.style.setProperty('--card-bg', '#f0f0f0');
  }
}

function saveSettings() {
  const settings = {
    darkMode: darkModeToggle.checked,
    autoDownload: autoDownloadToggle.checked,
    offlineReading: offlineReadingToggle.checked,
    notifications: notificationsToggle.checked
  };
  
  localStorage.setItem('zkd_settings', JSON.stringify(settings));
  showNotification('تم حفظ الإعدادات', 'success');
}

// 14) لوحة تحكم المسؤول
async function loadAdminDashboard() {
  if (!isAdmin) return;
  
  try {
    // تحميل الإحصائيات
    const [
      { count: mangaCount },
      { count: chaptersCount },
      { count: usersCount },
      { count: teamsCount }
    ] = await Promise.all([
      sb.from('manga').select('*', { count: 'exact', head: true }),
      sb.from('chapters').select('*', { count: 'exact', head: true }),
      sb.from('users').select('*', { count: 'exact', head: true }),
      sb.from('teams').select('*', { count: 'exact', head: true })
    ]);
    
    // تحديث واجهة الإحصائيات
    totalMangaEl.textContent = mangaCount || 0;
    totalChaptersEl.textContent = chaptersCount || 0;
    totalUsersEl.textContent = usersCount || 0;
    totalTeamsEl.textContent = teamsCount || 0;
    
    // تحميل آخر النشاطات
    loadAdminActivity();
  } catch (err) {
    console.error('Error loading admin dashboard:', err);
    showNotification('حدث خطأ في تحميل لوحة التحكم', 'error');
  }
}

async function loadAdminActivity() {
  try {
    // يمكنك هنا جلب سجل النشاطات من قاعدة البيانات
    // في هذا المثال، سنعرض نشاطات وهمية للتوضيح
    
    const activities = [
      {
        icon: 'ri-user-add-line',
        text: 'تم تسجيل مستخدم جديد: أحمد',
        time: 'منذ 5 دقائق'
      },
      {
        icon: 'ri-book-2-line',
        text: 'تم إضافة مانغا جديدة: One Piece',
        time: 'منذ 15 دقيقة'
      },
      {
        icon: 'ri-file-add-line',
        text: 'تم رفع فصل جديد: Attack on Titan - الفصل 150',
        time: 'منذ ساعة'
      },
      {
        icon: 'ri-team-line',
        text: 'فريق الترجمة "Anime4Fun" قام بتحديث عملهم',
        time: 'منذ 3 ساعات'
      }
    ];
    
    adminActivityList.innerHTML = '';
    
    activities.forEach(activity => {
      const item = document.createElement('div');
      item.className = 'activity-item';
      
      item.innerHTML = `
        <i class="${activity.icon}"></i>
        <div class="activity-info">
          <p>${activity.text}</p>
          <span class="muted">${activity.time}</span>
        </div>
      `;
      
      adminActivityList.appendChild(item);
    });
  } catch (err) {
    console.error('Error loading admin activity:', err);
  }
}

// 15) إحصائيات البروفايل
async function loadProfileStats() {
  try {
    const uid = currentUser?.id;
    
    if (!uid) {
      profileStats.innerHTML = '';
      return;
    }
    
    // إحصائيات المستخدم
    const savedCount = storage.getSaved().length;
    const progressCount = Object.keys(storage.getProgress()).length;
    const historyCount = storage.getHistory().length;
    
    profileStats.innerHTML = `
      <div class="stat">
        <div class="num">${savedCount}</div>
        <div class="lbl">المحفوظات</div>
      </div>
      <div class="stat">
        <div class="num">${progressCount}</div>
        <div class="lbl">قيد القراءة</div>
      </div>
      <div class="stat">
        <div class="num">${historyCount}</div>
        <div class="lbl">المشاهدات</div>
      </div>
    `;
  } catch (err) {
    console.warn('Error loading profile stats:', err);
    profileStats.innerHTML = '';
  }
}

// 16) تهيئة التطبيق
document.addEventListener('DOMContentLoaded', async () => {
  // إخفاء شاشة التحميل بعد ثانية
  setTimeout(() => {
    if (splashScreen) {
      splashScreen.style.opacity = '0';
      setTimeout(() => {
        splashScreen.style.display = 'none';
      }, 500);
    }
  }, 1000);
  
  // تهيئة الإعدادات
  initSettings();
  
  // التحقق من حالة المصادقة
  await checkAuthState();
  
  // التبديل إلى الصفحة الرئيسية
  switchView('home');
  
  // تحميل التصنيفات
  renderCategories();
  
  // إضافة مستمعي الأحداث للنماذج
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  
  // إضافة مستمعي الأحداث لأزرار التسجيل
  if (openLogin) openLogin.addEventListener('click', () => showModal(loginModal));
  if (openRegister) openRegister.addEventListener('click', () => showModal(registerModal));
  
  // إضافة مستمعي الأحداث للقارئ
  if (backFromReaderBtn) backFromReaderBtn.addEventListener('click', () => switchView('home'));
  if (zoomInBtn) zoomInBtn.addEventListener('click', () => {
    readerState.zoom = Math.min(readerState.zoom + 0.1, 2.5);
    renderReaderPages();
  });
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => {
    readerState.zoom = Math.max(readerState.zoom - 0.1, 0.6);
    renderReaderPages();
  });
  if (fitModeBtn) fitModeBtn.addEventListener('click', () => {
    readerState.fitMode = readerState.fitMode === 'width' ? 'height' : 'width';
    showNotification(`وضع الملاءمة: ${readerState.fitMode === 'width' ? 'عرض' : 'ارتفاع'}`, 'info');
  });
  if (toggleThemeBtn) toggleThemeBtn.addEventListener('click', () => {
    readerState.theme = readerState.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.style.setProperty('--primary-bg', readerState.theme === 'dark' ? '#0a0a0a' : '#f5f5f5');
    document.documentElement.style.setProperty('--secondary-bg', readerState.theme === 'dark' ? '#121212' : '#ffffff');
    document.documentElement.style.setProperty('--card-bg', readerState.theme === 'dark' ? '#1a1a1a' : '#f0f0f0');
    showNotification(`تم التبديل إلى ${readerState.theme === 'dark' ? 'الوضع الليلي' : 'الوضع النهاري'}`, 'success');
  });
  if (prevChapterBtn) prevChapterBtn.addEventListener('click', () => navigateChapter('prev'));
  if (nextChapterBtn) nextChapterBtn.addEventListener('click', () => navigateChapter('next'));
  if (readerSettingsBtn) readerSettingsBtn.addEventListener('click', () => {
    showNotification('إعدادات القارئ قريباً', 'info');
  });
  
  // إضافة مستمعي الأحداث للبحث
  if (searchBtnMain) searchBtnMain.addEventListener('click', handleSearch);
  if (searchInput) searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
  
  // إضافة مستمعي الأحداث للزر الرئيسي
  document.querySelector('[data-action="open-search"]')?.addEventListener('click', () => switchView('search'));
  
  // تهيئة التبويبات
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      this.classList.add('active');
      document.querySelector(`.tab-content[data-content="${this.dataset.tab}"]`).classList.add('active');
    });
  });
});