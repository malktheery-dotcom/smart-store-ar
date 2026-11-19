/**
 * ==========================================================================
 * SmartStore - المنطق البرمجي للمتجر الرئيسي (JavaScript ES6+)
 * متصل بقاعدة بيانات Supabase السحابية مع مزامنة فورية وتخزين محلي احتياطي
 * ==========================================================================
 */

// إعدادات وتكامل قاعدة بيانات Supabase السحابية
const SUPABASE_CONFIG = {
  URL: "https://azzptkuegktwajspzdad.supabase.co",
  KEY: "sb_publishable_DnJWFF8yGYmIBSUMJNTStQ_gsD_xkcH"
};

let supabaseClient = null;
if (typeof window !== "undefined" && window.supabase && typeof window.supabase.createClient === "function") {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);
  } catch (err) {
    console.warn("تعذر إنشاء اتصال Supabase:", err);
  }
}

// مفاتيح التخزين وقيم الإعدادات الافتراضية
const STORAGE_KEYS = {
  PRODUCTS: "smartstore_products",
  CART: "smartstore_cart",
  SETTINGS: "smartstore_settings",
  PIN: "smartstore_admin_pin",
  COUPONS: "smartstore_coupons",
  APPLIED_COUPON: "smartstore_applied_coupon"
};

const DEFAULT_SETTINGS = {
  storePhone: "966501234567",
  currency: "ر.س",
  codEnabled: true,
  bankEnabled: true,
  bankDetails: "البنك الأهلي السعودي: SA1234567890123456789012 (باسم: متجر بوسلطان)\nمصرف الراجحي: SA9876543210987654321098\nمحفظة STC Pay / كاش: 0501234567",
  bannerEnabled: true,
  bannerBadge: "عروض الموسم الحصرية",
  bannerTitle: "تسوق أفضل المنتجات العصرية <span>بضغطة زر واحدة</span>",
  bannerSubtitle: "اكتشف تشكيلتنا المختارة بعناية من أحدث الإلكترونيات، العطور الفاخرة، والأزياء، مع إمكانية إتمام طلبك فوراً وبسهولة عبر واتساب."
};

const DEFAULT_PIN = "maeen41";

// كوبونات الخصم النموذجية الأولية
const DEFAULT_COUPONS = [
  { code: "SULTAN10", discount: 10 },
  { code: "RAMADAN15", discount: 15 }
];

function loadCoupons() {
  const stored = localStorage.getItem(STORAGE_KEYS.COUPONS);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(DEFAULT_COUPONS));
  return [...DEFAULT_COUPONS];
}

function saveCoupons(couponsList) {
  localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(couponsList));
}

function loadAppliedCoupon() {
  const stored = localStorage.getItem(STORAGE_KEYS.APPLIED_COUPON);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function saveAppliedCoupon(coupon) {
  if (coupon) {
    localStorage.setItem(STORAGE_KEYS.APPLIED_COUPON, JSON.stringify(coupon));
  } else {
    localStorage.removeItem(STORAGE_KEYS.APPLIED_COUPON);
  }
}

function loadStoreSettings() {
  const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (stored) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch (e) {
      return { ...DEFAULT_SETTINGS };
    }
  }
  return { ...DEFAULT_SETTINGS };
}

function saveStoreSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

function getAdminPin() {
  return localStorage.getItem(STORAGE_KEYS.PIN) || DEFAULT_PIN;
}

async function setAdminPin(newPin) {
  localStorage.setItem(STORAGE_KEYS.PIN, newPin);
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from("settings")
        .update({ admin_pin: newPin })
        .eq("id", "general");
      if (!error) {
        console.log("[Supabase] تم حفظ رمز المرور السحابي بنجاح");
      }
    } catch (err) {
      console.warn("تعذر تحديث رمز المرور في السحابة:", err);
    }
  }
}

let storeSettings = loadStoreSettings();
let appliedCoupon = loadAppliedCoupon();

// إعدادات المتجر الديناميكية
const CONFIG = {
  get STORE_PHONE() { return storeSettings.storePhone || DEFAULT_SETTINGS.storePhone; },
  get CURRENCY() { return storeSettings.currency || DEFAULT_SETTINGS.currency; },
  get COD_ENABLED() { return storeSettings.codEnabled !== false; },
  get BANK_ENABLED() { return storeSettings.bankEnabled !== false; },
  get BANK_DETAILS() { return storeSettings.bankDetails || DEFAULT_SETTINGS.bankDetails; },
  get BANNER_ENABLED() { return storeSettings.bannerEnabled !== false; },
  get BANNER_BADGE() { return storeSettings.bannerBadge || DEFAULT_SETTINGS.bannerBadge; },
  get BANNER_TITLE() { return storeSettings.bannerTitle || DEFAULT_SETTINGS.bannerTitle; },
  get BANNER_SUBTITLE() { return storeSettings.bannerSubtitle || DEFAULT_SETTINGS.bannerSubtitle; },
  PRODUCTS_KEY: STORAGE_KEYS.PRODUCTS,
  CART_KEY: STORAGE_KEYS.CART,
  SETTINGS_KEY: STORAGE_KEYS.SETTINGS,
  PIN_KEY: STORAGE_KEYS.PIN,
  COUPONS_KEY: STORAGE_KEYS.COUPONS
};

// المنتجات الافتراضية الأولية (6 منتجات نموذجية عالية الجودة)
const DEFAULT_PRODUCTS = [
  {
    id: "prod_1",
    name: "ساعة ذكية ألترا مقاومة للماء",
    category: "electronics",
    categoryName: "إلكترونيات",
    price: 349,
    oldPrice: 480,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80",
    description: "شاشة AMOLED بدقة عالية، تتبع دقات القلب، بطارية تدوم حتى 7 أيام."
  },
  {
    id: "prod_2",
    name: "سماعات رأس لاسلكية مانعة للضوضاء",
    category: "electronics",
    categoryName: "إلكترونيات",
    price: 499,
    oldPrice: 650,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=80",
    description: "صوت نقي محيطي بتقنية إلغاء الضجيج النشط مع ميكروفون مدمج عالي الوضوح."
  },
  {
    id: "prod_3",
    name: "عطر العود والمسك الملكي الفاخر",
    category: "perfumes",
    categoryName: "عطور",
    price: 279,
    oldPrice: 380,
    image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=700&q=80",
    description: "مزيج ساحر من دهن العود الكمبودي الفاخر مع لمسات العنبر والمسك الأبيض."
  },
  {
    id: "prod_4",
    name: "حذاء رياضي خفيف ومريح للمشي",
    category: "fashion",
    categoryName: "أزياء",
    price: 189,
    oldPrice: 240,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=80",
    description: "تصميم مريح للقدمين يوفر دعماً فائقاً أثناء الجري والمشي طوال اليوم."
  },
  {
    id: "prod_5",
    name: "نظارة شمسية كلاسيكية بولارايزد",
    category: "accessories",
    categoryName: "إكسسوارات",
    price: 145,
    oldPrice: 195,
    image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=700&q=80",
    description: "عدسات مستقطبة للحماية الكاملة من الأشعة فوق البنفسجية UV400 مع إطار معدني خفيف."
  },
  {
    id: "prod_6",
    name: "حقيبة ظهر جلدية أنيقة ومقاومة للماء",
    category: "accessories",
    categoryName: "إكسسوارات",
    price: 219,
    oldPrice: 290,
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=80",
    description: "مقصورة مخصصة للابتوب حتى 15.6 بوصة، جيوب أمان مخفية، وجلد صناعي فاخر."
  }
];

// حالة التطبيق (State)
let products = [];
let cart = [];
let orders = [];
let activeCategory = "all";
let searchQuery = "";

