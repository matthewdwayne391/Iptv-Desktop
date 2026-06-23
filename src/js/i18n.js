/**
 * Internationalization — Arabic & English
 */

const TRANSLATIONS = {
  en: {
    appName: 'IPTV Desktop Player',
    // Navigation
    liveTV: 'Live TV',
    movies: 'Movies',
    series: 'Series',
    favorites: 'Favorites',
    settings: 'Settings',
    // Login
    loginTitle: 'Add Account',
    xtreamCodes: 'Xtream Codes',
    m3uUrl: 'M3U URL',
    localFile: 'Local File',
    serverUrl: 'Server URL',
    username: 'Username',
    password: 'Password',
    playlistUrl: 'Playlist URL',
    chooseFile: 'Choose File',
    connect: 'Connect',
    connecting: 'Connecting…',
    savedAccounts: 'Saved Accounts',
    noAccounts: 'No saved accounts',
    addAccount: 'Add Account',
    removeAccount: 'Remove Account',
    // Player
    nowPlaying: 'Now Playing',
    noChannel: 'No channel selected',
    loading: 'Loading…',
    error: 'Stream error. Retrying…',
    fullscreen: 'Fullscreen',
    volume: 'Volume',
    // Channels
    allCategories: 'All',
    search: 'Search…',
    searchChannels: 'Search channels…',
    searchMovies: 'Search movies…',
    searchSeries: 'Search series…',
    noResults: 'No results found',
    addFavorite: 'Add to Favorites',
    removeFavorite: 'Remove from Favorites',
    // Favorites
    noFavorites: 'No favorites yet',
    // EPG
    epgNow: 'Now',
    epgNext: 'Next',
    noEpg: 'No EPG data',
    // Settings
    settingsTitle: 'Settings',
    connectionSection: 'Connection',
    appearanceSection: 'Appearance',
    playerSection: 'Player',
    accountSection: 'Account',
    language: 'Language',
    theme: 'Theme',
    themeDark: 'Dark',
    themeLight: 'Light',
    bufferSize: 'Buffer Size (seconds)',
    quality: 'Preferred Quality',
    qualityAuto: 'Auto',
    qualityHigh: 'High',
    qualityMedium: 'Medium',
    qualityLow: 'Low',
    autoReconnect: 'Auto Reconnect',
    epgUrl: 'EPG URL (XMLTV)',
    logoCache: 'Cache Channel Logos',
    clearCache: 'Clear Logo Cache',
    clearCacheDone: 'Cache cleared',
    removeAllAccounts: 'Remove All Accounts',
    removeAccountConfirm: 'Remove this account?',
    refreshPlaylist: 'Refresh Playlist',
    refreshing: 'Refreshing…',
    refreshDone: 'Playlist updated',
    save: 'Save Settings',
    saved: 'Saved!',
    // Errors
    errServer: 'Cannot reach server. Check URL.',
    errCredentials: 'Invalid username or password.',
    errM3U: 'Failed to load M3U playlist.',
    errStream: 'Cannot play this stream.',
    errNoFile: 'No file selected.',
    // Misc
    episodes: 'Episodes',
    season: 'Season',
    rating: 'Rating',
    year: 'Year',
    genre: 'Genre',
    duration: 'Duration',
    back: 'Back',
    close: 'Close',
    ok: 'OK',
    cancel: 'Cancel',
    yes: 'Yes',
    no: 'No',
  },
  ar: {
    appName: 'مشغل IPTV',
    liveTV: 'البث المباشر',
    movies: 'الأفلام',
    series: 'المسلسلات',
    favorites: 'المفضلة',
    settings: 'الإعدادات',
    loginTitle: 'إضافة حساب',
    xtreamCodes: 'Xtream Codes',
    m3uUrl: 'رابط M3U',
    localFile: 'ملف محلي',
    serverUrl: 'عنوان السيرفر',
    username: 'اسم المستخدم',
    password: 'كلمة المرور',
    playlistUrl: 'رابط القائمة',
    chooseFile: 'اختر ملفاً',
    connect: 'اتصال',
    connecting: 'جارٍ الاتصال…',
    savedAccounts: 'الحسابات المحفوظة',
    noAccounts: 'لا توجد حسابات محفوظة',
    addAccount: 'إضافة حساب',
    removeAccount: 'حذف الحساب',
    nowPlaying: 'يعمل الآن',
    noChannel: 'لم يتم اختيار قناة',
    loading: 'جارٍ التحميل…',
    error: 'خطأ في البث. إعادة المحاولة…',
    fullscreen: 'ملء الشاشة',
    volume: 'الصوت',
    allCategories: 'الكل',
    search: 'بحث…',
    searchChannels: 'بحث عن قنوات…',
    searchMovies: 'بحث عن أفلام…',
    searchSeries: 'بحث عن مسلسلات…',
    noResults: 'لا توجد نتائج',
    addFavorite: 'إضافة للمفضلة',
    removeFavorite: 'إزالة من المفضلة',
    noFavorites: 'لا توجد مفضلة بعد',
    epgNow: 'الآن',
    epgNext: 'التالي',
    noEpg: 'لا تتوفر بيانات EPG',
    settingsTitle: 'الإعدادات',
    connectionSection: 'الاتصال',
    appearanceSection: 'المظهر',
    playerSection: 'المشغل',
    accountSection: 'الحساب',
    language: 'اللغة',
    theme: 'السمة',
    themeDark: 'داكن',
    themeLight: 'فاتح',
    bufferSize: 'حجم المخزن المؤقت (ثانية)',
    quality: 'الجودة المفضلة',
    qualityAuto: 'تلقائي',
    qualityHigh: 'عالية',
    qualityMedium: 'متوسطة',
    qualityLow: 'منخفضة',
    autoReconnect: 'إعادة الاتصال التلقائي',
    epgUrl: 'رابط EPG (XMLTV)',
    logoCache: 'تخزين شعارات القنوات',
    clearCache: 'مسح الذاكرة المؤقتة',
    clearCacheDone: 'تم مسح الذاكرة',
    removeAllAccounts: 'حذف جميع الحسابات',
    removeAccountConfirm: 'حذف هذا الحساب؟',
    refreshPlaylist: 'تحديث القائمة',
    refreshing: 'جارٍ التحديث…',
    refreshDone: 'تم تحديث القائمة',
    save: 'حفظ الإعدادات',
    saved: 'تم الحفظ!',
    errServer: 'تعذر الوصول للسيرفر. تحقق من الرابط.',
    errCredentials: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
    errM3U: 'فشل تحميل قائمة M3U.',
    errStream: 'لا يمكن تشغيل هذا البث.',
    errNoFile: 'لم يتم اختيار ملف.',
    episodes: 'حلقات',
    season: 'موسم',
    rating: 'التقييم',
    year: 'السنة',
    genre: 'النوع',
    duration: 'المدة',
    back: 'رجوع',
    close: 'إغلاق',
    ok: 'موافق',
    cancel: 'إلغاء',
    yes: 'نعم',
    no: 'لا',
  }
};

class I18n {
  constructor() {
    this.lang = 'en';
  }

  setLang(lang) {
    this.lang = lang === 'ar' ? 'ar' : 'en';
    document.documentElement.setAttribute('lang', this.lang);
    document.documentElement.setAttribute('dir', this.lang === 'ar' ? 'rtl' : 'ltr');
    document.body.classList.toggle('rtl', this.lang === 'ar');
  }

  t(key) {
    return TRANSLATIONS[this.lang][key] || TRANSLATIONS.en[key] || key;
  }

  getLang() {
    return this.lang;
  }
}

window.i18n = new I18n();
