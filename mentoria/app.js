/**
 * Core Application Logic for iikoWriteOff
 * Управляет состоянием, интерфейсом, локальной базой данных и формами.
 */

// --- НАЧАЛЬНЫЕ ДАННЫЕ (ИМИТАЦИЯ БАЗЫ IIKO) ---
const OUTLETS = [
    { id: 'out-1', name: 'Бургерная №1 • ул. Арбат, 12' },
    { id: 'out-2', name: 'Бургерная №2 • ТЦ Авиапарк' },
    { id: 'out-3', name: 'Бургерная №3 • Манежная площадь' }
];

const PRODUCTS = [
    { id: 'p-1', name: 'Томаты свежие (кг)', category: 'Овощи', price: 180, code: 'PRD-1029', avatar: '🍅' },
    { id: 'p-2', name: 'Котлеты говяжьи заморож. (шт)', category: 'Полуфабрикаты', price: 120, code: 'PRD-4091', avatar: '🥩' },
    { id: 'p-3', name: 'Булочки кунжутные (шт)', category: 'Выпечка', price: 45, code: 'PRD-3022', avatar: '🥯' },
    { id: 'p-4', name: 'Соус фирменный IIKO (кг)', category: 'Прочее', price: 380, code: 'PRD-8890', avatar: '🥫' },
    { id: 'p-5', name: 'Сыр Чеддер слайсы (кг)', category: 'Прочее', price: 920, code: 'PRD-6721', avatar: '🧀' },
    { id: 'p-6', name: 'Листья салата Айсберг (кг)', category: 'Овощи', price: 250, code: 'PRD-1188', avatar: '🥬' }
];

const EMPLOYEES = [
    { id: 'u-1', name: 'Мария Иванова', role: 'employee', title: 'Повар-бригадир', avatar: '🧑‍🍳' },
    { id: 'u-2', name: 'Иван Сидоров', role: 'employee', title: 'Старший кассир', avatar: '🧑‍💼' },
    { id: 'u-3', name: 'Дмитрий Петров', role: 'reviewer', title: 'Шеф-повар точки', avatar: '👨‍🍳' },
    { id: 'u-4', name: 'Алексей Кузнецов', role: 'employee', title: 'Повар холодного цеха', avatar: '👨‍🍳' },
    { id: 'u-5', name: 'Светлана Васильева', role: 'reviewer', title: 'Территориальный управляющий', avatar: '👩‍💼' }
];