// عناصر الواجهة (DOM Elements)
const DOM = {
  // عناصر المتجر الرئيسي
  productsGrid: document.getElementById("productsGrid"),
  searchQueryInput: document.getElementById("searchQueryInput"),
  categoryButtons: document.querySelectorAll(".category-btn"),
  cartToggleBtn: document.getElementById("cartToggleBtn"),
  cartBadge: document.getElementById("cartBadge"),
  cartOverlay: document.getElementById("cartOverlay"),
  cartDrawer: document.getElementById("cartDrawer"),
  closeCartBtn: document.getElementById("closeCartBtn"),
  cartItemsContainer: document.getElementById("cartItemsContainer"),
  cartSubtotal: document.getElementById("cartSubtotal"),
  cartTotal: document.getElementById("cartTotal"),
  cartDrawerCount: document.getElementById("cartDrawerCount"),
  checkoutOpenBtn: document.getElementById("checkoutOpenBtn"),
  clearCartBtn: document.getElementById("clearCartBtn"),
  btnInstallPwa: document.getElementById("btnInstallPwa"),

  // بنر العروض الترويجي العلوي
  heroSection: document.getElementById("heroSection"),
  heroBadgeText: document.getElementById("heroBadgeText"),
  heroTitleText: document.getElementById("heroTitleText"),
  heroSubtitleText: document.getElementById("heroSubtitleText"),
  btnHeroOffers: document.getElementById("btnHeroOffers"),
  
  // مودال إتمام الطلب
  checkoutModal: document.getElementById("checkoutModal"),
  closeModalBtn: document.getElementById("closeModalBtn"),
  checkoutForm: document.getElementById("checkoutForm"),
  modalTotalAmount: document.getElementById("modalTotalAmount"),
  modalItemsCount: document.getElementById("modalItemsCount"),
  
  // حاوية الإشعارات
  toastContainer: document.getElementById("toastContainer"),

  // عناصر لوحة التحكم (Admin Panel)
  adminProductForm: document.getElementById("adminProductForm"),
  adminProductId: document.getElementById("adminProductId"),
  adminProductName: document.getElementById("adminProductName"),
  adminProductPrice: document.getElementById("adminProductPrice"),
  adminProductOldPrice: document.getElementById("adminProductOldPrice"),
  adminProductCategory: document.getElementById("adminProductCategory"),
  adminProductIsOffer: document.getElementById("adminProductIsOffer"),
  adminProductImage: document.getElementById("adminProductImage"),
  adminProductDesc: document.getElementById("adminProductDesc"),
  adminImagePreview: document.getElementById("adminImagePreview"),
  adminImagePlaceholder: document.getElementById("adminImagePlaceholder"),
  adminFormTitle: document.getElementById("adminFormTitle"),
  adminSubmitBtnText: document.getElementById("adminSubmitBtnText"),
  btnCancelEdit: document.getElementById("btnCancelEdit"),
  btnResetDefaults: document.getElementById("btnResetDefaults"),
  adminProductsTableBody: document.getElementById("adminProductsTableBody"),
  adminSearchInput: document.getElementById("adminSearchInput"),
  adminCategoryFilter: document.getElementById("adminCategoryFilter"),
  statTotalProducts: document.getElementById("statTotalProducts"),
  statTotalCategories: document.getElementById("statTotalCategories"),
  statAvgPrice: document.getElementById("statAvgPrice"),
  adminPriceCurrency: document.getElementById("adminPriceCurrency"),

  // شاشة القفل وإعدادات المتجر وتغيير الرمز
  adminLockScreen: document.getElementById("adminLockScreen"),
  lockScreenForm: document.getElementById("lockScreenForm"),
  adminPinInput: document.getElementById("adminPinInput"),
  pinErrorMessage: document.getElementById("pinErrorMessage"),
  btnLockDashboard: document.getElementById("btnLockDashboard"),
  storeSettingsForm: document.getElementById("storeSettingsForm"),
  settingsStorePhone: document.getElementById("settingsStorePhone"),
  settingsCurrency: document.getElementById("settingsCurrency"),
  settingsCodEnabled: document.getElementById("settingsCodEnabled"),
  settingsBankEnabled: document.getElementById("settingsBankEnabled"),
  settingsBankDetails: document.getElementById("settingsBankDetails"),

  // إدارة بنر عروض الموسم
  bannerSettingsSection: document.getElementById("bannerSettingsSection"),
  bannerSettingsForm: document.getElementById("bannerSettingsForm"),
  settingsBannerEnabled: document.getElementById("settingsBannerEnabled"),
  settingsBannerBadge: document.getElementById("settingsBannerBadge"),
  settingsBannerTitle: document.getElementById("settingsBannerTitle"),
  settingsBannerSubtitle: document.getElementById("settingsBannerSubtitle"),
  changePinModal: document.getElementById("changePinModal"),
  btnOpenChangePin: document.getElementById("btnOpenChangePin"),
  closePinModalBtn: document.getElementById("closePinModalBtn"),
  changePinForm: document.getElementById("changePinForm"),
  currentPinInput: document.getElementById("currentPinInput"),
  newPinInput: document.getElementById("newPinInput"),
  confirmPinInput: document.getElementById("confirmPinInput"),

  // إدارة الطلبات في لوحة التحكم
  statTotalOrders: document.getElementById("statTotalOrders"),
  ordersSection: document.getElementById("ordersSection"),
  ordersCountBadge: document.getElementById("ordersCountBadge"),
  ordersTableBody: document.getElementById("ordersTableBody"),
  btnRefreshOrders: document.getElementById("btnRefreshOrders"),

  // خيارات الدفع في سلة الشراء ومودال الطلب
  paymentSelectionGroup: document.getElementById("paymentSelectionGroup"),
  payMethodCodCard: document.getElementById("payMethodCodCard"),
  payMethodBankCard: document.getElementById("payMethodBankCard"),
  payMethodCod: document.getElementById("payMethodCod"),
  payMethodBank: document.getElementById("payMethodBank"),
  bankDetailsCheckoutBox: document.getElementById("bankDetailsCheckoutBox"),
  bankDetailsDisplay: document.getElementById("bankDetailsDisplay"),
  btnCopyBankDetails: document.getElementById("btnCopyBankDetails"),
  transferReference: document.getElementById("transferReference"),

  // كوبونات الخصم في المتجر
  couponCodeInput: document.getElementById("couponCodeInput"),
  btnApplyCoupon: document.getElementById("btnApplyCoupon"),
  couponInputGroup: document.getElementById("couponInputGroup"),
  appliedCouponTag: document.getElementById("appliedCouponTag"),
  appliedCouponText: document.getElementById("appliedCouponText"),
  btnRemoveCoupon: document.getElementById("btnRemoveCoupon"),
  cartDiscountRow: document.getElementById("cartDiscountRow"),
  cartDiscountAmount: document.getElementById("cartDiscountAmount"),
  modalDiscountRow: document.getElementById("modalDiscountRow"),
  modalDiscountAmount: document.getElementById("modalDiscountAmount"),

  // كوبونات الخصم في لوحة التحكم
  couponForm: document.getElementById("couponForm"),
  couponCodeInputAdmin: document.getElementById("couponCodeInputAdmin"),
  couponDiscountInputAdmin: document.getElementById("couponDiscountInputAdmin"),
  couponsTableBody: document.getElementById("couponsTableBody")
};

// ==========================================================================
// 1. التهيئة والتحميل (Initialization)
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

function initApp() {
  loadProducts();
  loadCart();
  syncSettingsFromSupabase();
  syncCouponsFromSupabase();
  setupSupabaseRealtime();
  setupPwa();

  // تفعيل واجهة المتجر إن كانت الصفحة هي المتجر
  if (DOM.productsGrid) {
    setupEventListeners();
    setupCartCouponEvents();
    setupCheckoutPaymentEvents();
    renderHeroBanner();
    renderProducts();
    updateCartUI();
  }

  // تفعيل شاشة القفل وإعدادات لوحة التحكم إن وجدت
  if (DOM.adminLockScreen) {
    setupLockScreen();
  }
  if (DOM.storeSettingsForm) {
    setupStoreSettings();
  }
  if (DOM.bannerSettingsForm) {
    setupBannerSettings();
  }
  if (DOM.couponForm) {
    setupCouponAdmin();
  }

  // تفعيل إدارة الطلبات في لوحة التحكم
  if (DOM.ordersTableBody) {
    loadOrders();
    if (DOM.btnRefreshOrders) {
      DOM.btnRefreshOrders.addEventListener("click", () => {
        loadOrders(true);
      });
    }
  }

  // تفعيل واجهة لوحة التحكم إن كانت الصفحة هي لوحة التحكم
  if (DOM.adminProductForm) {
    setupAdminEventListeners();
    renderAdminProducts();
  }

  // مزامنة فورية بين التبويبات المتعددة عبر حدث التخزين (Storage Event)
  window.addEventListener("storage", (e) => {
    if (e.key === CONFIG.PRODUCTS_KEY) {
      loadProducts();
      if (DOM.productsGrid) renderProducts();
      if (DOM.adminProductForm) renderAdminProducts();
    }
    if (e.key === CONFIG.SETTINGS_KEY) {
      storeSettings = loadStoreSettings();
      if (DOM.heroSection) renderHeroBanner();
      if (DOM.productsGrid) {
        renderProducts();
        updateCartUI();
      }
      if (DOM.storeSettingsForm) {
        populateStoreSettingsForm();
      }
      if (DOM.bannerSettingsForm) {
        populateBannerSettingsForm();
      }
      if (DOM.adminProductForm) {
        renderAdminProducts();
      }
    }
    if (e.key === CONFIG.COUPONS_KEY) {
      if (DOM.couponsTableBody) renderAdminCoupons();
      if (DOM.productsGrid) updateCartUI();
    }
  });
}

/**
 * جلب المنتجات من سحابة Supabase مع استخدام الذاكرة المحلية كبديل فوري
 */
async function loadProducts() {
  loadProductsFromLocal();

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        products = data.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          categoryName: item.category_name || getCategoryLabel(item.category),
          price: Number(item.price),
          oldPrice: item.old_price ? Number(item.old_price) : null,
          image: item.image,
          description: item.description
        }));
        saveProducts();
        if (DOM.productsGrid) renderProducts();
        if (DOM.adminProductsTableBody) renderAdminProducts();
      }
    } catch (err) {
      console.warn("خطأ في جلب المنتجات من Supabase:", err);
    }
  }
}

function loadProductsFromLocal() {
  const stored = localStorage.getItem(CONFIG.PRODUCTS_KEY);
  if (stored) {
    try {
      products = JSON.parse(stored);
      if (!Array.isArray(products) || products.length === 0) {
        products = [...DEFAULT_PRODUCTS];
        saveProducts();
      }
    } catch (e) {
      products = [...DEFAULT_PRODUCTS];
      saveProducts();
    }
  } else {
    products = [...DEFAULT_PRODUCTS];
    saveProducts();
  }
}

function saveProducts() {
  localStorage.setItem(CONFIG.PRODUCTS_KEY, JSON.stringify(products));
}

/**
 * جلب عناصر السلة من LocalStorage
 */
function loadCart() {
  const storedCart = localStorage.getItem(CONFIG.CART_KEY);
  if (storedCart) {
    try {
      cart = JSON.parse(storedCart);
      if (!Array.isArray(cart)) cart = [];
    } catch (e) {
      cart = [];
    }
  } else {
    cart = [];
  }
}

function saveCart() {
  localStorage.setItem(CONFIG.CART_KEY, JSON.stringify(cart));
}

// ==========================================================================
// 2. إدارة الأحداث والتفاعل (Event Listeners)
// ==========================================================================
function setupEventListeners() {
  // أزرار التصنيفات
  DOM.categoryButtons = document.querySelectorAll(".category-btn");
  DOM.categoryButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      DOM.categoryButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = btn.getAttribute("data-category");
      renderProducts();
    });
  });

  // زر تصفح عروض الموسم في البنر العلوي
  if (DOM.btnHeroOffers) {
    DOM.btnHeroOffers.addEventListener("click", filterToSeasonOffers);
  }

  // البحث الفوري
  if (DOM.searchQueryInput) {
    DOM.searchQueryInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderProducts();
    });
  }

  // فتح وإغلاق السلة الجانبية
  if (DOM.cartToggleBtn) DOM.cartToggleBtn.addEventListener("click", openCart);
  if (DOM.closeCartBtn) DOM.closeCartBtn.addEventListener("click", closeCart);
  if (DOM.cartOverlay) DOM.cartOverlay.addEventListener("click", closeCart);

  // إفراغ السلة
  if (DOM.clearCartBtn) {
    DOM.clearCartBtn.addEventListener("click", () => {
      if (cart.length === 0) return;
      if (confirm("هل أنت متأكد من رغبتك في تفريغ سلة المشتريات بالكامل؟")) {
        cart = [];
        saveCart();
        updateCartUI();
        showToast("تم تفريغ السلة بنجاح", "info");
      }
    });
  }

  // فتح نافذة إتمام الطلب
  if (DOM.checkoutOpenBtn) {
    DOM.checkoutOpenBtn.addEventListener("click", () => {
      if (cart.length === 0) {
        showToast("سلة المشتريات فارغة!", "danger");
        return;
      }
      closeCart();
      openCheckoutModal();
    });
  }

  // إغلاق نافذة إتمام الطلب
  if (DOM.closeModalBtn) DOM.closeModalBtn.addEventListener("click", closeCheckoutModal);
  if (DOM.checkoutModal) {
    DOM.checkoutModal.addEventListener("click", (e) => {
      if (e.target === DOM.checkoutModal) closeCheckoutModal();
    });
  }

  // إرسال نموذج إتمام الطلب
  if (DOM.checkoutForm) {
    DOM.checkoutForm.addEventListener("submit", handleOrderSubmit);
  }

  // إغلاق النوافذ عند الضغط على زر Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeCart();
      closeCheckoutModal();
    }
  });
}

