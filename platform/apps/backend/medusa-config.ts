import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  },
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/pagarme-br",
            id: "pix_br",
            options: {
              apiKey: process.env.PAGARME_API_KEY,
              mode: process.env.PAGARME_MODE,
              method: "pix",
              pixDiscountPercent: Number(
                process.env.PAGARME_PIX_DISCOUNT_PERCENT || 10
              ),
            },
          },
          {
            resolve: "./src/modules/pagarme-br",
            id: "card_br",
            options: {
              apiKey: process.env.PAGARME_API_KEY,
              mode: process.env.PAGARME_MODE,
              method: "card",
            },
          },
          {
            resolve: "./src/modules/pagarme-br",
            id: "boleto_br",
            options: {
              apiKey: process.env.PAGARME_API_KEY,
              mode: process.env.PAGARME_MODE,
              method: "boleto",
            },
          },
          {
            resolve: "./src/modules/mercadopago-br",
            id: "pix_br",
            options: {
              accessToken: process.env.MP_ACCESS_TOKEN,
              publicKey: process.env.MP_PUBLIC_KEY,
              webhookSecret: process.env.MP_WEBHOOK_SECRET,
              mode: process.env.MP_MODE,
              method: "pix",
            },
          },
          {
            resolve: "./src/modules/mercadopago-br",
            id: "card_br",
            options: {
              accessToken: process.env.MP_ACCESS_TOKEN,
              publicKey: process.env.MP_PUBLIC_KEY,
              webhookSecret: process.env.MP_WEBHOOK_SECRET,
              mode: process.env.MP_MODE,
              method: "card",
            },
          },
          {
            resolve: "./src/modules/mercadopago-br",
            id: "boleto_br",
            options: {
              accessToken: process.env.MP_ACCESS_TOKEN,
              publicKey: process.env.MP_PUBLIC_KEY,
              webhookSecret: process.env.MP_WEBHOOK_SECRET,
              mode: process.env.MP_MODE,
              method: "boleto",
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "./src/modules/email-notifications",
            id: "email-notifications",
            options: {
              channels: ["email"],
              apiKey: process.env.RESEND_API_KEY,
              fromEmail: process.env.NOTIFICATION_FROM_EMAIL,
            },
          },
        ],
      },
    },
    {
      resolve: "./src/modules/franchise-hyperlocal",
    },
    {
      resolve: "./src/modules/institutional-pages",
    },
    {
      resolve: "./src/modules/store-coins",
    },
    {
      resolve: "./src/modules/access-control",
    },
  ],
})
