# Публікація Base Activity Hub на GitHub

**Власник:** [Verdigo93](https://github.com/Verdigo93)  
**Назва нового репозиторію:** `base-activity-hub`  
**Публічна адреса після завантаження:** `https://github.com/Verdigo93/base-activity-hub`

## 1. Створи порожній репозиторій

1. Перейди на https://github.com/new
2. `Repository name`: `base-activity-hub`
3. Visibility: **Public** — код та історію зможуть бачити організатори програм.
4. Не став галочки `Add a README file`, `Add .gitignore` або `Choose a license`, тому що відповідні файли вже у проєкті.
5. Натисни `Create repository`.

Публічний репозиторій — це відкритий код, а не автоматична реєстрація на Base чи гарантія винагород.

## 2. Завантаж код зі свого Windows-комп'ютера

1. Якщо Git не встановлений: https://git-scm.com/downloads/win
2. Розпакуй ZIP-архів **повністю**.
3. У папці `base-activity-hub` двічі натисни **`PUBLISH_TO_GITHUB_WINDOWS.bat`**.
4. Прочитай підказку, введи `YES`, коли публічний порожній репозиторій вже створений.
5. Якщо Git Credential Manager відкриє браузер, авторизуйся у **своєму** GitHub. Токен або пароль у чат вводити не потрібно.
6. Дочекайся `SUCCESS` і відкрий посилання `https://github.com/Verdigo93/base-activity-hub`.

Скрипт створює локальний коміт під іменем `Verdigo93` з адресою `119045086+Verdigo93@users.noreply.github.com`, що відповідає стандартному формату GitHub `noreply` для акаунта з ID 119045086.
**Переконайся у Settings → Emails на GitHub, що ця адреса дійсно асоційована з акаунтом.** Коміт запускаєш і підтверджуєш ти сам — це прозора історія твого проєкту.

## 3. Як підтримувати історію розробки

Модифікації роби окремими змістовними комітами з реальною датою:
`feat: add wallet dashboard`, `feat: enable Sepolia mint`, `fix: fee validation`,
`docs: deployment guide`. Не створюй фіктивних комітів заради аірдропу.

Для наступного пушу можна відкрити Git Bash у папці проєкту та виконати:
```bash
git add -A
git commit -m "feat: describe the real change"
git push
```

GitHub зараховує коміти до профілю за умов, зокрема: email пов'язаний з профілем і коміт є у default/gh-pages гілці. Враховуються реальні внески, а не кількість штучних комітів.

## 4. Де розміщувати сайт

**GitHub — для коду.** Цей проєкт також має Node.js сервер `api/server.mjs`. Для повного онлайн-сайту потрібен Node-хостинг (наприклад, Render або Railway), який імпортує саме цей репозиторій та запускає команду `npm start`, з версією Node 20+.
Звичайний GitHub Pages — статичний хостинг і не запустить Node API. Не перенось `.env` з приватними API-ключами в репозиторій.
Після публікації URL на хостингу налаштуємо Base Dashboard/Builder Code та тестування контрактів у Sepolia.

## 5. Що готове, а що ні

- Інтерфейс, підключення інжектованого гаманця, GM/check-in, перекази, UI NFT, Node API — код готовий для тестування.
- Solidity-контракти написані, але **ще не пройшли компіляцію, аудит і деплой**.
- Мінт NFT та платний деплой не активні до розгортання контрактів.
- Ваш сервісний гаманець для оплат 0,10 USDC: `0x5F5d8B3Cf23368b9B5fab4e4A391A998803c292F`.
- Реєстрація Base, Builder Code, публічний URL, Dune API потребують окремого налаштування.

Документація: https://docs.github.com/en/account-and-profile/reference/email-addresses-reference, https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference.