// ==========================================================================
// 3. عرض البنر العلوي والمنتجات في الشبكة (Render Banner & Products)
// ==========================================================================

function renderHeroBanner() {
  if (!DOM.heroSection) return;

  if (CONFIG.BANNER_ENABLED) {
    DOM.heroSection.style.display = "";
    if (DOM.heroBadgeText) DOM.heroBadgeText.textContent = CONFIG.BANNER_BADGE;
    if (DOM.heroTitleText) DOM.heroTitleText.innerHTML = CONFIG.BANNER_TITLE;
    if (DOM.heroSubtitleText) DOM.heroSubtitleText.textContent = CONFIG.BANNER_SUBTITLE;
  } else {
    DOM.heroSection.style.display = "none";
  }
}

function filterToSeasonOffers() {
  activeCategory = "offers";

  DOM.categoryButtons = document.querySelectorAll(".category-btn");
  if (DOM.categoryButtons) {
    DOM.categoryButtons.forEach(btn => {
      if (btn.getAttribute("data-category") === "offers") {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  renderProducts();

  const target = document.getElementById("productsSection") || DOM.productsGrid;
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  showToast("تم تصفية المنتجات: عرض عروض وتخفيضات الموسم الحصرية 🔥", "info");
}

function renderProducts() {
  if (!DOM.productsGrid) return;

  // تصفية حسب التصنيف والبحث
  const filtered = products.filter(item => {
    let matchCategory = false;
    if (activeCategory === "all") {
      matchCategory = true;
    } else if (activeCategory === "offers") {
      matchCategory = item.category === "offers" || (item.oldPrice && Number(item.oldPrice) > Number(item.price));
    } else {
      matchCategory = item.category === activeCategory;
    }

    const matchSearch = item.name.toLowerCase().includes(searchQuery) || 
                        (item.description && item.description.toLowerCase().includes(searchQuery));
    return matchCategory && matchSearch;
  });

  if (filtered.length === 0) {
    DOM.productsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </div>
        <h3>لم يتم العثور على أي منتجات!</h3>
        <p>جرّب البحث بكلمة مختلفة أو اختر تصنيفاً آخر من القائمة أعلاه.</p>
      </div>
    `;
    return;
  }

  DOM.productsGrid.innerHTML = filtered.map(product => {
    // حساب نسبة الخصم إن وجد
    let discountHtml = "";
    if (product.oldPrice && product.oldPrice > product.price) {
      const discountPercent = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
      discountHtml = `<span class="discount-badge">خصم ${discountPercent}%</span>`;
    }

    const categoryLabel = getCategoryLabel(product.category);

    return `
      <article class="product-card" data-id="${product.id}">
        <div class="product-thumb-wrapper">
          <img src="${product.image}" alt="${product.name}" class="product-thumb" loading="lazy" onerror="this.src='https://placehold.co/400x300?text=منتج'">
          <div class="badge-wrapper">
            <span class="category-tag">${categoryLabel}</span>
            ${discountHtml}
          </div>
        </div>
        <div class="product-info">
          <h3 class="product-title">${product.name}</h3>
          <p class="product-description">${product.description || ""}</p>
          <div class="product-footer">
            <div class="price-container">
              <span class="current-price">${product.price} <span class="currency">${CONFIG.CURRENCY}</span></span>
              ${product.oldPrice ? `<span class="old-price">${product.oldPrice} ${CONFIG.CURRENCY}</span>` : ""}
            </div>
            <button class="btn-add-cart" onclick="addToCart('${product.id}')" title="إضافة إلى السلة">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <span>أضف للسلة</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function getCategoryLabel(catKey) {
  const map = {
    electronics: "إلكترونيات",
    perfumes: "عطور",
    fashion: "أزياء",
    accessories: "إكسسوارات",
    offers: "عروض الموسم 🔥"
  };
  return map[catKey] || catKey || "عام";
}

// ==========================================================================
// 4. إدارة السلة التفاعلية (Cart Operations)
// ==========================================================================

/**
 * إضافة منتج إلى السلة
 */
window.addToCart = function(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const existingItem = cart.find(item => item.id === productId);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1
    });
  }

  saveCart();
  updateCartUI();
  
  // تحريك شارة السلة
  animateBadge();
  showToast(`تمت إضافة "${product.name}" إلى السلة`, "success");
};

/**
 * تعديل كمية منتج في السلة
 */
window.updateCartQuantity = function(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    removeFromCart(productId, false);
    return;
  }

  saveCart();
  updateCartUI();
};

/**
 * حذف منتج من السلة
 */
window.removeFromCart = function(productId, showNotification = true) {
  const index = cart.findIndex(i => i.id === productId);
  if (index !== -1) {
    const removedName = cart[index].name;
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
    if (showNotification) {
      showToast(`تم حذف "${removedName}" من السلة`, "danger");
    }
  }
};

/**
 * تحديث واجهة السلة (العداد، القائمة، والمجموع)
 */
function updateCartUI() {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // حساب الخصم إذا كان هناك كوبون مطبق
  let discountAmount = 0;
  if (appliedCoupon && subtotal > 0) {
    const coupons = loadCoupons();
    const valid = coupons.find(c => c.code.toUpperCase() === appliedCoupon.code.toUpperCase());
    if (valid) {
      appliedCoupon.discount = valid.discount;
      discountAmount = Math.round((subtotal * appliedCoupon.discount) / 100);
    } else {
      appliedCoupon = null;
      saveAppliedCoupon(null);
    }
  }

  const finalTotal = Math.max(0, subtotal - discountAmount);

  // تحديث الشارة
  if (DOM.cartBadge) {
    DOM.cartBadge.textContent = totalItems;
    DOM.cartBadge.style.display = totalItems > 0 ? "inline-flex" : "none";
  }

  // تحديث عداد الهيدر في السلة
  if (DOM.cartDrawerCount) {
    DOM.cartDrawerCount.textContent = `(${totalItems})`;
  }

  // تحديث الأسعار
  if (DOM.cartSubtotal) DOM.cartSubtotal.textContent = `${subtotal} ${CONFIG.CURRENCY}`;
  if (DOM.cartTotal) DOM.cartTotal.textContent = `${finalTotal} ${CONFIG.CURRENCY}`;

  // تحديث سطر الخصم في السلة
  if (DOM.cartDiscountRow && DOM.cartDiscountAmount) {
    if (appliedCoupon && discountAmount > 0) {
      DOM.cartDiscountRow.style.display = "flex";
      DOM.cartDiscountAmount.textContent = `-${discountAmount} ${CONFIG.CURRENCY} (${appliedCoupon.discount}%)`;
    } else {
      DOM.cartDiscountRow.style.display = "none";
    }
  }

  // تحديث واجهة إدخال الكوبون
  if (DOM.couponInputGroup && DOM.appliedCouponTag) {
    if (appliedCoupon && subtotal > 0) {
      DOM.couponInputGroup.style.display = "none";
      DOM.appliedCouponTag.style.display = "flex";
      if (DOM.appliedCouponText) {
        DOM.appliedCouponText.innerHTML = `كوبون فعال: <strong>${appliedCoupon.code}</strong> (خصم ${appliedCoupon.discount}%)`;
      }
    } else {
      DOM.couponInputGroup.style.display = "flex";
      DOM.appliedCouponTag.style.display = "none";
      if (DOM.couponCodeInput) DOM.couponCodeInput.value = "";
    }
  }

  // تحديث عناصر السلة
  if (!DOM.cartItemsContainer) return;

  if (cart.length === 0) {
    DOM.cartItemsContainer.innerHTML = `
      <div class="cart-empty-message">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <h4>سلة المشتريات فارغة</h4>
        <p>تصفح المنتجات وأضف ما يعجبك إلى السلة الآن!</p>
      </div>
    `;
    if (DOM.checkoutOpenBtn) DOM.checkoutOpenBtn.disabled = true;
    return;
  }

  if (DOM.checkoutOpenBtn) DOM.checkoutOpenBtn.disabled = false;

  DOM.cartItemsContainer.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}" class="cart-item-img" onerror="this.src='https://placehold.co/100x100?text=منتج'">
      <div class="cart-item-details">
        <h4 class="cart-item-title">${item.name}</h4>
        <div class="cart-item-price">${item.price * item.quantity} ${CONFIG.CURRENCY}</div>
        <div class="cart-qty-controls">
          <button class="btn-qty" onclick="updateCartQuantity('${item.id}', -1)" title="تقليل الكمية">−</button>
          <span class="cart-item-quantity">${item.quantity}</span>
          <button class="btn-qty" onclick="updateCartQuantity('${item.id}', 1)" title="زيادة الكمية">+</button>
        </div>
      </div>
      <button class="btn-remove-item" onclick="removeFromCart('${item.id}')" title="حذف المنتج">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `).join("");
}

function openCart() {
  if (DOM.cartOverlay) DOM.cartOverlay.classList.add("active");
  if (DOM.cartDrawer) DOM.cartDrawer.classList.add("open");
  document.body.style.overflow = "hidden"; // منع التمرير الخلفي
}

function closeCart() {
  if (DOM.cartOverlay) DOM.cartOverlay.classList.remove("active");
  if (DOM.cartDrawer) DOM.cartDrawer.classList.remove("open");
  document.body.style.overflow = "";
}

window.openCart = openCart;
window.closeCart = closeCart;

function animateBadge() {
  if (!DOM.cartBadge) return;
  DOM.cartBadge.classList.remove("pop");
  void DOM.cartBadge.offsetWidth; // إعادة تشغيل الأنيميشن
  DOM.cartBadge.classList.add("pop");
}

// ==========================================================================
// 5. إتمام الطلب وتوليد رسالة واتساب (Checkout & WhatsApp)
// ==========================================================================
function setupCheckoutPaymentEvents() {
  const codRadio = DOM.payMethodCod;
  const bankRadio = DOM.payMethodBank;
  const codCard = DOM.payMethodCodCard;
  const bankCard = DOM.payMethodBankCard;
  const bankBox = DOM.bankDetailsCheckoutBox;

  function handleMethodChange() {
    if (bankRadio && bankRadio.checked) {
      if (bankCard) bankCard.classList.add("active");
      if (codCard) codCard.classList.remove("active");
      if (bankBox) {
        bankBox.style.display = "block";
        if (DOM.bankDetailsDisplay) {
          DOM.bankDetailsDisplay.textContent = CONFIG.BANK_DETAILS;
        }
      }
    } else {
      if (codCard) codCard.classList.add("active");
      if (bankCard) bankCard.classList.remove("active");
      if (bankBox) bankBox.style.display = "none";
    }
  }

  if (codRadio) codRadio.addEventListener("change", handleMethodChange);
  if (bankRadio) bankRadio.addEventListener("change", handleMethodChange);

  if (DOM.btnCopyBankDetails) {
    DOM.btnCopyBankDetails.addEventListener("click", () => {
      const detailsText = CONFIG.BANK_DETAILS;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(detailsText).then(() => {
          showToast("تم نسخ بيانات الحساب البنكي بنجاح!", "success");
        }).catch(() => {
          fallbackCopyText(detailsText);
        });
      } else {
        fallbackCopyText(detailsText);
      }
    });
  }
}

function fallbackCopyText(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand("copy");
    showToast("تم نسخ بيانات الحساب البنكي بنجاح!", "success");
  } catch (err) {
    showToast("يرجى تحديد النص ونسخه يدوياً", "info");
  }
  document.body.removeChild(textArea);
}

function setupPaymentMethodsInCheckout() {
  if (!DOM.paymentSelectionGroup) return;

  const codEnabled = CONFIG.COD_ENABLED;
  const bankEnabled = CONFIG.BANK_ENABLED;

  // إذا تم تعطيل كليهما نفعّل الدفع عند الاستلام افتراضياً لضمان استمرار المتجر
  const actualCod = codEnabled || (!codEnabled && !bankEnabled);
  const actualBank = bankEnabled;

  if (DOM.payMethodCodCard) {
    DOM.payMethodCodCard.style.display = actualCod ? "flex" : "none";
  }
  if (DOM.payMethodBankCard) {
    DOM.payMethodBankCard.style.display = actualBank ? "flex" : "none";
  }

  if (actualCod && !actualBank) {
    if (DOM.payMethodCod) DOM.payMethodCod.checked = true;
    if (DOM.payMethodCodCard) DOM.payMethodCodCard.classList.add("active");
    if (DOM.payMethodBankCard) DOM.payMethodBankCard.classList.remove("active");
    if (DOM.bankDetailsCheckoutBox) DOM.bankDetailsCheckoutBox.style.display = "none";
  } else if (!actualCod && actualBank) {
    if (DOM.payMethodBank) DOM.payMethodBank.checked = true;
    if (DOM.payMethodBankCard) DOM.payMethodBankCard.classList.add("active");
    if (DOM.payMethodCodCard) DOM.payMethodCodCard.classList.remove("active");
    if (DOM.bankDetailsCheckoutBox) {
      DOM.bankDetailsCheckoutBox.style.display = "block";
      if (DOM.bankDetailsDisplay) DOM.bankDetailsDisplay.textContent = CONFIG.BANK_DETAILS;
    }
  } else {
    // كلاهما مفعل
    if (DOM.payMethodBank && DOM.payMethodBank.checked) {
      if (DOM.payMethodBankCard) DOM.payMethodBankCard.classList.add("active");
      if (DOM.payMethodCodCard) DOM.payMethodCodCard.classList.remove("active");
      if (DOM.bankDetailsCheckoutBox) {
        DOM.bankDetailsCheckoutBox.style.display = "block";
        if (DOM.bankDetailsDisplay) DOM.bankDetailsDisplay.textContent = CONFIG.BANK_DETAILS;
      }
    } else {
      if (DOM.payMethodCod) DOM.payMethodCod.checked = true;
      if (DOM.payMethodCodCard) DOM.payMethodCodCard.classList.add("active");
      if (DOM.payMethodBankCard) DOM.payMethodBankCard.classList.remove("active");
      if (DOM.bankDetailsCheckoutBox) DOM.bankDetailsCheckoutBox.style.display = "none";
    }
  }
}

function openCheckoutModal() {
  if (!DOM.checkoutModal) return;

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = appliedCoupon ? Math.round((subtotal * appliedCoupon.discount) / 100) : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  if (DOM.modalItemsCount) DOM.modalItemsCount.textContent = `${totalItems} منتجات`;
  
  if (DOM.modalDiscountRow && DOM.modalDiscountAmount) {
    if (appliedCoupon && discountAmount > 0) {
      DOM.modalDiscountRow.style.display = "flex";
      DOM.modalDiscountAmount.textContent = `-${discountAmount} ${CONFIG.CURRENCY} (${appliedCoupon.code})`;
    } else {
      DOM.modalDiscountRow.style.display = "none";
    }
  }

  if (DOM.modalTotalAmount) DOM.modalTotalAmount.textContent = `${finalTotal} ${CONFIG.CURRENCY}`;

  // تحديث وتجهيز طرق الدفع المتاحة بناءً على إعدادات المتجر
  setupPaymentMethodsInCheckout();

  DOM.checkoutModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeCheckoutModal() {
  if (!DOM.checkoutModal) return;
  DOM.checkoutModal.classList.remove("active");
  document.body.style.overflow = "";
}

async function handleOrderSubmit(e) {
  e.preventDefault();

  if (cart.length === 0) {
    showToast("سلتك فارغة!", "danger");
    return;
  }

  const name = document.getElementById("customerName").value.trim();
  const phone = document.getElementById("customerPhone").value.trim();
  const address = document.getElementById("customerAddress").value.trim();
  const notes = document.getElementById("customerNotes").value.trim();

  if (!name || !phone || !address) {
    showToast("يرجى ملء جميع الحقول الإلزامية", "danger");
    return;
  }

  // التحقق من طريقة الدفع
  const selectedPaymentInput = document.querySelector('input[name="orderPaymentMethod"]:checked');
  const paymentMethod = selectedPaymentInput ? selectedPaymentInput.value : "الدفع عند الاستلام";
  const isBankTransfer = paymentMethod.includes("التحويل البنكي") || paymentMethod.includes("المحفظة");

  let transferRef = "";
  if (isBankTransfer) {
    if (DOM.transferReference) {
      transferRef = DOM.transferReference.value.trim();
    }
    if (!transferRef) {
      showToast("يرجى إدخال رقم الحوالة أو اسم المحول لإتمام الطلب!", "danger");
      if (DOM.transferReference) DOM.transferReference.focus();
      return;
    }
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = appliedCoupon ? Math.round((subtotal * appliedCoupon.discount) / 100) : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // إعداد بيانات الطلب لقاعدة بيانات Supabase
  let orderId = "SMT-" + Math.floor(100000 + Math.random() * 900000);
  const orderItemsData = cart.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    category: item.category,
    total: item.price * item.quantity
  }));

  const orderPayload = {
    customer_name: name,
    customer_phone: phone,
    customer_address: address,
    items: orderItemsData,
    total_amount: finalTotal,
    payment_method: paymentMethod,
    transfer_reference: isBankTransfer ? transferRef : null,
    status: "قيد المراجعة"
  };

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalBtnHtml = submitBtn ? submitBtn.innerHTML : "";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>جاري حفظ الطلب وتحويلك للواتساب...</span>`;
  }

  // حفظ الطلب أولاً في جدول orders في Supabase
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from("orders")
        .insert([orderPayload])
        .select()
        .single();

      if (!error && data) {
        orderId = data.id;
      } else if (error) {
        console.error("خطأ حفظ الطلب في Supabase:", error);
      }
    } catch (err) {
      console.warn("استثناء أثناء إدراج الطلب في Supabase:", err);
    }
  }

  const now = new Date();
  const orderDate = now.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });

  // صياغة رسالة واتساب منسقة وشاملة
  let message = `🛒 *طلب جديد من متجر بوسلطان*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🔖 *رقم الطلب:* #${orderId}\n`;
  message += `📅 *التاريخ:* ${orderDate}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `👤 *بيانات العميل:*\n`;
  message += `• *الاسم:* ${name}\n`;
  message += `• *رقم الهاتف:* ${phone}\n`;
  message += `• *العنوان / المدينة:* ${address}\n`;
  if (notes) {
    message += `• *ملاحظات:* ${notes}\n`;
  }
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📦 *تفاصيل المنتجات:*\n`;

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    message += `${index + 1}. *${item.name}*\n   الكمية: ${item.quantity} × ${item.price} = *${itemTotal} ${CONFIG.CURRENCY}*\n`;
  });

  if (appliedCoupon && discountAmount > 0) {
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `🎟️ *كوبون الخصم:* ${appliedCoupon.code} (خصم ${appliedCoupon.discount}%)\n`;
    message += `💸 *قيمة الخصم:* -${discountAmount} ${CONFIG.CURRENCY}\n`;
    message += `💵 *المجموع قبل الخصم:* ${subtotal} ${CONFIG.CURRENCY}\n`;
    message += `💰 *المجموع النهائي بعد الخصم:* *${finalTotal} ${CONFIG.CURRENCY}*\n`;
  } else {
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💰 *المجموع النهائي:* *${finalTotal} ${CONFIG.CURRENCY}*\n`;
  }

  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💳 *طريقة الدفع:* ${paymentMethod}\n`;
  if (isBankTransfer && transferRef) {
    message += `📄 *رقم الحوالة / اسم المحول:* ${transferRef}\n`;
  }
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `✨ يرجى تأكيد الطلب للبدء بالتجهيز والشحن، شكراً لكم!`;

  // رابط الواتساب المشفر
  const whatsappUrl = `https://wa.me/${CONFIG.STORE_PHONE}?text=${encodeURIComponent(message)}`;

  // فتح الواتساب عبر التطبيق الأصلي لنظام أندرويد (_system) أو نافذة جديدة في المتصفح
  try {
    const isCapacitor = typeof window.Capacitor !== "undefined" || !!window.androidBridge;
    if (isCapacitor) {
      window.open(whatsappUrl, "_system");
    } else {
      const opened = window.open(whatsappUrl, "_blank");
      if (!opened) {
        window.location.href = whatsappUrl;
      }
    }
  } catch (err) {
    window.location.href = whatsappUrl;
  }

  // إعادة زر الحفظ لحالته الأصلية
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;
  }

  // تفريغ السلة وتفريغ الكوبون المطبق وتحديث الواجهة
  cart = [];
  appliedCoupon = null;
  saveCart();
  saveAppliedCoupon(null);
  updateCartUI();

  // إغلاق المودال وتصفير النموذج
  closeCheckoutModal();
  DOM.checkoutForm.reset();
  if (DOM.transferReference) DOM.transferReference.value = "";

  showToast(`تم تسجيل طلبك #${orderId} وحفظه بنجاح! شكراً لتسوقك معنا.`, "success");
}

