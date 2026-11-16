# Base Activity Hub — активація платних контрактів у Base Sepolia

Це **тестове** розгортання. Воно потребує підтвердження транзакцій твоїм гаманцем. **Ніколи не передавай приватний ключ, seed-фразу або пароль у GitHub, Render чи чат.**

## Перед початком

- У MetaMask/іншому EVM-гаманці вибери **Base Sepolia**, chain ID **84532**.
- Отримай **тестовий ETH** для gas: https://www.coinbase.com/developer-platform/products/faucet
- Для тестування мінту отримай **тестовий USDC**: https://faucet.circle.com/ (обери Base Sepolia).
- Solidity-код: https://github.com/Verdigo93/base-activity-hub/blob/main/contracts/BaseActivity.sol
- Підготовлений Remix: https://remix.ethereum.org/#url=https://github.com/Verdigo93/base-activity-hub/blob/main/contracts/BaseActivity.sol

## 1. Відкрий Remix і скомпілюй

1. За посиланням Remix має відкритися `BaseActivity.sol`. Якщо ні — натисни Import у File Explorer і встав GitHub URL з попереднього пункту.
2. У Solidity Compiler обери **0.8.24**, натисни **Compile BaseActivity.sol**.
3. У Deploy & Run обери **Browser Extension** та перевір мережу **Base Sepolia** (не Mainnet).
4. Для кожного контракту у списку CONTRACT вибирай точну назву, вказану нижче.

## 2. ActivityBoard — GM, Daily Check-in, Onchain Message

Вибери `ActivityBoard`. У нього немає параметрів конструктора. Натисни Deploy і підтвердь тестову транзакцію. Збережи **адресу нового контракту**.

## 3. BaseActivityFactory — платний деплой ERC-20, NFT, Counter, Guestbook, Storage

Вибери `BaseActivityFactory`. У конструкторі:

- `usdcToken`: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (справжній тестовий USDC Circle)
- `payout`: `0x5F5d8B3Cf23368b9B5fab4e4A391A998803c292F` (твій отримувач)

Deploy → підтвердь → збережи адресу фабрики. На тестнеті `0.10 USDC` — це **тестовий** токен, не реальний дохід.

## 4. BaseActivityNFT — платний NFT Mint

Вибери `BaseActivityNFT`. Конструктор приймає:

- `usdcToken`: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- `payout`: `0x5F5d8B3Cf23368b9B5fab4e4A391A998803c292F`
- `artworkUris`: три посилання у вказаному порядку:

```json
[
  "https://base-activity-hub.onrender.com/metadata/genesis.json",
  "https://base-activity-hub.onrender.com/metadata/explorer.json",
  "https://base-activity-hub.onrender.com/metadata/diamond.json"
]
```

Перевір метадані й зображення за посиланнями **до підтвердження**. Deploy → збережи адресу.

## 5. Після успішного деплою

Передай мені **тільки три публічні адреси контрактів**:

- `ActivityBoard`
- `BaseActivityNFT`
- `BaseActivityFactory`

Я внесу їх у `config.js` у `chains[84532]`, пропишу USDC, і ми перевіримо реальні тестові транзакції на сайті. Перевіримо `treasury()`, `usdc()`, ціни `MINT_FEE` і `DEPLOY_FEE`, байткод, транзакції та отримувача платежів. **Тільки після цих перевірок** платні кнопки можна активувати.

## Перед Base Mainnet

Смартконтракти зараз проходять автоматичну компіляцію в GitHub Actions, **але це не незалежний аудит**. Для Mainnet потрібні розширені тести, перевірка коду та окреме розгортання з реальним USDC. Не відправляй реальні кошти у неперевірені контракти.
