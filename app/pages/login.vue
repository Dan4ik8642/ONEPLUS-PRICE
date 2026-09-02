<script setup lang="ts">
type Role = "partner" | "admin"

const login = ref("")
const password = ref("")
const role = ref<Role>("partner")
const error = ref("")
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ""
  try {
    const body = role.value === "partner" ? { role: role.value } : { role: role.value, login: login.value, password: password.value }
    await $fetch("/api/auth/login", { method: "POST", body })
    await navigateTo(role.value === "admin" ? "/admin" : "/")
  } catch (cause: unknown) {
    const data = (cause as { data?: { statusMessage?: string, message?: string } }).data
    error.value = data?.statusMessage || data?.message || "Неверный логин или пароль"
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-brand">
      <div class="brand-mark large">ONE<br><span>PRICE</span></div>
      <h1>Ценники без ручной рутины</h1>
      <p>Единый каталог поставщиков и готовые PDF для печати.</p>
      <div class="mini-tag"><b>КРУАССАН<br>АВОКАДО</b><strong>180 ₽</strong><span>/ 100 Г</span><i>ХИТ</i></div>
    </section>
    <form class="login-card" @submit.prevent="submit">
      <p class="eyebrow">ВХОД В СИСТЕМУ</p>
      <h2>Добро пожаловать</h2>
      <div class="role-switch">
        <button type="button" :class="{ active: role === 'partner' }" @click="role = 'partner'; error = ''">Партнёр</button>
        <button type="button" :class="{ active: role === 'admin' }" @click="role = 'admin'; error = ''">Администратор</button>
      </div>
      <template v-if="role === 'admin'">
        <label>Логин<input v-model="login" required></label>
        <label>Пароль<input v-model="password" type="password" required></label>
      </template>
      <p v-else class="partner-login-help">Для работы с ценниками логин и пароль не нужны.</p>
      <p v-if="error" class="form-error">{{ error }}</p>
      <button class="primary-button" :disabled="busy">{{ busy ? "Входим…" : role === "partner" ? "Войти как партнёр" : "Войти в админку" }}</button>
      <small>{{ role === "partner" ? "Доступны выбор ценников и формирование PDF" : "Доступ администратора защищён логином и паролем" }}</small>
    </form>
  </main>
</template>
