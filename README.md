# ONEPLUS-PRICE

Веб-приложение One Price Coffee для ведения базы ценников. Администратор управляет городами, поставщиками, версиями цен и позициями; партнёр выбирает нужные позиции и получает PDF на 18 ценников формата 60×40 мм.

## Стек

- Nuxt 4, Vue 3, TypeScript, Node.js 24;
- PostgreSQL и драйвер `postgres`;
- Vitest, ESLint, проверка типов и покрытие от 80%;
- production Dockerfile, Docker Compose и общий Traefik;
- PDF-Lib и Fira Sans Extra Condensed ExtraBold;
- безопасный импорт `.xlsx` через `read-excel-file`.

## Быстрый старт

Нужны Node.js 24+, npm 11+ и доступная PostgreSQL.

```bash
make init
# заполнить .env
make migrate
make dev
```

Приложение: `http://localhost:3000`. Проверка состояния: `GET http://localhost:3000/api/health`.

```bash
make check
make coverage
make build
```

## Развёртывание

Приложение не публикует host-порт. Внешний трафик принимает общий Traefik. Создайте роль и базу PostgreSQL, заполните `.env`, подготовьте внешние сети и выполните:

```bash
make compose-config-db
make up-db
docker compose -f compose.yml -f compose.postgres.yml exec app npm run db:migrate
```

Для первичной загрузки боевой Excel-базы:

```bash
make seed
```

Секреты хранятся только в `.env` или в хранилище секретов инфраструктуры и не коммитятся. Подробности: [docs/README.md](docs/README.md).