// ==========================================================================
// 6. نظام الإشعارات العائمة (Toast System)
// ==========================================================================
function showToast(message, type = "success") {
  if (!DOM.toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const iconSvg = type === "success" 
    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : type === "danger"
    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

  toast.innerHTML = `
    ${iconSvg}
    <span>${message}</span>
  `;

  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}


// ==========================================================================
// 7. إدارة لوحة التحكم (Admin Panel Operations)
// ==========================================================================

function setupAdminEventListeners() {
  // إرسال نموذج المنتج (إضافة أو تعديل)
  if (DOM.adminProductForm) {
    DOM.adminProductForm.addEventListener("submit", handleAdminFormSubmit);
  }

  // زر إلغاء وضع التعديل
  if (DOM.btnCancelEdit) {
    DOM.btnCancelEdit.addEventListener("click", cancelEdit);
  }

  // زر استعادة المنتجات الافتراضية
  if (DOM.btnResetDefaults) {
    DOM.btnResetDefaults.addEventListener("click", resetDefaultProducts);
  }

  // معاينة الصورة الحية عند كتابة أو لصق الرابط
  if (DOM.adminProductImage) {
    DOM.adminProductImage.addEventListener("input", (e) => {
      const url = e.target.value.trim();
      updateImagePreview(url);
    });
  }

  // البحث في جدول المنتجات
  if (DOM.adminSearchInput) {
    DOM.adminSearchInput.addEventListener("input", () => {
      renderAdminProducts();
    });
  }

  // التصفية حسب التصنيف في لوحة التحكم
  if (DOM.adminCategoryFilter) {
    DOM.adminCategoryFilter.addEventListener("change", () => {
      renderAdminProducts();
    });
  }

  // مزامنة تصنيف عروض الموسم مع مفتاح تمييز المنتج
  if (DOM.adminProductCategory) {
    DOM.adminProductCategory.addEventListener("change", () => {
      if (DOM.adminProductIsOffer) {
        if (DOM.adminProductCategory.value === "offers") {
          DOM.adminProductIsOffer.checked = true;
        }
      }
    });
  }

  if (DOM.adminProductIsOffer) {
    DOM.adminProductIsOffer.addEventListener("change", () => {
      if (DOM.adminProductIsOffer.checked && DOM.adminProductCategory) {
        if (DOM.adminProductCategory.value !== "offers") {
          DOM.adminProductCategory.value = "offers";
        }
      }
    });
  }
}

/**
 * تحديث مربع معاينة الصورة في النموذج
 */
function updateImagePreview(url) {
  if (!DOM.adminImagePreview || !DOM.adminImagePlaceholder) return;
  
  if (url) {
    DOM.adminImagePreview.src = url;
    DOM.adminImagePreview.style.display = "block";
    DOM.adminImagePlaceholder.style.display = "none";
    DOM.adminImagePreview.onerror = () => {
      DOM.adminImagePreview.style.display = "none";
      DOM.adminImagePlaceholder.style.display = "block";
      DOM.adminImagePlaceholder.textContent = "رابط غير صالح";
    };
  } else {
    DOM.adminImagePreview.style.display = "none";
    DOM.adminImagePlaceholder.style.display = "block";
    DOM.adminImagePlaceholder.textContent = "معاينة الصورة";
  }
}

/**
 * عرض المنتجات في جدول لوحة التحكم وحساب الإحصائيات
 */
function renderAdminProducts() {
  if (!DOM.adminProductsTableBody) return;

  const searchQuery = DOM.adminSearchInput ? DOM.adminSearchInput.value.trim().toLowerCase() : "";
  const categoryFilter = DOM.adminCategoryFilter ? DOM.adminCategoryFilter.value : "all";

  // تحديث بطاقات الإحصائيات
  updateAdminStats();

  // تصفية المنتجات
  const filtered = products.filter(product => {
    let matchCat = false;
    if (categoryFilter === "all") {
      matchCat = true;
    } else if (categoryFilter === "offers") {
      matchCat = product.category === "offers" || (product.oldPrice && Number(product.oldPrice) > Number(product.price));
    } else {
      matchCat = product.category === categoryFilter;
    }

    const matchSearch = product.name.toLowerCase().includes(searchQuery) ||
                        (product.description && product.description.toLowerCase().includes(searchQuery)) ||
                        product.id.toLowerCase().includes(searchQuery);
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    DOM.adminProductsTableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          لم يتم العثور على أي منتجات مطابقة في لوحة التحكم.
        </td>
      </tr>
    `;
    return;
  }

  DOM.adminProductsTableBody.innerHTML = filtered.map(product => {
    const categoryName = getCategoryLabel(product.category);
    return `
      <tr>
        <td>
          <div class="table-product-cell">
            <img src="${product.image}" alt="${product.name}" class="table-product-thumb" onerror="this.src='https://placehold.co/100x100?text=منتج'">
            <div>
              <div class="table-product-name">${product.name}</div>
              <div class="table-product-desc">${product.description || "بدون وصف"}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="category-tag" style="display: inline-block;">${categoryName}</span>
        </td>
        <td>
          <strong style="color: var(--dark); font-size: 1.05rem;">${product.price} ${CONFIG.CURRENCY}</strong>
          ${product.oldPrice ? `<div style="font-size: 0.8rem; color: var(--text-light); text-decoration: line-through;">${product.oldPrice} ${CONFIG.CURRENCY}</div>` : ""}
        </td>
        <td style="font-size: 0.82rem; color: var(--text-light); font-family: monospace;">${product.id}</td>
        <td>
          <div class="table-actions">
            <button class="btn-table-action edit" onclick="editProduct('${product.id}')" title="تعديل المنتج">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn-table-action delete" onclick="deleteProduct('${product.id}')" title="حذف المنتج">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

/**
 * تحديث إحصائيات لوحة التحكم
 */
function updateAdminStats() {
  if (DOM.statTotalProducts) {
    DOM.statTotalProducts.textContent = products.length;
  }

  if (DOM.statTotalCategories) {
    const categoriesSet = new Set(products.map(p => p.category));
    DOM.statTotalCategories.textContent = categoriesSet.size;
  }

  if (DOM.statAvgPrice) {
    if (products.length === 0) {
      DOM.statAvgPrice.textContent = `0 ${CONFIG.CURRENCY}`;
    } else {
      const avg = Math.round(products.reduce((acc, p) => acc + Number(p.price || 0), 0) / products.length);
      DOM.statAvgPrice.textContent = `${avg} ${CONFIG.CURRENCY}`;
    }
  }

  if (DOM.adminPriceCurrency) {
    DOM.adminPriceCurrency.textContent = CONFIG.CURRENCY;
  }
}

/**
 * معالجة حفظ المنتج (إضافة جديد أو تحديث موجود)
 */
async function handleAdminFormSubmit(e) {
  e.preventDefault();

  const id = DOM.adminProductId.value;
  const name = DOM.adminProductName.value.trim();
  const price = parseFloat(DOM.adminProductPrice.value);
  const oldPriceRaw = DOM.adminProductOldPrice.value.trim();
  const oldPrice = oldPriceRaw ? parseFloat(oldPriceRaw) : null;
  let category = DOM.adminProductCategory.value;
  const image = DOM.adminProductImage.value.trim();
  const description = DOM.adminProductDesc.value.trim();
  const isOfferChecked = DOM.adminProductIsOffer && DOM.adminProductIsOffer.checked;

  if (!name || isNaN(price) || !image) {
    showToast("يرجى التأكد من ملء الاسم، السعر، ورابط الصورة!", "danger");
    return;
  }

  // إذا تم تمييز المنتج ضمن عروض الموسم ولم يختر المستخدم offers كتصنيف، نجعله offers لضمان التوافق التام
  if (isOfferChecked && category !== "offers") {
    category = "offers";
  }

  if (id) {
    // وضع التعديل (Edit Mode)
    const productIndex = products.findIndex(p => p.id === id);
    if (productIndex !== -1) {
      products[productIndex] = {
        ...products[productIndex],
        name,
        price,
        oldPrice,
        category,
        image,
        description
      };

      // إذا كان المنتج موجوداً في السلة، حدّث بياناته أيضاً
      const cartItem = cart.find(c => c.id === id);
      if (cartItem) {
        cartItem.name = name;
        cartItem.price = price;
        cartItem.image = image;
        saveCart();
      }

      saveProducts();
      cancelEdit();
      renderAdminProducts();
      showToast(`تم تحديث بيانات المنتج "${name}" بنجاح`, "success");

      // مزامنة التحديث مع سحابة Supabase
      if (supabaseClient) {
        try {
          await supabaseClient.from("products").update({
            name,
            category,
            category_name: getCategoryLabel(category),
            price,
            old_price: oldPrice,
            image,
            description
          }).eq("id", id);
        } catch (err) {
          console.error("خطأ تحديث المنتج في Supabase:", err);
        }
      }
    }
  } else {
    // وضع الإضافة (Add Mode)
    const newProduct = {
      id: "prod_" + Date.now(),
      name,
      price,
      oldPrice,
      category,
      image,
      description
    };

    products.unshift(newProduct);
    saveProducts();
    DOM.adminProductForm.reset();
    if (DOM.adminProductIsOffer) DOM.adminProductIsOffer.checked = false;
    updateImagePreview("");
    renderAdminProducts();
    showToast(`تمت إضافة المنتج الجديد "${name}" بنجاح!`, "success");

    // الحفظ في سحابة Supabase
    if (supabaseClient) {
      try {
        await supabaseClient.from("products").insert([{
          id: newProduct.id,
          name: newProduct.name,
          category: newProduct.category,
          category_name: getCategoryLabel(newProduct.category),
          price: newProduct.price,
          old_price: newProduct.oldPrice,
          image: newProduct.image,
          description: newProduct.description
        }]);
      } catch (err) {
        console.error("خطأ إضافة المنتج إلى Supabase:", err);
      }
    }
  }
}

/**
 * بدء تعديل منتج
 */
function editProduct(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  DOM.adminProductId.value = product.id;
  DOM.adminProductName.value = product.name;
  DOM.adminProductPrice.value = product.price;
  DOM.adminProductOldPrice.value = product.oldPrice || "";
  DOM.adminProductCategory.value = product.category;
  DOM.adminProductImage.value = product.image;
  DOM.adminProductDesc.value = product.description || "";

  // تعيين حالة اختيار عروض الموسم
  const isOffer = product.category === "offers" || (product.oldPrice && Number(product.oldPrice) > Number(product.price));
  if (DOM.adminProductIsOffer) DOM.adminProductIsOffer.checked = Boolean(isOffer);

  updateImagePreview(product.image);

  if (DOM.adminFormTitle) {
    DOM.adminFormTitle.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
      <span>تعديل المنتج: ${product.name}</span>
    `;
  }

  if (DOM.adminSubmitBtnText) {
    DOM.adminSubmitBtnText.textContent = "حفظ التعديلات";
  }

  if (DOM.btnCancelEdit) {
    DOM.btnCancelEdit.style.display = "inline-flex";
  }

  // التمرير السلس إلى نموذج التعديل
  DOM.adminProductForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

/**
 * إلغاء وضع التعديل والعودة لوضع الإضافة
 */
function cancelEdit() {
  DOM.adminProductId.value = "";
  DOM.adminProductForm.reset();
  if (DOM.adminProductIsOffer) DOM.adminProductIsOffer.checked = false;
  updateImagePreview("");

  if (DOM.adminFormTitle) {
    DOM.adminFormTitle.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span>إضافة منتج جديد</span>
    `;
  }

  if (DOM.adminSubmitBtnText) {
    DOM.adminSubmitBtnText.textContent = "حفظ وإضافة المنتج";
  }

  if (DOM.btnCancelEdit) {
    DOM.btnCancelEdit.style.display = "none";
  }
}

/**
 * حذف منتج من لوحة التحكم والتخزين المحلي وقاعدة بيانات Supabase
 */
async function deleteProduct(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  if (confirm(`هل أنت متأكد من رغبتك في حذف المنتج: "${product.name}"؟`)) {
    products = products.filter(p => p.id !== productId);
    saveProducts();

    // إزالته أيضاً من السلة إن كان موجوداً
    removeFromCart(productId, false);

    // إذا كان نفس المنتج قيد التعديل، ألغِ التعديل
    if (DOM.adminProductId && DOM.adminProductId.value === productId) {
      cancelEdit();
    }

    renderAdminProducts();
    showToast(`تم حذف المنتج "${product.name}" بنجاح`, "danger");

    // الحذف من سحابة Supabase
    if (supabaseClient) {
      try {
        await supabaseClient.from("products").delete().eq("id", productId);
      } catch (err) {
        console.error("خطأ حذف المنتج من Supabase:", err);
      }
    }
  }
}

/**
 * إعادة ضبط المنتجات الافتراضية الأولية
 */
async function resetDefaultProducts() {
  if (confirm("هل تريد استعادة قائمة المنتجات الافتراضية الـ 6؟ سيتم استبدال أي تغييرات حالية.")) {
    products = [...DEFAULT_PRODUCTS];
    saveProducts();
    cancelEdit();
    renderAdminProducts();
    showToast("تمت استعادة المنتجات الافتراضية بنجاح!", "info");

    // الاستعادة في سحابة Supabase
    if (supabaseClient) {
      try {
        await supabaseClient.from("products").delete().neq("id", "none");
        await supabaseClient.from("products").insert(DEFAULT_PRODUCTS.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          category_name: p.categoryName,
          price: p.price,
          old_price: p.oldPrice,
          image: p.image,
          description: p.description
        })));
      } catch (err) {
        console.error("خطأ إعادة ضبط المنتجات في Supabase:", err);
      }
    }
  }
}

// تصدير الدوال إلى النطاق العام (Global Scope) للاستخدام في الأزرار
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.cancelEdit = cancelEdit;
window.resetDefaultProducts = resetDefaultProducts;


// ==========================================================================
// 8. شاشة القفل وإدارة رمز المرور (PIN Lock System)
// ==========================================================================

function setupLockScreen() {
  const isAuth = sessionStorage.getItem("smartstore_admin_auth") === "true";
  
  if (isAuth && DOM.adminLockScreen) {
    DOM.adminLockScreen.classList.add("unlocked");
  } else if (DOM.adminLockScreen) {
    DOM.adminLockScreen.classList.remove("unlocked");
    setTimeout(() => {
      if (DOM.adminPinInput) DOM.adminPinInput.focus();
    }, 150);
  }

  // معالجة إدخال الرمز لفتح القفل
  if (DOM.lockScreenForm) {
    DOM.lockScreenForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const enteredPin = DOM.adminPinInput ? DOM.adminPinInput.value.trim() : "";
      const validPin = getAdminPin();

      if (enteredPin === validPin) {
        sessionStorage.setItem("smartstore_admin_auth", "true");
        if (DOM.adminLockScreen) DOM.adminLockScreen.classList.add("unlocked");
        if (DOM.pinErrorMessage) DOM.pinErrorMessage.style.display = "none";
        if (DOM.adminPinInput) DOM.adminPinInput.value = "";
        showToast("تم التحقق بنجاح! مرحباً بك في لوحة تحكم متجر بوسلطان.", "success");
      } else {
        if (DOM.pinErrorMessage) {
          DOM.pinErrorMessage.textContent = "رمز المرور غير صحيح! يرجى إدخال الرمز السري الصحيح.";
          DOM.pinErrorMessage.style.display = "block";
        }
        if (DOM.adminPinInput) {
          DOM.adminPinInput.value = "";
          DOM.adminPinInput.focus();
        }
      }
    });
  }

  // زر قفل لوحة التحكم
  if (DOM.btnLockDashboard) {
    DOM.btnLockDashboard.addEventListener("click", lockDashboard);
  }
}