// --- ГЕНЕРАТОРЫ ИЗОБРАЖЕНИЙ ДЛЯ ПРЕСЕТОВ ---
// Создаем встроенные SVG-картинки продуктов для тестирования без необходимости загружать реальные файлы
const PHOTO_PRESETS = {
    tomatoes: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="%231e293b"/><circle cx="150" cy="110" r="60" fill="%23ef4444"/><circle cx="130" cy="100" r="15" fill="%23f87171"/><path d="M150 50 Q160 30 170 48 Q150 45 150 50 Q140 30 130 48 Q150 45 150 50" fill="%2322c55e" stroke="%2315803d" stroke-width="2"/><text x="150" y="190" fill="%2394a3b8" font-family="sans-serif" font-size="12" text-anchor="middle">Испорченные томаты на списание</text></svg>`,
    patty: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="%231e293b"/><ellipse cx="150" cy="110" rx="80" ry="40" fill="%237c2d12" stroke="%23431407" stroke-width="4"/><path d="M110 110 Q150 95 190 110 M120 120 Q150 105 180 120 M100 100 Q150 85 200 100" stroke="%23b45309" stroke-width="3" fill="none"/><text x="150" y="190" fill="%2394a3b8" font-family="sans-serif" font-size="12" text-anchor="middle">Упавшая котлета (нарушение санитарии)</text></svg>`,
    buns: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="%231e293b"/><path d="M70 120 Q150 60 230 120 Z" fill="%23d97706" stroke="%23b45309" stroke-width="3"/><rect x="65" y="118" width="170" height="12" rx="6" fill="%23f59e0b"/><circle cx="110" cy="90" r="2" fill="white"/><circle cx="150" cy="80" r="2" fill="white"/><circle cx="180" cy="95" r="2" fill="white"/><circle cx="135" cy="95" r="2" fill="white"/><text x="150" y="190" fill="%2394a3b8" font-family="sans-serif" font-size="12" text-anchor="middle">Деформированные / помятые булочки</text></svg>`
};

// --- СОСТОЯНИЕ ПРИЛОЖЕНИЯ ---
let appState = {
    currentUser: null,
    currentRole: 'employee', // 'employee' или 'reviewer'
    selectedProduct: null,
    currentPhotoBase64: null,
    writeOffs: [],
    activeScreen: 'screen-login',
    activeRejectingId: null
};

// --- ИНИЦИАЛИЗАЦИЯ И ХРАНЕНИЕ В LOCALSTORAGE ---
document.addEventListener('DOMContentLoaded', () => {
    initDatabase();
    renderUserLoginList();
    renderOutletSelectors();
    renderProductSelectorModal();
    renderDeductionEmployeeSelector();
    
    // По умолчанию считываем активную роль с кнопок управления симулятором
    const activeRoleBtn = document.querySelector('.role-selector-pills .pill-btn.active');
    appState.currentRole = activeRoleBtn.id.includes('reviewer') ? 'reviewer' : 'employee';
});

function initDatabase() {
    const stored = localStorage.getItem('iiko_writeoffs');
    if (stored) {
        appState.writeOffs = JSON.parse(stored);
    } else {
        // Заполняем базу демонстрационными данными для реалистичности
        appState.writeOffs = [
            {
                id: 'wo-1',
                outletId: 'out-1',
                outletName: 'Бургерная №1 • ул. Арбат, 12',
                productId: 'p-1',
                productName: 'Томаты свежие (кг)',
                productPrice: 180,
                amount: 3,
                estimatedCost: 540,
                type: 'no-deduction',
                deductedEmployeeId: null,
                deductedEmployeeName: '',
                photoUrl: PHOTO_PRESETS.tomatoes,
                comment: 'Томаты испорчены, обнаружена плесень на нижнем ящике склада.',
                creatorId: 'u-1',
                creatorName: 'Мария Иванова',
                status: 'approved',
                rejectionReason: '',
                iikoSynced: true,
                iikoDocumentId: 'doc-88410294',
                createdAt: new Date(Date.now() - 3600000 * 4).toISOString() // 4 часа назад
            },
            {
                id: 'wo-2',
                outletId: 'out-2',
                outletName: 'Бургерная №2 • ТЦ Авиапарк',
                productId: 'p-3',
                productName: 'Булочки кунжутные (шт)',
                productPrice: 45,
                amount: 10,
                estimatedCost: 450,
                type: 'deduction',
                deductedEmployeeId: 'u-2',
                deductedEmployeeName: 'Иван Сидоров',
                photoUrl: PHOTO_PRESETS.buns,
                comment: 'Помялись булочки при разгрузке курьерской коробки.',
                creatorId: 'u-2',
                creatorName: 'Иван Сидоров',
                status: 'rejected',
                rejectionReason: 'Некорректно указан виновник. Вины Ивана нет, это повреждение при транспортировке поставщиком.',
                iikoSynced: false,
                iikoDocumentId: '',
                createdAt: new Date(Date.now() - 3600000 * 2).toISOString() // 2 часа назад
            },
            {
                id: 'wo-3',
                outletId: 'out-1',
                outletName: 'Бургерная №1 • ул. Арбат, 12',
                productId: 'p-2',
                productName: 'Котлеты говяжьи заморож. (шт)',
                productPrice: 120,
                amount: 2,
                estimatedCost: 240,
                type: 'deduction',
                deductedEmployeeId: 'u-4',
                deductedEmployeeName: 'Алексей Кузнецов',
                photoUrl: PHOTO_PRESETS.patty,
                comment: 'Котлеты упали на пол в гриль-зоне при сборке заказа.',
                creatorId: 'u-1',
                creatorName: 'Мария Иванова',
                status: 'pending',
                rejectionReason: '',
                iikoSynced: false,
                iikoDocumentId: '',
                createdAt: new Date(Date.now() - 3600000 * 0.5).toISOString() // 30 минут назад
            }
        ];
        saveDatabase();
    }
}

function saveDatabase() {
    localStorage.setItem('iiko_writeoffs', JSON.stringify(appState.writeOffs));
}

function resetDatabase() {
    if (confirm("Вы уверены, что хотите сбросить базу данных? Все созданные вами списания будут удалены, и восстановятся стандартные примеры.")) {
        localStorage.removeItem('iiko_writeoffs');
        initDatabase();
        IikoSimulator.log('system', 'DATABASE RESET', 'Локальная база данных списаний была сброшена в исходное состояние.');
        
        // Перерендерить текущие экраны
        if (appState.currentUser) {
            renderEmployeeHistory();
            renderReviewerQueue();
            renderReviewerHistory();
            updateAnalyticsDashboard();
        }
    }
}


// --- РЕНДЕРИНГ ВВОДНЫХ ЭЛЕМЕНТОВ ---

// Генерация списка пользователей для логина
function renderUserLoginList() {
    const list = document.getElementById('login-users-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    // Фильтруем пользователей по роли симулятора
    const filtered = EMPLOYEES.filter(emp => emp.role === appState.currentRole);
    
    filtered.forEach(user => {
        const card = document.createElement('div');
        card.className = 'user-login-card';
        card.onclick = () => loginAs(user.id);
        
        card.innerHTML = `
            <div class="user-login-info">
                <span class="user-login-avatar">${user.avatar}</span>
                <div>
                    <div class="user-login-name">${user.name}</div>
                    <div class="user-login-role">${user.title}</div>
                </div>
            </div>
            <span class="arrow-indicator">➔</span>
        `;
        list.appendChild(card);
    });
}

// Заполнение выпадающих списков точек
function renderOutletSelectors() {
    const selector = document.getElementById('select-outlet');
    if (!selector) return;
    
    selector.innerHTML = '<option value="" disabled selected>Выберите подразделение...</option>';
    OUTLETS.forEach(outlet => {
        const opt = document.createElement('option');
        opt.value = outlet.id;
        opt.textContent = outlet.name;
        selector.appendChild(opt);
    });
    
    // Для фильтра в аналитике
    const filter = document.getElementById('filter-outlet');
    if (filter) {
        filter.innerHTML = '<option value="all">Все точки</option>';
        OUTLETS.forEach(outlet => {
            const opt = document.createElement('option');
            opt.value = outlet.id;
            opt.textContent = outlet.name;
            filter.appendChild(opt);
        });
    }
}

// Рендеринг списка сотрудников для удержания
function renderDeductionEmployeeSelector() {
    const selector = document.getElementById('select-deduction-employee');
    if (!selector) return;
    
    selector.innerHTML = '<option value="" disabled selected>Выберите сотрудника...</option>';
    
    // Выбираем только сотрудников с ролью 'employee'
    const list = EMPLOYEES.filter(emp => emp.role === 'employee');
    list.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        opt.textContent = emp.name;
        selector.appendChild(opt);
    });
}


// --- СИСТЕМА ВХОДА И ПЕРЕКЛЮЧЕНИЯ РОЛЕЙ ---

// Смена роли в симуляторе
function switchRole(role) {
    appState.currentRole = role;
    
    // Обновляем кнопки симулятора
    document.getElementById('btn-role-employee').classList.toggle('active', role === 'employee');
    document.getElementById('btn-role-reviewer').classList.toggle('active', role === 'reviewer');
    
    // При смене роли выходим из текущего пользователя
    logout();
}

// Логин под конкретным пользователем
function loginAs(userId) {
    const user = EMPLOYEES.find(u => u.id === userId);
    if (!user) return;
    
    appState.currentUser = user;
    
    // Настройка шапки приложения
    document.getElementById('header-avatar').textContent = user.avatar;
    document.getElementById('header-user-name').textContent = user.name;
    document.getElementById('header-user-role').textContent = user.title;
    
    document.getElementById('header-logo-section').style.display = 'none';
    document.getElementById('header-user-info-section').style.display = 'flex';
    document.getElementById('mobile-nav').style.display = 'block';
    
    // Настройка меню навигации
    document.getElementById('nav-employee').classList.toggle('active', user.role === 'employee');
    document.getElementById('nav-reviewer').classList.toggle('active', user.role === 'reviewer');
    
    // Перенаправление на дефолтные экраны роли
    if (user.role === 'employee') {
        switchMobileScreen('screen-writeoff-form');
    } else {
        switchMobileScreen('screen-reviewer-queue');
    }
}

// Разлогин
function logout() {
    appState.currentUser = null;
    
    document.getElementById('header-logo-section').style.display = 'flex';
    document.getElementById('header-user-info-section').style.display = 'none';
    document.getElementById('mobile-nav').style.display = 'none';
    
    // Возвращаем форму в дефолтное состояние
    resetWriteoffForm();
    
    // Перерендерить список пользователей для логина
    renderUserLoginList();
    switchMobileScreen('screen-login');
}

// Переключение вкладок в телефоне
function switchMobileScreen(screenId) {
    // Скрываем все экраны
    document.querySelectorAll('.screen-view').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Показываем нужный
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        appState.activeScreen = screenId;
    }
    
    // Обновляем подсветку пунктов меню навигации
    updateActiveNavItem(screenId);
    
    // Специфичный рендеринг при открытии экранов
    if (screenId === 'screen-employee-history') {
        renderEmployeeHistory();
    } else if (screenId === 'screen-reviewer-queue') {
        renderReviewerQueue();
    } else if (screenId === 'screen-reviewer-history') {
        renderReviewerHistory();
        updateAnalyticsDashboard();
    }
}

function updateActiveNavItem(screenId) {
    // Сбросить активные пункты во всех навигационных меню
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    if (screenId === 'screen-writeoff-form') {
        document.getElementById('nav-item-form')?.classList.add('active');
    } else if (screenId === 'screen-employee-history') {
        document.getElementById('nav-item-emphist')?.classList.add('active');
    } else if (screenId === 'screen-reviewer-queue') {
        document.getElementById('nav-item-queue')?.classList.add('active');
    } else if (screenId === 'screen-reviewer-history') {
        document.getElementById('nav-item-revhist')?.classList.add('active');
    }
}


// --- СЦЕНАРИЙ СОТРУДНИКА: ФОРМА И ВАЛИДАЦИЯ ---

// Сброс формы списания
function resetWriteoffForm() {
    const form = document.getElementById('writeoff-form');
    if (form) form.reset();
    
    appState.selectedProduct = null;
    appState.currentPhotoBase64 = null;
    
    document.getElementById('selected-product-text').textContent = 'Выберите продукт из каталога...';
    document.getElementById('selected-product-id').value = '';
    document.getElementById('input-amount').value = '1';
    document.getElementById('estimated-cost-display').textContent = '0 ₽';
    
    toggleDeductionEmployee(false);
    clearPhoto();
    validateComment();
}

// Открытие модального окна выбора продукта
function openProductModal() {
    document.getElementById('product-modal').classList.remove('hidden');
    filterProducts(); // Отрисовываем полный список
}

function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
    document.getElementById('product-search').value = '';
}

// Генерация категорий и карточек продуктов в модальном окне
let activeCategory = 'all';

function renderProductSelectorModal() {
    const catContainer = document.getElementById('product-categories');
    if (!catContainer) return;
    
    // Собираем уникальные категории
    const categories = ['all', ...new Set(PRODUCTS.map(p => p.category))];
    
    catContainer.innerHTML = '';
    categories.forEach(cat => {
        const tab = document.createElement('div');
        tab.className = `category-tab ${cat === activeCategory ? 'active' : ''}`;
        tab.textContent = cat === 'all' ? 'Все товары' : cat;
        tab.onclick = () => {
            activeCategory = cat;
            renderProductSelectorModal(); // перерендерить вкладки
            filterProducts(); // отфильтровать список товаров
        };
        catContainer.appendChild(tab);
    });
}

function filterProducts() {
    const grid = document.getElementById('modal-product-grid');
    if (!grid) return;
    
    const query = document.getElementById('product-search').value.toLowerCase();
    
    grid.innerHTML = '';
    
    const filtered = PRODUCTS.filter(p => {
        const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
        const matchesSearch = p.name.toLowerCase().includes(query) || p.code.toLowerCase().includes(query);
        return matchesCategory && matchesSearch;
    });
    
    if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 20px;">Ничего не найдено</div>';
        return;
    }
    
    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => selectProduct(p.id);
        
        card.innerHTML = `
            <div class="product-card-img" style="background-color: var(--bg-input); display: flex; align-items: center; justify-content: center; font-size: 1.8rem;">
                ${p.avatar}
            </div>
            <div class="product-card-title">${p.name}</div>
            <div class="product-card-price">${p.price} ₽</div>
        `;
        grid.appendChild(card);
    });
}

// Клик по товару в модальном окне
function selectProduct(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    
    appState.selectedProduct = product;
    
    document.getElementById('selected-product-text').textContent = `${product.name} (Код: ${product.code})`;
    document.getElementById('selected-product-id').value = product.id;
    
    calculateEstimatedCost();
    closeProductModal();
    validateFormFields();
}

// Регулировка количества кнопками +/-
function adjustAmount(diff) {
    const input = document.getElementById('input-amount');
    if (!input) return;
    
    let val = parseInt(input.value, 10) || 1;
    val = Math.max(1, val + diff);
    input.value = val;
    
    calculateEstimatedCost();
}

// Расчет предварительной стоимости
function calculateEstimatedCost() {
    const display = document.getElementById('estimated-cost-display');
    const input = document.getElementById('input-amount');
    
    if (!display || !input) return;
    
    const amount = parseInt(input.value, 10) || 0;
    
    if (appState.selectedProduct) {
        const total = appState.selectedProduct.price * amount;
        display.textContent = `${total} ₽`;
    } else {
        display.textContent = '0 ₽';
    }
}

// Показать/скрыть выбор сотрудника при типе "С удержанием"
function toggleDeductionEmployee(show) {
    const group = document.getElementById('deduction-employee-group');
    const select = document.getElementById('select-deduction-employee');
    
    if (show) {
        group.classList.remove('hidden');
        select.setAttribute('required', 'required');
    } else {
        group.classList.add('hidden');
        select.removeAttribute('required');
        select.value = '';
    }
    validateFormFields();
}

// Загрузка фото через файл
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        setPhotoData(e.target.result);
    };
    reader.readAsDataURL(file);
}

// Установка фото-пресетов (Быстрый выбор для хакатона)
function usePresetPhoto(type) {
    if (PHOTO_PRESETS[type]) {
        setPhotoData(PHOTO_PRESETS[type]);
    }
}

// Общая логика установки картинки в состояние формы
function setPhotoData(base64Data) {
    appState.currentPhotoBase64 = base64Data;
    document.getElementById('photo-data-url').value = base64Data;
    
    const img = document.getElementById('photo-preview');
    img.src = base64Data;
    
    document.getElementById('upload-placeholder').classList.add('hidden');
    document.getElementById('photo-preview-container').classList.remove('hidden');
    
    validateFormFields();
}

// Удалить выбранное фото
function clearPhoto() {
    appState.currentPhotoBase64 = null;
    document.getElementById('photo-data-url').value = '';
    document.getElementById('input-photo-file').value = '';
    
    document.getElementById('upload-placeholder').classList.remove('hidden');
    document.getElementById('photo-preview-container').classList.add('hidden');
    
    validateFormFields();
}

// Валидация комментария (минимум 10 символов)
function validateComment() {
    const textarea = document.getElementById('input-comment');
    const counter = document.getElementById('char-counter');
    
    if (!textarea || !counter) return;
    
    const text = textarea.value.trim();
    const len = text.length;
    
    counter.textContent = `${len} / 10 символов`;
    
    if (len < 10) {
        counter.className = 'char-counter error';
    } else {
        counter.className = 'char-counter success';
    }
    
    validateFormFields();
}

// Полная валидация полей формы для активации кнопки "Отправить"
function validateFormFields() {
    const btn = document.getElementById('submit-writeoff-btn');
    if (!btn) return;
    
    const hasOutlet = document.getElementById('select-outlet').value !== '';
    const hasProduct = appState.selectedProduct !== null;
    const hasPhoto = appState.currentPhotoBase64 !== null;
    
    const commentText = document.getElementById('input-comment').value.trim();
    const hasValidComment = commentText.length >= 10;
    
    // Если выбрано удержание, должен быть выбран сотрудник
    const typeCardsVal = document.querySelector('input[name="writeoff-type"]:checked').value;
    let hasEmployeeDeduction = true;
    if (typeCardsVal === 'deduction') {
        hasEmployeeDeduction = document.getElementById('select-deduction-employee').value !== '';
    }
    
    const isValid = hasOutlet && hasProduct && hasPhoto && hasValidComment && hasEmployeeDeduction;
    btn.disabled = !isValid;
}

// Клик на область загрузки активирует скрытый input
document.addEventListener('DOMContentLoaded', () => {
    const uploadZone = document.getElementById('photo-upload-zone');
    const inputPhoto = document.getElementById('input-photo-file');
    
    if (uploadZone && inputPhoto) {
        uploadZone.addEventListener('click', (e) => {
            // Превращаем клик по зоне в клик по инпуту, только если мы кликнули не на крестик удаления фото
            if (!e.target.classList.contains('remove-photo-btn')) {
                inputPhoto.click();
            }
        });
    }
});


// --- ОБРАБОТКА ОТПРАВКИ ЗАЯВКИ НА СПИСАНИЕ ---

function handleWriteoffSubmit(event) {
    event.preventDefault();
    
    if (!appState.currentUser) return;
    
    const outletSelect = document.getElementById('select-outlet');
    const outletId = outletSelect.value;
    const outletName = outletSelect.options[outletSelect.selectedIndex].text;
    
    const amount = parseInt(document.getElementById('input-amount').value, 10);
    const type = document.querySelector('input[name="writeoff-type"]:checked').value;
    
    let deductedEmployeeId = null;
    let deductedEmployeeName = '';
    
    if (type === 'deduction') {
        const empSelect = document.getElementById('select-deduction-employee');
        deductedEmployeeId = empSelect.value;
        deductedEmployeeName = empSelect.options[empSelect.selectedIndex].text;
    }
    
    const comment = document.getElementById('input-comment').value.trim();
    const estimatedCost = appState.selectedProduct.price * amount;
    
    // Создаем новую запись списания
    const newWriteoff = {
        id: 'wo-' + Date.now(),
        outletId,
        outletName,
        productId: appState.selectedProduct.id,
        productName: appState.selectedProduct.name,
        productPrice: appState.selectedProduct.price,
        amount,
        estimatedCost,
        type,
        deductedEmployeeId,
        deductedEmployeeName,
        photoUrl: appState.currentPhotoBase64,
        comment,
        creatorId: appState.currentUser.id,
        creatorName: appState.currentUser.name,
        status: 'pending',
        rejectionReason: '',
        iikoSynced: false,
        iikoDocumentId: '',
        createdAt: new Date().toISOString()
    };
    
    // Сохраняем в память и хранилище
    appState.writeOffs.unshift(newWriteoff);
    saveDatabase();
    
    // Логируем в консоль интеграции
    IikoSimulator.log('system', 'APPLICATION FORWRITE-OFF CREATED', `Сотрудник ${appState.currentUser.name} создал заявку на списание: ${appState.selectedProduct.name} x${amount} (${outletName}). Статус: На проверке.`);
    
    // Анимация успешной отправки
    showSubmitSuccessAnimation(() => {
        resetWriteoffForm();
        switchMobileScreen('screen-employee-history');
    });
}

// Красивое оверлей-уведомление об успешной отправке
function showSubmitSuccessAnimation(callback) {
    const screen = document.getElementById('phone-screen');
    
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(11, 15, 25, 0.95)';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '300';
    overlay.style.animation = 'fadeIn 0.2s ease-out';
    
    overlay.innerHTML = `
        <div style="width: 80px; height: 80px; border-radius: 50%; background-color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin-bottom: 20px; box-shadow: 0 0 20px var(--color-primary); animation: scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.1s forwards; transform: scale(0);">
            ✓
        </div>
        <h3 style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 700; margin-bottom: 8px;">Заявка отправлена</h3>
        <p style="font-size: 0.8rem; color: var(--text-secondary); text-align: center; max-width: 220px;">Менеджер проверит информацию в ближайшее время</p>
    `;
    
    // Добавим анимацию scaleUp в стили, если ее еще нет
    if (!document.getElementById('temp-animation-style')) {
        const style = document.createElement('style');
        style.id = 'temp-animation-style';
        style.innerHTML = `
            @keyframes scaleUp {
                to { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
    
    screen.appendChild(overlay);
    
    setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.2s ease-out';
        setTimeout(() => {
            overlay.remove();
            if (callback) callback();
        }, 200);
    }, 1800);
}


