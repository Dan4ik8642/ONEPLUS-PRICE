# Production-развёртывание

- Статус: работает
- Обновлено: 2026-08-28

## Проверенное состояние

- URL: `https://price.apps.onepricecoffee.com`.
- Сервер: SSH-алиас `ogc-vibecode`.
- Release: `/srv/apps/oneplus-price/releases/03bb374`.
- Current: `/srv/apps/oneplus-price/current` → `releases/03bb374`.
- Image: `oneplus-price:03bb374`, ID
  `sha256:c058ebcd983bb5161168258eb18b422e890af7aeef5963fec17caf377e18518f`.
- PostgreSQL: role/database `oneplus_price` во внутренней сети
  `postgres-internal`.
- Web container: `healthy`, user `node`, read-only root filesystem, без
  опубликованного host-port; подключён к `traefik-public`.
- Backup: `oneprices-backup.timer`, nightly около `03:00 UTC`, 14 дней локально
  в `/srv/backups/postgres/oneplus_price`.

## Production env

По явному решению владельца исходный `.env.production` хранится в закрытом Git;
границы исключения зафиксированы в [ADR-0002](../decisions/ADR-0002-production-env-in-private-git.md).
На сервере runtime-копия находится в `/srv/apps/oneplus-price/shared/.env` с
режимом `0600`; release содержит относительную ссылку `.env` на shared-файл.
Provision заменяет только `APP_IMAGE` на commit-tagged image и не выводит
значения. `.dockerignore` исключает production env из build context.

## Управление

```bash
cd /srv/apps/oneplus-price/current
docker compose --env-file .env -f compose.yml -f compose.postgres.yml config --quiet
docker compose --env-file .env -f compose.yml -f compose.postgres.yml ps
docker compose --env-file .env -f compose.yml -f compose.postgres.yml logs --tail=100 app
```

Миграции выполняются из точного release image в сети PostgreSQL:

```bash
docker run --rm --network postgres-internal \
  --env-file /srv/apps/oneplus-price/shared/.env \
  oneplus-price:03bb374 npm run db:migrate
```

## Проверка

- HTTP перенаправляет на HTTPS с кодом `301`.
- `GET https://price.apps.onepricecoffee.com/api/health` возвращает `200` и
  `status: ok`.
- Сертификат содержит SAN `price.apps.onepricecoffee.com`.
- Вход администратора и партнёра и их защищённые API возвращают `200`.
- Populated custom-format dump проверен `pg_restore --list` и восстановлен во
  временную базу: в исходной и восстановленной базе по 6 прикладных таблиц.
- Regression bulk import с повторяющимися артикулами проверен в отдельной
  временной БД через реальный API: 4 входные строки дали 2 уникальные позиции с
  последними значениями; временные контейнер и БД удалены.

## Откат

Предыдущие release `/srv/apps/oneplus-price/releases/9c1a9f3` и image
`oneplus-price:9c1a9f3` сохранены. Для отката переключить `current` на этот
release, заменить только `APP_IMAGE` в runtime env и повторить Compose
`config --quiet` и `up -d --no-build`. Не удалять общие сети, PostgreSQL,
Traefik, их volumes и базу `oneplus_price`. Откат данных — только из проверенного
dump после отдельного подтверждения цели.