function lockDashboard() {
  sessionStorage.removeItem("smartstore_admin_auth");
  if (DOM.adminLockScreen) {
    DOM.adminLockScreen.classList.remove("unlocked");
    if (DOM.pinErrorMessage) DOM.pinErrorMessage.style.display = "none";
    if (DOM.adminPinInput) {
      DOM.adminPinInput.value = "";
      setTimeout(() => DOM.adminPinInput.focus(), 200);
    }
  }
  showToast("تم قفل لوحة التحكم.", "info");
}

// ==========================================================================
// 9. قسم إعدادات المتجر (Store Settings & Dynamic Config)
// ==========================================================================

function setupStoreSettings() {
  populateStoreSettingsForm();

  // حفظ الإعدادات
  if (DOM.storeSettingsForm) {
    DOM.storeSettingsForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const phone = DOM.settingsStorePhone.value.trim().replace(/[^0-9]/g, "");
      const currency = DOM.settingsCurrency.value.trim();
      const codEnabled = DOM.settingsCodEnabled ? DOM.settingsCodEnabled.checked : true;
      const bankEnabled = DOM.settingsBankEnabled ? DOM.settingsBankEnabled.checked : true;
      const bankDetails = DOM.settingsBankDetails ? DOM.settingsBankDetails.value.trim() : DEFAULT_SETTINGS.bankDetails;

      if (!phone) {
        showToast("يرجى إدخال رقم هاتف واتساب صالح (أرقام فقط)!", "danger");
        return;
      }

      if (!currency) {
        showToast("يرجى إدخال رمز أو اسم العملة!", "danger");
        return;
      }

      storeSettings = {
        storePhone: phone,
        currency: currency,
        codEnabled: codEnabled,
        bankEnabled: bankEnabled,
        bankDetails: bankDetails
      };
      saveStoreSettings(storeSettings);

      // تحديث الجدول والإحصائيات بالعملة الجديدة فوراً
      renderAdminProducts();
      showToast("تم حفظ إعدادات المتجر وطرق الدفع بنجاح!", "success");

      // المزامنة والحفظ في سحابة Supabase
      if (supabaseClient) {
        supabaseClient.from("settings").upsert({
          id: "general",
          store_phone: phone,
          currency: currency,
          cod_enabled: codEnabled,
          bank_enabled: bankEnabled,
          bank_details: bankDetails,
          updated_at: new Date().toISOString()
        }).then(({ error }) => {
          if (error) console.error("خطأ حفظ إعدادات Supabase:", error);
        });
      }
    });
  }

  // فتح وإغلاق نافذة تغيير رمز المرور
  if (DOM.btnOpenChangePin) {
    DOM.btnOpenChangePin.addEventListener("click", openChangePinModal);
  }

  if (DOM.closePinModalBtn) {
    DOM.closePinModalBtn.addEventListener("click", closeChangePinModal);
  }

  if (DOM.changePinModal) {
    DOM.changePinModal.addEventListener("click", (e) => {
      if (e.target === DOM.changePinModal) closeChangePinModal();
    });
  }

  // معالجة نموذج تغيير رمز المرور
  if (DOM.changePinForm) {
    DOM.changePinForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const currentPin = DOM.currentPinInput.value.trim();
      const newPin = DOM.newPinInput.value.trim();
      const confirmPin = DOM.confirmPinInput.value.trim();
      const actualPin = getAdminPin();

      if (currentPin !== actualPin) {
        showToast("رمز المرور الحالي غير صحيح!", "danger");
        DOM.currentPinInput.focus();
        return;
      }

      if (newPin.length < 4) {
        showToast("يجب أن يتكون رمز المرور الجديد من 4 خانات على الأقل!", "danger");
        DOM.newPinInput.focus();
        return;
      }

      if (newPin !== confirmPin) {
        showToast("تأكيد رمز المرور الجديد غير متطابق!", "danger");
        DOM.confirmPinInput.focus();
        return;
      }

      setAdminPin(newPin);
      closeChangePinModal();
      showToast(`تم تغيير رمز المرور بنجاح! رمزك الجديد هو (${newPin}).`, "success");
    });
  }
}

