# Base Activity Hub — підготовка платних контрактів у Base Mainnet

> **Production/Mainnet.** Це реальні смартконтракти й реальні USDC, а не тестові токени. Не розгортай контракт лише тому, що компіляція пройшла успішно. Перед використанням із коштами потрібні перевірка коду, функціональні тести та бажано незалежний аудит.

## Що вже зроблено

- `ActivityBoard`: **0x050A046E37947bb8DAF2b2A1a3C00c191EB92942** — адреса, повідомлена власником після розгортання в Base Mainnet. Дії GM / Check-in / Message налаштовані на неї.
- `BaseActivityFactory`: ще **не розгорнутий** — тому Deploy Contract та Mint Token неактивні.
- `BaseActivityNFT`: ще **не розгорнутий** — тому Mint NFT неактивний.
- `x402`: окрема інтеграція HTTP-платежів, розгортання NFT/Factory її автоматично **не ввімкне**.

## Безпека перед розгортанням

1. У Remix відкрий [контракт](https://github.com/Verdigo93/base-activity-hub/blob/main/contracts/BaseActivity.sol).
2. Solidity Compiler: `0.8.34` сумісний із `pragma solidity ^0.8.24`. Увімкни **Optimization = true**, **Runs = 200**. Переконайся, що компіляція без помилок і контракт не перевищує ліміт розміру коду EVM.
3. У Deploy & Run Transactions: `Browser Extension`, мережа **Base Mainnet (8453)**. Ніколи не обирай Remix VM або Ethereum Mainnet.
4. Перевір повну адресу гаманця та доступний ETH на gas. Перед підтвердженням уважно переглянь у MetaMask комісію, мережу, контракт і параметри.
5. Контракти зараз є початковими шаблонами, а не аудованими продуктами. Перш ніж приймати оплати від інших людей, перевір конструктори, платежі, безпеку ERC-20/721, метадані NFT і поведінку при помилці.

**Офіційний native USDC Circle у Base Mainnet (`usdcToken`):**
`0x833589fCD6EDB6E08f4c7C32D4f71b54bdA02913`

**Публічний гаманець отримувача (`payout` / `treasury`):**
`0x5F5d8B3Cf23368b9B5fab4e4A391A998803c292F`

**Ціна однієї платної операції за поточним кодом:** рівно `100000` базових одиниць USDC (шість знаків, **0.10 USDC**), плюс gas. Для майбутнього користувача перший виклик також потребуватиме окремого підтвердження **approve** на 0.10 USDC.

## A. BaseActivityFactory (фабрика)

Після перевірок у Remix обери контракт `BaseActivityFactory` (не `ActivityBoard`, не `TestOnlySixDecimalToken`).

Конструктор має **два параметри**:
- `usdcToken` = `0x833589fCD6EDB6E08f4c7C32D4f71b54bdA02913`
- `payout` = `0x5F5d8B3Cf23368b9B5fab4e4A391A998803c292F`

Параметр `Value` залиш `0`. Спершу переглянь оцінку комісії в гаманці; нічого не підтверджуй, якщо там інша мережа, токен чи адреса. Якщо деплой успішний, скопіюй адресу контракту і перевір його `usdc()`, `treasury()`, `DEPLOY_FEE()` та контрактний байткод у BaseScan.

Фабрика дозволяє створювати `Counter`, `Guestbook`, `Storage`, `ERC-20 Token`, `ERC-721 Collection`. Перед запуском необхідні успішні перевірки кожної функції.

## B. BaseActivityNFT (колекція)

Спочатку перевір, що ці метадані повертають JSON з реальними HTTPS-адресами зображень:
- https://base-activity-hub.onrender.com/metadata/genesis.json
- https://base-activity-hub.onrender.com/metadata/ember.json
- https://base-activity-hub.onrender.com/metadata/crown.json

Вибери в Remix `BaseActivityNFT`. Конструктор має **три параметри**:
- `usdcToken` = `0x833589fCD6EDB6E08f4c7C32D4f71b54bdA02913`
- `payout` = `0x5F5d8B3Cf23368b9B5fab4e4A391A998803c292F`
- `artworkUris` =

```json
[
  "https://base-activity-hub.onrender.com/metadata/genesis.json",
  "https://base-activity-hub.onrender.com/metadata/ember.json",
  "https://base-activity-hub.onrender.com/metadata/crown.json"
]
```

У Remix для `string[3]` у відповідне поле встав цей JSON-масив одним рядком, із трьома рядками в тому ж порядку. `Value` = `0`. Перш ніж підтверджувати реальний деплой, переглянь gas і повну адресу гаманця. Після успішного деплою перевір `usdc()`, `treasury()`, `mintPrice(0/1/2)`, `tierMaxSupply(0/1/2)`, `mintedPerTier(0/1/2)` і хоча б один пробний мінт після перевірки метаданих. Ціни становлять 0.10 / 0.50 / 1.00 USDC відповідно до рівня.

> NFT-конструктор записує `artworkUris` назавжди для цієї версії контракту. Не розгортай його з несправними метаданими.

## C. Підключення після перевірки

Надішли **тільки публічні адреси** нових контрактів; **жодних приватних ключів, seed-фраз чи секретів**.

Після перевірки контрактного байткоду та конструкторів адреси потрібно внести у `config.js` → `chains[8453]`:
- `nftContract` — адреса `BaseActivityNFT`
- `factoryContract` — адреса `BaseActivityFactory`

Сайт під час платних операцій має перевіряти правильні `treasury()`, `usdc()` і `0.10 USDC` до `approve`. Не дозволяй сайту переводити кошти на іншу адресу. `x402` залишається окремим наступним завданням.

Контракти з відкритим кодом: https://github.com/Verdigo93/base-activity-hub/blob/main/contracts/BaseActivity.sol

## Оновлені NFT — саме для Base Mainnet

| Рівень | Назва | Ціна | Максимальний тираж |
|---|---|---|---|
| 0 | Base Genesis / Common | 0.10 USDC | 10 000 |
| 1 | Base Ember / Rare | 0.50 USDC | 1 000 |
| 2 | Base Crown / Legendary | 1.00 USDC | 100 |

Успішна оплата запускає `mint(tier)`, NFT (ERC-721) створюється безпосередньо на адресу `msg.sender`. `ownerOf(tokenId)`, `balanceOf(wallet)` і `tokenURI(tokenId)` дозволяють перевірити результат і показати NFT в сумісному гаманці/маркетплейсі. Метадані зараз доступні через HTTPS-сайт; **перед фінальним Mainnet-деплоєм краще закріпити оригінали на IPFS й використовувати незмінні `ipfs://` URI**, інакше доступність артів залежатиме від Render.
