# Capital App — Frontend

Telegram Mini App учёта личного капитала. React + TypeScript + Vite. Тот же код
работает и как обычный сайт (вне Telegram). Тема Telegram пробрасывается в
CSS-токены — гибридный стиль: собственный бренд, нейтрали от темы пользователя.

## Быстрый старт

```bash
cp .env.example .env          # VITE_API_URL=http://localhost:8080
npm install
npm run dev                   # http://localhost:5173
npm run build                 # typecheck + production build
```

Нужен запущенный бэкенд (см. репозиторий `capitalapp-backend`).

## Структура

```
src/
  telegram.ts        мост к window.Telegram.WebApp (тема, initData, BackButton, haptics)
  theme.ts           тема Telegram → CSS-токены (гибрид)
  api.ts             клиент бэкенда
  format.ts          деньги, проценты, даты, длительности
  kinds.ts           типы активов, поля форм, схемы кредита
  components/        BottomNav, Sheet, TopBar, AreaChart, Ring
  screens/           Dashboard, Category, Position, AssetForm, AddChooser,
                     Settings, HistoryScreen, Goals, GoalForm
  App.tsx            роутер + загрузка данных
```

## Экраны

Обзор · Категория · Позиция · Добавить (прогрессивно по типу) · История (график) ·
Цели · Ещё (валюты и ручные курсы). Нижний таб-бар + центральная «＋».