function populateStoreSettingsForm() {
  if (DOM.settingsStorePhone) DOM.settingsStorePhone.value = storeSettings.storePhone;
  if (DOM.settingsCurrency) DOM.settingsCurrency.value = storeSettings.currency;
  if (DOM.settingsCodEnabled) DOM.settingsCodEnabled.checked = storeSettings.codEnabled !== false;
  if (DOM.settingsBankEnabled) DOM.settingsBankEnabled.checked = storeSettings.bankEnabled !== false;
  if (DOM.settingsBankDetails) DOM.settingsBankDetails.value = storeSettings.bankDetails || DEFAULT_SETTINGS.bankDetails;
}

// ==========================================================================
// 9.1 إدارة بنر عروض الموسم (Hero Banner Settings)
// ==========================================================================

function setupBannerSettings() {
  populateBannerSettingsForm();

  if (DOM.bannerSettingsForm) {
    DOM.bannerSettingsForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const enabled = DOM.settingsBannerEnabled ? DOM.settingsBannerEnabled.checked : true;
      const badge = DOM.settingsBannerBadge ? DOM.settingsBannerBadge.value.trim() : DEFAULT_SETTINGS.bannerBadge;
      const title = DOM.settingsBannerTitle ? DOM.settingsBannerTitle.value.trim() : DEFAULT_SETTINGS.bannerTitle;
      const subtitle = DOM.settingsBannerSubtitle ? DOM.settingsBannerSubtitle.value.trim() : DEFAULT_SETTINGS.bannerSubtitle;

      storeSettings = {
        ...storeSettings,
        bannerEnabled: enabled,
        bannerBadge: badge,
        bannerTitle: title,
        bannerSubtitle: subtitle
      };
      saveStoreSettings(storeSettings);

      showToast("تم حفظ وتحديث إعدادات بنر عروض الموسم بنجاح!", "success");

      // المزامنة والحفظ في سحابة Supabase
      if (supabaseClient) {
        supabaseClient.from("settings").upsert({
          id: "general",
          banner_enabled: enabled,
          banner_badge: badge,
          banner_title: title,
          banner_subtitle: subtitle,
          updated_at: new Date().toISOString()
        }).then(({ error }) => {
          if (error) console.error("خطأ حفظ إعدادات البنر في Supabase:", error);
        });
      }
    });
  }
}

