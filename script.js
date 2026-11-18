/**
 * ==========================================================================
 * SmartStore - المنطق البرمجي للمتجر الرئيسي (JavaScript ES6+)
 * إدارة المنتجات، السلة التفاعلية، وإتمام الطلب عبر واتساب
 * ==========================================================================
 */

// مفاتيح التخزين وقيم الإعدادات الافتراضية
const STORAGE_KEYS = {
  PRODUCTS: "smartstore_products",
  CART: "smartstore_cart",
  SETTINGS: "smartstore_settings",
  PIN: "smartstore_admin_pin"
};

const DEFAULT_SETTINGS = {
  storePhone: "966501234567",
  currency: "ر.س"
};

const DEFAULT_PIN = "1234";

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

function setAdminPin(newPin) {
  localStorage.setItem(STORAGE_KEYS.PIN, newPin);
}

let storeSettings = loadStoreSettings();

// إعدادات المتجر الديناميكية
const CONFIG = {
  get STORE_PHONE() { return storeSettings.storePhone; },
  get CURRENCY() { return storeSettings.currency; },
  PRODUCTS_KEY: STORAGE_KEYS.PRODUCTS,
  CART_KEY: STORAGE_KEYS.CART,
  SETTINGS_KEY: STORAGE_KEYS.SETTINGS,
  PIN_KEY: STORAGE_KEYS.PIN
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
  changePinModal: document.getElementById("changePinModal"),
  btnOpenChangePin: document.getElementById("btnOpenChangePin"),
  closePinModalBtn: document.getElementById("closePinModalBtn"),
  changePinForm: document.getElementById("changePinForm"),
  currentPinInput: document.getElementById("currentPinInput"),
  newPinInput: document.getElementById("newPinInput"),
  confirmPinInput: document.getElementById("confirmPinInput")
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

  // تفعيل واجهة المتجر إن كانت الصفحة هي المتجر
  if (DOM.productsGrid) {
    setupEventListeners();
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
      if (DOM.productsGrid) {
        renderProducts();
        updateCartUI();
      }
      if (DOM.storeSettingsForm) {
        populateStoreSettingsForm();
      }
      if (DOM.adminProductForm) {
        renderAdminProducts();
      }
    }
  });
}

/**
 * جلب المنتجات من LocalStorage أو تعيين المنتجات الافتراضية
 */
function loadProducts() {
  const stored = localStorage.getItem(CONFIG.PRODUCTS_KEY);
  if (stored) {
    try {
      products = JSON.parse(stored);
      // التأكد من أنها مصفوفة صالحة
      if (!Array.isArray(products) || products.length === 0) {
        products = [...DEFAULT_PRODUCTS];
        saveProducts();
      }
    } catch (e) {
      console.error("خطأ في قراءة المنتجات:", e);
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
  DOM.categoryButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      DOM.categoryButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = btn.getAttribute("data-category");
      renderProducts();
    });
  });

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
// 3. عرض المنتجات في الشبكة (Render Products)
// ==========================================================================
function renderProducts() {
  if (!DOM.productsGrid) return;

  // تصفية حسب التصنيف والبحث
  const filtered = products.filter(item => {
    const matchCategory = activeCategory === "all" || item.category === activeCategory;
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
    accessories: "إكسسوارات"
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
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

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
  if (DOM.cartSubtotal) DOM.cartSubtotal.textContent = `${totalPrice} ${CONFIG.CURRENCY}`;
  if (DOM.cartTotal) DOM.cartTotal.textContent = `${totalPrice} ${CONFIG.CURRENCY}`;

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
function openCheckoutModal() {
  if (!DOM.checkoutModal) return;

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (DOM.modalItemsCount) DOM.modalItemsCount.textContent = `${totalItems} منتجات`;
  if (DOM.modalTotalAmount) DOM.modalTotalAmount.textContent = `${totalPrice} ${CONFIG.CURRENCY}`;

  DOM.checkoutModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeCheckoutModal() {
  if (!DOM.checkoutModal) return;
  DOM.checkoutModal.classList.remove("active");
  document.body.style.overflow = "";
}

function handleOrderSubmit(e) {
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

  // إنشاء رقم طلب وتاريخ
  const orderNumber = "SMT-" + Math.floor(100000 + Math.random() * 900000);
  const now = new Date();
  const orderDate = now.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // صياغة رسالة واتساب منسقة وأنيقة
  let message = `🛒 *طلب جديد من متجر بوسلطان*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🔖 *رقم الطلب:* #${orderNumber}\n`;
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

  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💰 *المجموع النهائي:* *${totalPrice} ${CONFIG.CURRENCY}*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `✨ يرجى تأكيد الطلب للبدء بالتجهيز والشحن، شكراً لكم!`;

  // رابط الواتساب المشفر
  const whatsappUrl = `https://wa.me/${CONFIG.STORE_PHONE}?text=${encodeURIComponent(message)}`;

  // فتح الواتساب في نافذة جديدة
  window.open(whatsappUrl, "_blank");

  // تفريغ السلة وتحديث الواجهة
  cart = [];
  saveCart();
  updateCartUI();

  // إغلاق المودال وتصفير النموذج
  closeCheckoutModal();
  DOM.checkoutForm.reset();

  showToast("تم تحويل طلبك إلى واتساب بنجاح! شكراً لطلبك.", "success");
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
    const matchCat = categoryFilter === "all" || product.category === categoryFilter;
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
function handleAdminFormSubmit(e) {
  e.preventDefault();

  const id = DOM.adminProductId.value;
  const name = DOM.adminProductName.value.trim();
  const price = parseFloat(DOM.adminProductPrice.value);
  const oldPriceRaw = DOM.adminProductOldPrice.value.trim();
  const oldPrice = oldPriceRaw ? parseFloat(oldPriceRaw) : null;
  const category = DOM.adminProductCategory.value;
  const image = DOM.adminProductImage.value.trim();
  const description = DOM.adminProductDesc.value.trim();

  if (!name || isNaN(price) || !image) {
    showToast("يرجى التأكد من ملء الاسم، السعر، ورابط الصورة!", "danger");
    return;
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
    updateImagePreview("");
    renderAdminProducts();
    showToast(`تمت إضافة المنتج الجديد "${name}" بنجاح!`, "success");
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
 * حذف منتج من لوحة التحكم والتخزين المحلي
 */
function deleteProduct(productId) {
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
  }
}

/**
 * إعادة ضبط المنتجات الافتراضية الأولية
 */
function resetDefaultProducts() {
  if (confirm("هل تريد استعادة قائمة المنتجات الافتراضية الـ 6؟ سيتم استبدال أي تغييرات حالية.")) {
    products = [...DEFAULT_PRODUCTS];
    saveProducts();
    cancelEdit();
    renderAdminProducts();
    showToast("تمت استعادة المنتجات الافتراضية بنجاح!", "info");
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
          DOM.pinErrorMessage.textContent = "رمز المرور غير صحيح! (الرمز الافتراضي هو 1234)";
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

      if (!phone) {
        showToast("يرجى إدخال رقم هاتف واتساب صالح (أرقام فقط)!", "danger");
        return;
      }

      if (!currency) {
        showToast("يرجى إدخال رمز أو اسم العملة!", "danger");
        return;
      }

      storeSettings = { storePhone: phone, currency: currency };
      saveStoreSettings(storeSettings);

      // تحديث الجدول والإحصائيات بالعملة الجديدة فوراً
      renderAdminProducts();
      showToast("تم حفظ إعدادات المتجر وتحديث العملة ورقم الواتساب بنجاح!", "success");
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