// --- РЕНДЕРИНГ ИСТОРИИ СОТРУДНИКА ---

function renderEmployeeHistory() {
    const container = document.getElementById('employee-history-list');
    if (!container || !appState.currentUser) return;
    
    container.innerHTML = '';
    
    // Фильтруем списания, отправленные именно этим пользователем
    const myHistory = appState.writeOffs.filter(wo => wo.creatorId === appState.currentUser.id);
    
    if (myHistory.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 10px; color: var(--text-muted);">
                <div style="font-size: 2.5rem; margin-bottom: 10px;">📋</div>
                <div style="font-size: 0.85rem; font-weight: 600;">У вас пока нет списаний</div>
                <div style="font-size: 0.72rem; margin-top: 4px;">Все созданные вами акты появятся в этом списке.</div>
            </div>
        `;
        return;
    }
    
    myHistory.forEach(item => {
        const card = document.createElement('div');
        card.className = 'history-card';
        
        const dateStr = new Date(item.createdAt).toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });
        
        let statusText = 'На проверке';
        let statusClass = 'status-pending';
        
        if (item.status === 'approved') {
            statusText = 'Утверждено';
            statusClass = 'status-approved';
        } else if (item.status === 'rejected') {
            statusText = 'Отклонено';
            statusClass = 'status-rejected';
        }
        
        let typeText = item.type === 'deduction' 
            ? `С удержанием с: ${item.deductedEmployeeName}` 
            : 'Без удержания';
            
        let footerHtml = '';
        if (item.status === 'rejected' && item.rejectionReason) {
            footerHtml += `
                <div class="history-card-rejection">
                    <strong>Причина отказа:</strong> ${item.rejectionReason}
                </div>
            `;
        }
        
        if (item.status === 'approved' && item.iikoSynced) {
            footerHtml += `
                <div class="history-card-iiko-status">
                    <span class="status-dot online" style="width: 6px; height: 6px; box-shadow: none;"></span>
                    <span>Акт списания IIKO создан: </span>
                    <span class="iiko-synced-badge">${item.iikoDocumentId}</span>
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="history-card-header">
                <img src="${item.photoUrl}" class="history-card-img" alt="${item.productName}">
                <div class="history-card-info">
                    <div class="history-card-title">${item.productName}</div>
                    <div class="history-card-meta">
                        <span>x${item.amount} • ${item.estimatedCost} ₽</span>
                        <span>${dateStr}</span>
                    </div>
                    <div class="history-card-meta">
                        <span style="color: var(--text-muted);">${item.outletName}</span>
                    </div>
                    <div style="font-size: 0.65rem; color: var(--text-secondary); margin-top: 2px;">
                        ${typeText}
                    </div>
                </div>
                <div class="history-card-status-badge ${statusClass}">${statusText}</div>
            </div>
            <div class="history-card-footer">
                <div class="history-card-comment">"${item.comment}"</div>
                ${footerHtml}
            </div>
        `;
        
        container.appendChild(card);
    });
}


// --- СЦЕНАРИЙ ПРОВЕРЯЮЩЕГО: ОЧЕРЕДЬ ЗАЯВОК ---

function renderReviewerQueue() {
    const container = document.getElementById('reviewer-queue-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Получаем заявки со статусом 'pending'
    const pendingItems = appState.writeOffs.filter(wo => wo.status === 'pending');
    
    if (pendingItems.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 10px; color: var(--text-muted);">
                <div style="font-size: 2.5rem; margin-bottom: 10px;">✨</div>
                <div style="font-size: 0.85rem; font-weight: 600;">Нет заявок на проверку</div>
                <div style="font-size: 0.72rem; margin-top: 4px;">Все новые заявки от сотрудников появятся здесь.</div>
            </div>
        `;
        return;
    }
    
    pendingItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'queue-card';
        card.id = `queue-card-${item.id}`;
        
        const dateStr = new Date(item.createdAt).toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });
        
        const typePill = item.type === 'deduction'
            ? `<span class="type-pill danger">Удержание с: ${item.deductedEmployeeName}</span>`
            : '<span class="type-pill">Без удержания</span>';
            
        card.innerHTML = `
            <div class="queue-card-hero">
                <img src="${item.photoUrl}" alt="${item.productName}">
                <div class="queue-card-cost-badge">${item.estimatedCost} ₽</div>
                <div class="queue-card-outlet-badge">${item.outletName.split(' • ')[0]}</div>
            </div>
            
            <div class="queue-card-body">
                <div class="queue-card-details">
                    <div class="queue-card-title">${item.productName} (x${item.amount})</div>
                    <div class="queue-card-sender">Отправил: <b>${item.creatorName}</b> • ${dateStr}</div>
                    <div class="queue-card-type-row">
                        ${typePill}
                    </div>
                </div>
                
                <div class="queue-card-comment-box">
                    "${item.comment}"
                </div>
            </div>
            
            <div class="queue-card-actions" id="actions-block-${item.id}">
                <button class="btn btn-secondary" onclick="openRejectModal('${item.id}')">Отклонить</button>
                <button class="btn btn-primary" onclick="approveRequest('${item.id}')">Утвердить</button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Действие: Подтвердить и списать в IIKO
async function approveRequest(id) {
    const item = appState.writeOffs.find(wo => wo.id === id);
    if (!item) return;
    
    // Блокируем кнопки в карточке во время загрузки
    const actionsBlock = document.getElementById(`actions-block-${id}`);
    if (actionsBlock) {
        actionsBlock.innerHTML = `
            <div style="grid-column: 1/-1; display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--color-primary); font-size: 0.8rem; font-weight: 600; padding: 4px;">
                <span class="status-dot online" style="animation: pulse 1s infinite;"></span>
                Синхронизация с IIKO...
            </div>
        `;
    }
    
    // Формируем payload для симулятора API IIKO
    const writeOffData = {
        productId: item.productId,
        amount: item.amount,
        estimatedCost: item.estimatedCost,
        type: item.type,
        deductedEmployee: item.deductedEmployeeName,
        comment: item.comment,
        creator: item.creatorName
    };
    
    // Запускаем полную интеграционную цепочку запросов
    const apiResult = await IikoSimulator.runFullIntegrationSequence(item.outletId, writeOffData);
    
    if (apiResult.success) {
        // Успешно провели списание
        item.status = 'approved';
        item.iikoSynced = true;
        item.iikoDocumentId = apiResult.documentId;
        
        saveDatabase();
        
        // Красивая анимация исчезновения карточки из очереди
        animateRemoveQueueCard(id, () => {
            renderReviewerQueue();
            renderReviewerHistory();
            updateAnalyticsDashboard();
        });
    } else {
        // Ошибка синхронизации с IIKO (например, включен сбой API)
        if (actionsBlock) {
            // Восстанавливаем кнопки, но с выводом ошибки
            actionsBlock.innerHTML = `
                <button class="btn btn-secondary" onclick="openRejectModal('${id}')">Отклонить</button>
                <button class="btn btn-primary" onclick="approveRequest('${id}')">Утвердить</button>
            `;
        }
        alert(`Сбой интеграции с IIKO: ${apiResult.error}. Исправьте ошибки в панели симулятора и повторите попытку.`);
    }
}

// Анимация удаления карточки
function animateRemoveQueueCard(id, callback) {
    const card = document.getElementById(`queue-card-${id}`);
    if (!card) {
        if (callback) callback();
        return;
    }
    
    card.style.transition = 'all 0.4s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.9) translateY(-20px)';
    card.style.maxHeight = '0px';
    card.style.padding = '0px';
    card.style.margin = '0px';
    
    setTimeout(callback, 400);
}


// --- МОДАЛЬНОЕ ОКНО ОТКЛОНЕНИЯ ---

function openRejectModal(id) {
    appState.activeRejectingId = id;
    document.getElementById('reject-reason-input').value = '';
    document.getElementById('reject-modal').classList.remove('hidden');
}

function closeRejectModal() {
    document.getElementById('reject-modal').classList.add('hidden');
    appState.activeRejectingId = null;
}

function submitRejection() {
    const id = appState.activeRejectingId;
    const reasonInput = document.getElementById('reject-reason-input');
    const reason = reasonInput.value.trim();
    
    if (!reason) {
        alert("Пожалуйста, введите причину отклонения заявки.");
        return;
    }
    
    const item = appState.writeOffs.find(wo => wo.id === id);
    if (item) {
        item.status = 'rejected';
        item.rejectionReason = reason;
        item.iikoSynced = false;
        
        saveDatabase();
        
        IikoSimulator.log('system', 'APPLICATION REJECTED BY MANAGER', `Менеджер ${appState.currentUser.name} отклонил заявку списания #${id}. Причина: "${reason}"`);
        
        closeRejectModal();
        animateRemoveQueueCard(id, () => {
            renderReviewerQueue();
            renderReviewerHistory();
            updateAnalyticsDashboard();
        });
    }
}