function populateBannerSettingsForm() {
  if (DOM.settingsBannerEnabled) DOM.settingsBannerEnabled.checked = storeSettings.bannerEnabled !== false;
  if (DOM.settingsBannerBadge) DOM.settingsBannerBadge.value = storeSettings.bannerBadge || DEFAULT_SETTINGS.bannerBadge;
  if (DOM.settingsBannerTitle) DOM.settingsBannerTitle.value = storeSettings.bannerTitle || DEFAULT_SETTINGS.bannerTitle;
  if (DOM.settingsBannerSubtitle) DOM.settingsBannerSubtitle.value = storeSettings.bannerSubtitle || DEFAULT_SETTINGS.bannerSubtitle;
}

function openChangePinModal() {
  if (!DOM.changePinModal) return;
  DOM.changePinForm.reset();
  DOM.changePinModal.classList.add("active");
  if (DOM.currentPinInput) DOM.currentPinInput.focus();
}

function closeChangePinModal() {
  if (!DOM.changePinModal) return;
  DOM.changePinModal.classList.remove("active");
}

window.lockDashboard = lockDashboard;
window.openChangePinModal = openChangePinModal;
window.closeChangePinModal = closeChangePinModal;


// ==========================================================================
// 10. نظام كوبونات الخصم (Coupons Management & Application)
// ==========================================================================

/**
 * إعداد أحداث كوبونات الخصم في سلة المشتريات
 */
function setupCartCouponEvents() {
  if (DOM.btnApplyCoupon && DOM.couponCodeInput) {
    DOM.btnApplyCoupon.addEventListener("click", () => {
      applyCoupon(DOM.couponCodeInput.value);
    });

    DOM.couponCodeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyCoupon(DOM.couponCodeInput.value);
      }
    });
  }

  if (DOM.btnRemoveCoupon) {
    DOM.btnRemoveCoupon.addEventListener("click", removeAppliedCoupon);
  }
}

/**
 * تطبيق كود الخصم في السلة
 */
function applyCoupon(rawCode) {
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) {
    showToast("يرجى كتابة كود الخصم أولاً!", "danger");
    if (DOM.couponCodeInput) DOM.couponCodeInput.focus();
    return;
  }

  const coupons = loadCoupons();
  const found = coupons.find(c => c.code.toUpperCase() === code);

  if (found) {
    appliedCoupon = { code: found.code, discount: found.discount };
    saveAppliedCoupon(appliedCoupon);
    updateCartUI();
    showToast(`تم تطبيق كود الخصم (${found.code}) بنجاح! خصم ${found.discount}%`, "success");
  } else {
    showToast(`كود الخصم (${code}) غير صحيح أو غير موجود!`, "danger");
    if (DOM.couponCodeInput) {
      DOM.couponCodeInput.value = "";
      DOM.couponCodeInput.focus();
    }
  }
}

/**
 * إلغاء كود الخصم المطبق في السلة
 */
function removeAppliedCoupon() {
  appliedCoupon = null;
  saveAppliedCoupon(null);
  updateCartUI();
  showToast("تمت إزالة كوبون الخصم من السلة.", "info");
}

/**
 * إعداد لوحة تحكم الكوبونات في الإدارة
 */
function setupCouponAdmin() {
  renderAdminCoupons();

  if (DOM.couponForm) {
    DOM.couponForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const code = (DOM.couponCodeInputAdmin.value || "").trim().toUpperCase();
      const discount = parseInt(DOM.couponDiscountInputAdmin.value, 10);

      if (!code || isNaN(discount) || discount < 1 || discount > 100) {
        showToast("يرجى إدخال كود صالح ونسبة خصم بين 1% و 100%!", "danger");
        return;
      }

      let coupons = loadCoupons();
      const existing = coupons.find(c => c.code.toUpperCase() === code);
      if (existing) {
        showToast(`الكوبون (${code}) موجود مسبقاً!`, "danger");
        DOM.couponCodeInputAdmin.focus();
        return;
      }

      coupons.unshift({ code, discount });
      saveCoupons(coupons);
      DOM.couponForm.reset();
      renderAdminCoupons();
      showToast(`تم إنشاء وتفعيل الكوبون (${code}) بنسبة خصم ${discount}% بنجاح!`, "success");

      // الحفظ في سحابة Supabase
      if (supabaseClient) {
        supabaseClient.from("coupons").insert([{ code, discount }]).then(({ error }) => {
          if (error) console.error("خطأ إضافة الكوبون في Supabase:", error);
        });
      }
    });
  }
}

/**
 * عرض جدول الكوبونات في لوحة الإدارة
 */
