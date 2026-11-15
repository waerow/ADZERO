ADZERO 3.1.0
Browse without noise

============================================================
РУССКИЙ
============================================================

О ADZERO
ADZERO — расширение для браузеров на базе Chromium, которое использует
Declarative Net Request и косметическую фильтрацию для уменьшения рекламы
и отслеживания на сайтах.

УСТАНОВКА В MICROSOFT EDGE
1. Распакуйте ZIP-архив в отдельную папку.
2. Откройте edge://extensions.
3. Включите «Режим разработчика».
4. Нажмите «Загрузить распакованное» и выберите папку ADZERO
   (в ней должен находиться manifest.json).
5. Обновите открытые вкладки сочетанием Ctrl+R.

УСТАНОВКА В GOOGLE CHROME
1. Распакуйте ZIP-архив.
2. Откройте chrome://extensions.
3. Включите «Режим разработчика».
4. Нажмите «Загрузить распакованное» и выберите папку ADZERO.
5. Обновите открытые вкладки.

ОСНОВНЫЕ ВОЗМОЖНОСТИ
- Глобальное включение и выключение защиты.
- Исключения для отдельных сайтов.
- My Filters: пользовательские сетевые правила блокировки и разрешения
  доменов или URL (HTTP/HTTPS); добавление, редактирование, включение,
  отключение и удаление правил.
- Block History: локальная история событий блокировки, которые браузер
  фактически предоставляет через DNR feedback API; поиск и фильтры,
  просмотр источника правила, разрешение и повторная блокировка URL.
- Element Picker: выбор элемента страницы и сохранение CSS-правила
  для конкретного hostname.
- Site Protection: временная пауза защиты на 5 или 30 минут и
  автоматическое восстановление; постоянное исключение сайта отдельно.
- Statistics: сводка доступных событий DNR за 24 часа, 7 и 30 дней.
- Smart Explanation: объяснение по фактическим метаданным события блокировки.
- Filter Packs: отдельное управление встроенными наборами рекламы и трекеров.
- Protection Modes: Standard, Strict и Custom.
- Import / Export: перенос поддерживаемых настроек, пользовательских
  сетевых фильтров и CSS-правил Element Picker через JSON.
- Website Problem Report: локальная диагностическая сводка,
  которую пользователь может просмотреть и скопировать самостоятельно.
- Интерфейс на русском и английском языках.

КОНФИДЕНЦИАЛЬНОСТЬ И ХРАНЕНИЕ
Пользовательские настройки, фильтры, CSS-правила и доступная история
хранятся локально в chrome.storage.local. Website Problem Report
формируется локально и не отправляется автоматически. В этой сборке
не реализована телеметрия или автоматическая отправка истории посещений.

ВАЖНЫЕ ОГРАНИЧЕНИЯ
- ADZERO не гарантирует блокировку всей рекламы. Реклама, встроенная
  в контент сайта, first-party реклама, новые рекламные домены и часть
  видеорекламы (включая YouTube in-stream/mid-roll) могут оставаться.
- Block History не является полным журналом сетевого трафика. История
  зависит от событий, которые браузер предоставляет через
  declarativeNetRequestFeedback; доступность и полнота могут различаться.
- Счётчик скрытых элементов показывает распознанные DOM-элементы,
  а не количество заблокированных сетевых запросов.
- Статистика сетевых блокировок учитывает только доступные события DNR.
- Подавление всплывающих окон не гарантируется.
- Некоторые домены аналитики могут обслуживать полезные функции сайтов.
  Если сайт работает неправильно, попробуйте временно приостановить
  защиту или добавить исключение.
- Для Element Picker могут быть недоступны внутренние страницы браузера,
  страницы расширений и сайты, где браузер не внедряет content scripts.
- В manifest остаются широкие host_permissions для HTTP и HTTPS сайтов.
  Перед публикацией в магазине следует повторно оценить необходимость
  этих разрешений и подготовить объяснение для ревью.

СТАТУС
Эта сборка проверена пользователем в Microsoft Edge и Google Chrome
на основных сценариях. Это не означает независимый аудит безопасности,
полную проверку доступности или гарантию совместимости со всеми сайтами
и версиями браузеров. Перед публикацией в магазинах необходимо выполнить
отдельную проверку требований магазинов, подготовить политику
конфиденциальности и проверить права на название ADZERO.

============================================================
ENGLISH
============================================================

ABOUT ADZERO
ADZERO is a Chromium-based browser extension that uses Declarative Net
Request and cosmetic filtering to reduce ads and tracking on websites.

INSTALLATION IN MICROSOFT EDGE
1. Extract the ZIP archive to a separate folder.
2. Open edge://extensions.
3. Enable Developer mode.
4. Select Load unpacked and choose the ADZERO folder containing manifest.json.
5. Refresh open tabs with Ctrl+R.

INSTALLATION IN GOOGLE CHROME
1. Extract the ZIP archive.
2. Open chrome://extensions.
3. Enable Developer mode.
4. Select Load unpacked and choose the ADZERO folder.
5. Refresh open tabs.

KEY FEATURES
- Global protection toggle.
- Per-site exceptions.
- My Filters: custom network block and allow rules for domains or HTTP/HTTPS
  URLs; add, edit, enable, disable and delete rules.
- Block History: local history of blocking events actually exposed by the
  browser through the DNR feedback API; search, filters, rule source,
  allow URL and block URL actions.
- Element Picker: select a page element and save a CSS rule scoped to
  the current hostname.
- Site Protection: pause protection for 5 or 30 minutes with automatic
  restoration; permanent site exclusion is separate.
- Statistics: summary of available DNR events for 24 hours, 7 days and 30 days.
- Smart Explanation: explanations based on actual block-event metadata.
- Filter Packs: separate controls for built-in ad and tracker rule sets.
- Protection Modes: Standard, Strict and Custom.
- Import / Export: transfer supported settings, user network filters and
  Element Picker CSS rules using JSON.
- Website Problem Report: a local diagnostic summary that the user can
  review and copy manually.
- Russian and English interface.

PRIVACY AND LOCAL STORAGE
User settings, filters, CSS rules and available history are stored locally
using chrome.storage.local. Website Problem Report is generated locally
and is not sent automatically. This build does not implement telemetry
or automatic browsing-history uploads.

IMPORTANT LIMITATIONS
- ADZERO does not guarantee removal of all ads. Ads integrated into page
  content, first-party ads, new ad domains and some video ads (including
  YouTube in-stream/mid-roll ads) may remain.
- Block History is not a complete network log. It depends on events exposed
  by the browser through declarativeNetRequestFeedback; availability and
  coverage may vary.
- The hidden-element counter reports recognized DOM elements, not blocked
  network requests.
- Network statistics include only DNR events available to the extension.
- Popup suppression is not guaranteed.
- Some analytics domains may also support legitimate website functionality.
  If a site breaks, try pausing protection temporarily or adding a site
  exception.
- Element Picker may be unavailable on browser-internal pages, extension
  pages and sites where the browser does not inject content scripts.
- Broad HTTP/HTTPS host_permissions remain in the manifest. Their necessity
  should be reviewed and justified before store submission.

STATUS
The user has tested the main scenarios in Microsoft Edge and Google Chrome.
This is not an independent security audit, a complete accessibility review
or a guarantee of compatibility with every website and browser version.
Before store submission, separately review store requirements, prepare
a privacy policy and verify the ADZERO name/trademark rights.
