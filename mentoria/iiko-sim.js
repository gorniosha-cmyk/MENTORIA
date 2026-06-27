/**
 * IIKO Cloud API Simulator
 * Симулирует реальные сетевые запросы к API IIKO Cloud,
 * логирует прохождение трафика в специальную консоль на экране.
 */

const IikoSimulator = {
    // Вспомогательный метод добавления записи в лог-панель
    log(type, header, message, rawBody = null) {
        const consoleLogs = document.getElementById('console-logs');
        if (!consoleLogs) return;

        const time = new Date().toLocaleTimeString('ru-RU');
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        
        let bodyHtml = '';
        if (rawBody) {
            const bodyStr = typeof rawBody === 'object' ? JSON.stringify(rawBody, null, 2) : rawBody;
            bodyHtml = `<pre class="log-body">${this.escapeHtml(bodyStr)}</pre>`;
        }
        
        logEntry.innerHTML = `
            <div>
                <span class="log-time">[${time}]</span>
                <span class="log-header">${header}</span>
                <span class="log-message">${message}</span>
            </div>
            ${bodyHtml}
        `;
        
        consoleLogs.appendChild(logEntry);
        consoleLogs.scrollTop = consoleLogs.scrollHeight;
    },

    // Очистить логи в консоли
    clearLogs() {
        const consoleLogs = document.getElementById('console-logs');
        if (consoleLogs) {
            consoleLogs.innerHTML = `
                <div class="log-entry system">
                    <span class="log-time">[${new Date().toLocaleTimeString('ru-RU')}]</span>
                    <span class="log-message">Логи очищены. Ожидание транзакций списания...</span>
                </div>
            `;
        }
    },

    escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    // Получить установленную задержку в мс
    getNetworkDelay() {
        const slider = document.getElementById('simulation-delay');
        return slider ? parseInt(slider.value, 10) : 800;
    },

    // Должен ли запрос вернуть ошибку (чекбокс сбоя IIKO)
    shouldSimulateError() {
        const checkbox = document.getElementById('toggle-iiko-error');
        return checkbox ? checkbox.checked : false;
    },

    // Вспомогательная функция для имитации сетевого запроса
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Симуляция шага 1: Получение авторизационного токена IIKO Cloud
     * POST /api/1/access_token
     */
    async getAccessToken() {
        const delayMs = this.getNetworkDelay();
        const apiLogin = "hackathon_login_key_2026_rf";
        
        this.log('request', 'POST /api/1/access_token', 'Запрос авторизационного токена по API-ключу', { apiLogin });
        
        await this.delay(delayMs);
        
        if (this.shouldSimulateError()) {
            const errRes = {
                "errorDescription": "Истек срок действия лицензии IIKO API или неверный API-ключ",
                "errorCode": "IIKO_API_LICENSE_EXPIRED"
            };
            this.log('error', 'HTTP/1.1 401 Unauthorized', 'Ошибка авторизации API IIKO', errRes);
            throw new Error("IIKO API License error");
        }

        const successRes = {
            "token": "tok_9f3b77a1e05d4fb1a78dcebe15c2" + Math.floor(Math.random() * 1000)
        };
        
        this.log('response', 'HTTP/1.1 200 OK', 'Токен успешно сгенерирован', successRes);
        return successRes.token;
    },

    /**
     * Симуляция шага 2: Сверка торговой точки
     * POST /api/1/organizations
     */
    async verifyOrganization(token, organizationId) {
        const delayMs = this.getNetworkDelay();
        
        this.log('request', 'POST /api/1/organizations', 'Проверка статуса торговой точки', { 
            headers: { "Authorization": `Bearer ${token}` },
            organizationIds: [organizationId]
        });
        
        await this.delay(delayMs);
        
        if (this.shouldSimulateError()) {
            const errRes = {
                "errorDescription": "Торговая точка временно недоступна (IIKO RMS Server Offline)",
                "errorCode": "IIKO_OUTLET_OFFLINE"
            };
            this.log('error', 'HTTP/1.1 503 Service Unavailable', 'Ошибка подключения к кассе торговой точки', errRes);
            throw new Error("Outlet offline");
        }

        const successRes = {
            "organizations": [
                {
                    "id": organizationId,
                    "name": "Выбранное подразделение IIKO",
                    "isActive": true
                }
            ]
        };
        
        this.log('response', 'HTTP/1.1 200 OK', 'Статус торговой точки подтвержден (Активна)', successRes);
        return true;
    },

    /**
     * Симуляция шага 3: Сверка номенклатуры (наличия товара и кода списания)
     * POST /api/1/nomenclature
     */
    async checkNomenclature(token, organizationId, productId) {
        const delayMs = this.getNetworkDelay();
        
        this.log('request', 'POST /api/1/nomenclature', 'Получение карточки товара и сверка остатков', {
            headers: { "Authorization": `Bearer ${token}` },
            organizationId: organizationId,
            productId: productId
        });
        
        await this.delay(delayMs);
        
        if (this.shouldSimulateError()) {
            const errRes = {
                "errorDescription": "Ошибка сопоставления номенклатуры IIKO. Товар не найден в меню кассы.",
                "errorCode": "IIKO_NOMENCLATURE_NOT_FOUND"
            };
            this.log('error', 'HTTP/1.1 400 Bad Request', 'Товар отсутствует в номенклатуре точки', errRes);
            throw new Error("Nomenclature match error");
        }

        const successRes = {
            "productId": productId,
            "code": "PRD-" + Math.floor(1000 + Math.random() * 9000),
            "currentStock": parseFloat((Math.random() * 50 + 5).toFixed(2)),
            "unit": "кг"
        };
        
        this.log('response', 'HTTP/1.1 200 OK', 'Товар найден. Текущие остатки в IIKO сверены.', successRes);
        return successRes;
    },

    /**
     * Симуляция шага 4: Создание документа списания в базе IIKO Office
     * POST /api/1/documents/write_off
     */
    async postWriteOffDocument(token, organizationId, writeOffData) {
        const delayMs = this.getNetworkDelay();
        
        const payload = {
            "organizationId": organizationId,
            "writeOffDocument": {
                "date": new Date().toISOString().replace('T', ' ').substring(0, 19),
                "items": [
                    {
                        "productId": writeOffData.productId,
                        "amount": writeOffData.amount,
                        "sku": writeOffData.sku,
                        "estimatedCost": writeOffData.estimatedCost
                    }
                ],
                "writeOffReason": writeOffData.type === 'deduction' ? 'С удержанием с сотрудника' : 'Без удержания (амортизация)',
                "deductedEmployee": writeOffData.deductedEmployee || null,
                "comment": writeOffData.comment,
                "photoUrlAttached": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...", // Сокращенный base64
                "creator": writeOffData.creator
            }
        };

        this.log('request', 'POST /api/1/documents/write_off', 'Отправка акта списания в IIKO Cloud', payload);
        
        await this.delay(delayMs);
        
        if (this.shouldSimulateError()) {
            const errRes = {
                "errorDescription": "Ошибка создания документа списания. Отрицательный баланс или блокировка периода списаний в IIKO Office.",
                "errorCode": "IIKO_WRITE_OFF_BLOCKED_PERIOD"
            };
            this.log('error', 'HTTP/1.1 409 Conflict', 'Ошибка создания документа списания в IIKO', errRes);
            throw new Error("Write-off document blocked");
        }

        const generatedDocId = "doc-" + Math.floor(10000000 + Math.random() * 90000000);
        const finalStock = Math.max(0, writeOffData.currentStock - writeOffData.amount);
        
        const successRes = {
            "documentId": generatedDocId,
            "status": "PROCESSED",
            "stockSyncStatus": "SUCCESS",
            "originalStock": writeOffData.currentStock,
            "removedAmount": writeOffData.amount,
            "remainingStock": parseFloat(finalStock.toFixed(2)),
            "processedTime": new Date().toISOString()
        };
        
        this.log('response', 'HTTP/1.1 200 OK', 'Акт списания успешно создан в IIKO. Остатки обновлены.', successRes);
        return successRes;
    },

    /**
     * Оркестратор интеграционного процесса.
     * Последовательно запускает цепочку API-запросов к IIKO.
     */
    async runFullIntegrationSequence(organizationId, writeOffData) {
        this.log('system', 'IIKO INTEGRATION', 'Запущена фоновая синхронизация списания с IIKO...');
        
        try {
            // Шаг 1: Авторизация
            const token = await this.getAccessToken();
            
            // Шаг 2: Проверка точки
            await this.verifyOrganization(token, organizationId);
            
            // Шаг 3: Проверка номенклатуры и остатков
            const nomResult = await this.checkNomenclature(token, organizationId, writeOffData.productId);
            
            // Обогащаем данные товара перед финальной отправкой
            const writeOffPayload = {
                ...writeOffData,
                sku: nomResult.code,
                currentStock: nomResult.currentStock
            };
            
            // Шаг 4: Создание документа списания
            const finalDoc = await this.postWriteOffDocument(token, organizationId, writeOffPayload);
            
            this.log('system', 'IIKO INTEGRATION SUCCESS', `Списание успешно проведено! ID документа: ${finalDoc.documentId}. Остаток товара в IIKO: ${finalDoc.remainingStock} кг.`);
            
            return {
                success: true,
                documentId: finalDoc.documentId,
                remainingStock: finalDoc.remainingStock
            };
        } catch (error) {
            this.log('system', 'IIKO INTEGRATION FAILED', `Синхронизация списания прервана из-за ошибки API. Проверьте параметры сети.`);
            return {
                success: false,
                error: error.message
            };
        }
    }
};

// Привяжем очистку консоли к глобальной области видимости
function clearConsole() {
    IikoSimulator.clearLogs();
}

// Привязка обновления числовой подписи задержки к ползунку
document.addEventListener('DOMContentLoaded', () => {
    const delaySlider = document.getElementById('simulation-delay');
    const delayValue = document.getElementById('delay-value');
    
    if (delaySlider && delayValue) {
        delaySlider.addEventListener('input', (e) => {
            const sec = (e.target.value / 1000).toFixed(1);
            delayValue.textContent = `${sec}с`;
        });
    }
});