// --- СЦЕНАРИЙ ПРОВЕРЯЮЩЕГО: ИСТОРИЯ И АНАЛИТИКА ---

function renderReviewerHistory() {
    const container = document.getElementById('reviewer-all-history-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    const filterOutlet = document.getElementById('filter-outlet').value;
    const filterStatus = document.getElementById('filter-status').value;
    
    // Фильтруем данные
    const filtered = appState.writeOffs.filter(wo => {
        const matchesOutlet = filterOutlet === 'all' || wo.outletId === filterOutlet;
        const matchesStatus = filterStatus === 'all' || wo.status === filterStatus;
        return matchesOutlet && matchesStatus;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">Нет данных по выбранным фильтрам</div>';
        return;
    }
    
    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'history-card';
        
        const dateStr = new Date(item.createdAt).toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });
        
        let statusText = 'На проверке';
        let statusClass = 'status-pending';
        if (item.status === 'approved') {
            statusText = 'Утверждено';
            statusClass = 'status-approved';
        } else if (item.status === 'rejected') {
            statusText = 'Отклонено';
            statusClass = 'status-rejected';
        }
        
        let typeText = item.type === 'deduction' 
            ? `С удержанием с: ${item.deductedEmployeeName}` 
            : 'Без удержания';
            
        let footerHtml = '';
        if (item.status === 'rejected' && item.rejectionReason) {
            footerHtml += `
                <div class="history-card-rejection">
                    <strong>Причина отказа:</strong> ${item.rejectionReason}
                </div>
            `;
        }
        
        if (item.status === 'approved' && item.iikoSynced) {
            footerHtml += `
                <div class="history-card-iiko-status">
                    <span class="status-dot online" style="width: 6px; height: 6px; box-shadow: none;"></span>
                    <span>Синхронизировано с IIKO: </span>
                    <span class="iiko-synced-badge">${item.iikoDocumentId}</span>
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="history-card-header">
                <img src="${item.photoUrl}" class="history-card-img" alt="${item.productName}">
                <div class="history-card-info">
                    <div class="history-card-title">${item.productName}</div>
                    <div class="history-card-meta">
                        <span>x${item.amount} • ${item.estimatedCost} ₽</span>
                        <span>${dateStr}</span>
                    </div>
                    <div class="history-card-meta">
                        <span>Точка: ${item.outletName.split(' • ')[0]}</span>
                    </div>
                    <div class="history-card-meta">
                        <span>Отправитель: ${item.creatorName}</span>
                    </div>
                    <div style="font-size: 0.65rem; color: var(--text-secondary); margin-top: 2px;">
                        ${typeText}
                    </div>
                </div>
                <div class="history-card-status-badge ${statusClass}">${statusText}</div>
            </div>
            <div class="history-card-footer">
                <div class="history-card-comment">"${item.comment}"</div>
                ${footerHtml}
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Расчет KPI и отрисовка красивых графиков в аналитике
function updateAnalyticsDashboard() {
    // 1. Расчет KPI
    const totalCostSpan = document.getElementById('kpi-total-cost');
    const approvedCountSpan = document.getElementById('kpi-approved-count');
    const deductionPercentSpan = document.getElementById('kpi-deduction-percent');
    
    if (!totalCostSpan || !approvedCountSpan || !deductionPercentSpan) return;
    
    // Считаем только по одобренным актам для баланса
    const approvedActs = appState.writeOffs.filter(wo => wo.status === 'approved');
    const totalCost = approvedActs.reduce((sum, wo) => sum + wo.estimatedCost, 0);
    const approvedCount = approvedActs.length;
    
    // Процент удержаний среди одобренных
    let deductionPercent = 0;
    if (approvedCount > 0) {
        const deductionCount = approvedActs.filter(wo => wo.type === 'deduction').length;
        deductionPercent = Math.round((deductionCount / approvedCount) * 100);
    }
    
    totalCostSpan.textContent = `${totalCost} ₽`;
    approvedCountSpan.textContent = approvedCount;
    deductionPercentSpan.textContent = `${deductionPercent}%`;
    
    // 2. Построение гистограммы по точкам (Outlet chart)
    const barsContainer = document.getElementById('chart-outlets-bars');
    if (!barsContainer) return;
    
    barsContainer.innerHTML = '';
    
    // Группируем списания (по суммам) по точкам
    const outletStats = {};
    OUTLETS.forEach(out => {
        outletStats[out.id] = {
            name: out.name.split(' • ')[0],
            total: 0
        };
    });
    
    approvedActs.forEach(wo => {
        if (outletStats[wo.outletId]) {
            outletStats[wo.outletId].total += wo.estimatedCost;
        }
    });
    
    const statsArray = Object.values(outletStats);
    const maxVal = Math.max(...statsArray.map(s => s.total), 100); // 100 рублей минимум как масштаб
    
    statsArray.forEach(stat => {
        const percent = Math.min(100, Math.round((stat.total / maxVal) * 100));
        
        const row = document.createElement('div');
        row.className = 'chart-bar-row';
        
        row.innerHTML = `
            <div class="chart-bar-info">
                <span class="chart-bar-label">${stat.name}</span>
                <span class="chart-bar-val">${stat.total} ₽</span>
            </div>
            <div class="chart-bar-track">
                <div class="chart-bar-fill" style="width: ${percent}%"></div>
            </div>
        `;
        
        barsContainer.appendChild(row);
    });
}
