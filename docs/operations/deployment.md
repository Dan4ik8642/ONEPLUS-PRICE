# Развёртывание для DevOps

## Требования

Node.js внутри образа — 24. На узле нужны Docker Engine, Compose v2, общий Traefik, внешняя сеть `traefik-public`, доступная PostgreSQL и DNS-запись домена.

## Переменные

Скопировать `.env.example` в `.env` и заменить все значения. Пароли администратора и партнёра, `NUXT_SESSION_SECRET` и `NUXT_DATABASE_URL` должны поступать из защищённого хранилища.

## Первый запуск

```bash
docker compose -f compose.yml -f compose.postgres.yml config
docker compose -f compose.yml -f compose.postgres.yml up -d --build
docker compose -f compose.yml -f compose.postgres.yml exec app npm run db:migrate
```

Затем импортировать исходную базу командой `npm run seed:production` из доверенного рабочего окружения или одноразового контейнера.

## Проверка

- контейнер `healthy`;
- `GET /api/health` возвращает `200` и `{ "status": "ok" }`;
- вход партнёра и администратора работает;
- PDF скачивается и содержит 18 ценников на A4.

Логи пишутся в stdout/stderr. Постоянные данные находятся только в PostgreSQL; резервное копирование выполняется средствами общей базы.
