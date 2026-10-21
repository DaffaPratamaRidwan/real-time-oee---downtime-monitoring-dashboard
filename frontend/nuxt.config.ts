// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss'],
  runtimeConfig: {
    apiBaseInternal: process.env.API_BASE_INTERNAL || process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3001',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3001'
    }
  },
  app: {
    head: {
      title: 'VOLTIX — Real-Time OEE & Downtime Monitoring Dashboard',
      meta: [
        { name: 'description', content: 'Real-time OEE, Downtime, and Telemetry Monitoring System for Electrical Factory Operations' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
      ]
    }
  }
})
