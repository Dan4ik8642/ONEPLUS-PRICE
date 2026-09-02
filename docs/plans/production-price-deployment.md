# План: production-развёртывание ONEPLUS-PRICE

- Статус: в работе
- Обновлено: 2026-08-28
- Связанные решения: [ADR-0001](../decisions/ADR-0001-postgresql.md),
  [ADR-0002](../decisions/ADR-0002-production-env-in-private-git.md)

## Цель

Опубликовать проверенный commit `ONEPRICES` по адресу
`https://price.apps.onepricecoffee.com` через общий Traefik и отдельную базу
PostgreSQL на сервере `ogc-vibecode`.

## Работа

- [x] Проверить исходный код, инфраструктурный контракт и production env.
- [x] Проверить DNS: домен указывает на `158.160.112.132`.
- [x] Выполнить lint, проверку типов, тесты, покрытие и Nuxt-сборку в Node.js 24.
- [x] Зафиксировать production env и исключить его из Docker build context.
- [x] Собрать и проверить production Docker image.
- [x] Создать отдельные PostgreSQL role/database и включить backup.
- [x] Доставить release snapshot, применить миграции и запустить Compose.
- [x] Проверить container health, HTTP redirect, TLS и внешний `/api/health`.
- [x] Зафиксировать image ID, rollback и фактическое состояние.
- [ ] Выполнить штатный merge app PR №1 и infrastructure PR №1.

## Критерии готовности

- HTTPS-сертификат валиден для целевого домена.
- `/api/health` возвращает `200` через Traefik.
- App container имеет статус `healthy`, запускается non-root, read-only и без host-port.
- PostgreSQL доступен только через внутреннюю сеть и отдельную роль.
- Миграции применены; backup проверен и восстановлен в изолированную временную базу.
- Production release ссылается на проверенный commit `03bb374`; завершение
  Git-процесса выполняется через app PR №1 и infrastructure PR №1.

## Откат

Для отката переключить `current` на `releases/9c1a9f3`, вернуть в runtime env
`APP_IMAGE=oneplus-price:9c1a9f3` и повторить `docker compose up -d --no-build`.
Общие PostgreSQL, Traefik и их volumes не удаляются. Откат данных выполняется
только из проверенного dump.