function renderAdminCoupons() {
  if (!DOM.couponsTableBody) return;

  const coupons = loadCoupons();

  if (coupons.length === 0) {
    DOM.couponsTableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          لا توجد كوبونات خصم حالياً. أضف كوبوناً جديداً من النموذج أعلاه.
        </td>
      </tr>
    `;
    return;
  }

  DOM.couponsTableBody.innerHTML = coupons.map(c => `
    <tr>
      <td>
        <span class="coupon-code-badge">${c.code}</span>
      </td>
      <td>
        <strong style="color: var(--accent); font-size: 1.05rem;">${c.discount}%</strong>
      </td>
      <td>
        <span style="color: var(--accent); font-weight: 700; font-size: 0.85rem;">مفعل وجاهز</span>
      </td>
      <td>
        <button class="btn-table-action delete" onclick="deleteCoupon('${c.code}')" title="حذف الكوبون">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </td>
    </tr>
  `).join("");
}

/**
 * حذف كوبون خصم من الإدارة
 */
function deleteCoupon(code) {
  if (confirm(`هل أنت متأكد من رغبتك في حذف الكوبون (${code})؟`)) {
    let coupons = loadCoupons();
    coupons = coupons.filter(c => c.code.toUpperCase() !== code.toUpperCase());
    saveCoupons(coupons);

    // إذا كان نفس الكوبون مطبقاً في السلة، يتم إلغاؤه فوراً
    if (appliedCoupon && appliedCoupon.code.toUpperCase() === code.toUpperCase()) {
      appliedCoupon = null;
      saveAppliedCoupon(null);
    }

    renderAdminCoupons();
    showToast(`تم حذف الكوبون (${code}) بنجاح.`, "danger");

    // الحذف من سحابة Supabase
    if (supabaseClient) {
      supabaseClient.from("coupons").delete().eq("code", code).then(({ error }) => {
        if (error) console.error("خطأ حذف الكوبون من Supabase:", error);
      });
    }
  }
}

// ==========================================================================
// 11. وظائف المزامنة السحابية اللحظية مع Supabase (Realtime & Sync)
// ==========================================================================

async function syncSettingsFromSupabase() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from("settings")
        .select("*")
        .eq("id", "general")
        .maybeSingle();

      if (!error && data) {
        storeSettings = {
          storePhone: data.store_phone || DEFAULT_SETTINGS.storePhone,
          currency: data.currency || DEFAULT_SETTINGS.currency,
          codEnabled: data.cod_enabled !== false,
          bankEnabled: data.bank_enabled !== false,
          bankDetails: data.bank_details || DEFAULT_SETTINGS.bankDetails,
          bannerEnabled: data.banner_enabled !== false,
          bannerBadge: data.banner_badge || DEFAULT_SETTINGS.bannerBadge,
          bannerTitle: data.banner_title || DEFAULT_SETTINGS.bannerTitle,
          bannerSubtitle: data.banner_subtitle || DEFAULT_SETTINGS.bannerSubtitle
        };
        saveStoreSettings(storeSettings);
        if (data.admin_pin) {
          localStorage.setItem(STORAGE_KEYS.PIN, data.admin_pin);
        }
        if (DOM.storeSettingsForm) populateStoreSettingsForm();
        if (DOM.bannerSettingsForm) populateBannerSettingsForm();
        if (DOM.heroSection) renderHeroBanner();
        if (DOM.productsGrid) {
          renderProducts();
          updateCartUI();
          setupPaymentMethodsInCheckout();
        }
        if (DOM.adminProductsTableBody) renderAdminProducts();
      }
    } catch (err) {
      console.warn("خطأ مزامنة إعدادات Supabase:", err);
    }
  }
}

async function syncCouponsFromSupabase() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(c => ({
          code: c.code,
          discount: Number(c.discount)
        }));
        saveCoupons(mapped);
        if (DOM.couponsTableBody) renderAdminCoupons();
        if (DOM.productsGrid) updateCartUI();
      }
    } catch (err) {
      console.warn("خطأ مزامنة كوبونات Supabase:", err);
    }
  }
}

function setupSupabaseRealtime() {
  if (!supabaseClient) return;
  try {
    supabaseClient
      .channel("smartstore_db_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        loadProducts();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => {
        syncSettingsFromSupabase();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "coupons" }, () => {
        syncCouponsFromSupabase();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        loadOrders();
      })
      .subscribe();
  } catch (err) {
    console.warn("تعذر تفعيل Supabase Realtime:", err);
  }
}

// ==========================================================================
// 12. إدارة الطلبات في لوحة التحكم (Admin Orders Management)
// ==========================================================================

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadOrders(showSuccessToast = false) {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      orders = data;
      renderAdminOrders();
      updateOrdersStats();
      if (showSuccessToast) {
        showToast("تم تحديث قائمة الطلبات من السحابة بنجاح!", "info");
      }
    } else if (error) {
      console.error("خطأ جلب الطلبات من Supabase:", error);
    }
  } catch (err) {
    console.error("استثناء أثناء جلب الطلبات:", err);
  }
}

function updateOrdersStats() {
  if (DOM.statTotalOrders) {
    DOM.statTotalOrders.textContent = orders.length;
  }
  if (DOM.ordersCountBadge) {
    DOM.ordersCountBadge.textContent = `${orders.length} طلب`;
  }
}

function renderAdminOrders() {
  if (!DOM.ordersTableBody) return;

  if (orders.length === 0) {
    DOM.ordersTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 0.75rem; display: block; opacity: 0.4;">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <strong>لا توجد أي طلبات واردة حالياً</strong>
          <p style="font-size: 0.85rem; margin-top: 0.35rem;">عندما يقوم العملاء بطلب منتجات من المتجر ستظهر طلباتهم هنا تلقائياً وتُحفظ في Supabase.</p>
        </td>
      </tr>
    `;
    return;
  }

  DOM.ordersTableBody.innerHTML = orders.map(order => {
    // تنسيق التاريخ والوقت
    const createdAt = order.created_at ? new Date(order.created_at) : new Date();
    const dateFormatted = createdAt.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    // عناصر الطلب
    let itemsHtml = "";
    if (Array.isArray(order.items) && order.items.length > 0) {
      itemsHtml = `
        <div class="order-items-list">
          ${order.items.map(item => `
            <div class="order-item-row">
              <span>• <strong>${escapeHtml(item.name || "")}</strong></span>
              <span style="color: var(--text-muted); font-size: 0.8rem;">(${item.quantity || 1} × ${item.price || 0} ${CONFIG.CURRENCY})</span>
            </div>
          `).join("")}
        </div>
      `;
    } else {
      itemsHtml = `<span style="color: var(--text-muted);">—</span>`;
    }

    // طريقة الدفع
    const isBank = (order.payment_method || "").includes("التحويل البنكي") || (order.payment_method || "").includes("المحفظة");
    const paymentBadge = isBank
      ? `<span class="coupon-code-badge" style="font-size: 0.78rem; background-color: #eff6ff; color: #2563eb;">🏦 تحويل بنكي / محفظة</span>`
      : `<span class="coupon-code-badge" style="font-size: 0.78rem; background-color: #f0fdf4; color: #16a34a;">💵 دفع عند الاستلام</span>`;

    // رقم الحوالة
    const transferRefHtml = order.transfer_reference
      ? `<span style="font-weight: 800; color: #1e293b; background-color: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.82rem; word-break: break-all;">${escapeHtml(order.transfer_reference)}</span>`
      : `<span style="color: var(--text-light); font-size: 0.85rem;">—</span>`;

    // تحديد كلاس الحالة
    let statusClass = "status-pending";
    if (order.status === "تم التأكيد") statusClass = "status-confirmed";
    if (order.status === "تم التوصيل") statusClass = "status-delivered";

    return `
      <tr>
        <td>
          <strong style="color: var(--primary); font-family: monospace; font-size: 0.95rem;">#${order.id}</strong>
        </td>
        <td>
          <div style="font-weight: 800; color: var(--dark);">${escapeHtml(order.customer_name || "")}</div>
          <div style="font-size: 0.82rem; margin-top: 0.2rem;" dir="ltr">
            <a href="tel:${escapeHtml(order.customer_phone || "")}" style="color: var(--primary); text-decoration: none;">📞 ${escapeHtml(order.customer_phone || "")}</a>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem; max-width: 220px;">📍 ${escapeHtml(order.customer_address || "")}</div>
        </td>
        <td>
          ${itemsHtml}
        </td>
        <td>
          <div style="font-size: 1.05rem; font-weight: 900; color: var(--dark); margin-bottom: 0.3rem;">
            ${order.total_amount || 0} ${CONFIG.CURRENCY}
          </div>
          ${paymentBadge}
        </td>
        <td>
          ${transferRefHtml}
        </td>
        <td style="font-size: 0.82rem; color: var(--text-muted); white-space: nowrap;">
          ${dateFormatted}
        </td>
        <td>
          <select class="select-order-status" onchange="updateOrderStatus('${order.id}', this.value)" style="width: 100%;">
            <option value="قيد المراجعة" ${order.status === "قيد المراجعة" ? "selected" : ""}>⏳ قيد المراجعة</option>
            <option value="تم التأكيد" ${order.status === "تم التأكيد" ? "selected" : ""}>✅ تم التأكيد</option>
            <option value="تم التوصيل" ${order.status === "تم التوصيل" ? "selected" : ""}>🚚 تم التوصيل</option>
          </select>
        </td>
        <td>
          <button type="button" class="btn-action-delete" onclick="deleteOrder('${order.id}')" title="حذف هذا الطلب">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

async function updateOrderStatus(orderId, newStatus) {
  if (!supabaseClient) return;

  try {
    const { error } = await supabaseClient
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      showToast("فشل تحديث حالة الطلب!", "danger");
      console.error(error);
    } else {
      showToast(`تم تغيير حالة الطلب #${orderId} إلى (${newStatus}) بنجاح!`, "success");
      const found = orders.find(o => String(o.id) === String(orderId));
      if (found) found.status = newStatus;
      renderAdminOrders();
    }
  } catch (err) {
    showToast("خطأ أثناء الاتصال لتحديث حالة الطلب", "danger");
  }
}

async function deleteOrder(orderId) {
  if (!confirm(`هل أنت متأكد من حذف الطلب رقم #${orderId} نهائياً؟`)) return;
  if (!supabaseClient) return;

  try {
    const { error } = await supabaseClient
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (error) {
      showToast("تعذر حذف الطلب!", "danger");
      console.error(error);
    } else {
      showToast(`تم حذف الطلب #${orderId} بنجاح!`, "success");
      orders = orders.filter(o => String(o.id) !== String(orderId));
      renderAdminOrders();
      updateOrdersStats();
    }
  } catch (err) {
    showToast("خطأ أثناء حذف الطلب", "danger");
  }
}

// تصدير الدوال للاستخدام العام
window.applyCoupon = applyCoupon;
window.removeAppliedCoupon = removeAppliedCoupon;
window.deleteCoupon = deleteCoupon;
window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;
window.filterToSeasonOffers = filterToSeasonOffers;

// ==========================================================================
// 15. ميزات تطبيق الويب التقدمي (Progressive Web App - PWA)
// ==========================================================================

function setupPwa() {
  // 1. تسجيل الـ Service Worker لتسريع التحميل والتخزين المؤقت
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./service-worker.js")
        .then((reg) => {
          console.log("[PWA] Service Worker مسجل بنجاح في النطاق:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] تعذر تسجيل Service Worker:", err);
        });
    });
  }

  // 2. إدارة زر تثبيت التطبيق على الجوال
  const installBtn = DOM.btnInstallPwa;
  if (!installBtn) return;

  // التحقق إن كان المستخدم يتصفح التطبيق في وضع Standalone (مثبت بالفعل)
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true ||
    document.referrer.includes("android-app://");

  if (isStandalone) {
    installBtn.style.display = "none";
    return;
  }

  let deferredPrompt = null;

  // استقبال حدث التثبيت من المتصفح
  window.addEventListener("beforeinstallprompt", (e) => {
    // منع النافذة الافتراضية لعرض زرنا المخصص الأنيق
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = "inline-flex";
  });

  // النقر على زر التثبيت
  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) {
      // إرشاد بديل للأجهزة التي لا تدعم الحدث التلقائي (مثل Safari على iOS)
      showToast(
        'لتثبيت التطبيق على جهازك: اضغط على زر المشاركة أو خيارات المتصفح (⋮) ثم اختر "إضافة إلى الشاشة الرئيسية"',
        "info"
      );
      return;
    }

    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult && choiceResult.outcome === "accepted") {
        showToast("شكراً لتثبيت متجر بوسلطان! يمكنك الآن فتحه مباشرة من شاشتك الرئيسية.", "success");
        installBtn.style.display = "none";
      }
    } catch (err) {
      console.warn("[PWA] خطأ أثناء إطلاق نافذة التثبيت:", err);
    }
    deferredPrompt = null;
  });

  // إخفاء الزر عند اكتمال التثبيت بنجاح
  window.addEventListener("appinstalled", () => {
    installBtn.style.display = "none";
    deferredPrompt = null;
    showToast("تم تثبيت تطبيق متجر بوسلطان بنجاح على جهازك! 🎉", "success");
  });
}

