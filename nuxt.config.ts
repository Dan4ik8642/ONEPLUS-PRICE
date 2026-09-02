export default defineNuxtConfig({
  compatibilityDate: "2026-08-01",
  devtools: { enabled: false },
  modules: ["@nuxt/eslint"],
  css: ["~/globals.css"],
  runtimeConfig: {
    databaseUrl: "",
    adminLogin: "admin",
    adminPassword: "",
    partnerLogin: "partner",
    partnerPassword: "",
    sessionSecret: "",
    demoMode: false,
  },
  nitro: { preset: "node-server" },
  typescript: { strict: true, typeCheck: true },
  app: {
    head: {
      title: "One Price · Ценники",
      meta: [{ name: "description", content: "Каталог и печать ценников One Price Coffee" }],
      link: [{ rel: "icon", href: "/favicon.svg" }],
    },
  },
})
