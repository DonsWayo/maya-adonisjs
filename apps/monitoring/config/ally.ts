import { LogtoDriverConfig, LogtoDriver } from '#auth/ally/logto'
import env from '#start/env'
import { defineConfig, services } from '@adonisjs/ally'
import { HttpContext } from '@adonisjs/core/http'



export function logto(config: LogtoDriverConfig) {
  return (ctx: HttpContext) => new LogtoDriver(ctx, config)
}

const allyConfig = defineConfig({
  google: services.google({
    clientId: env.get('GOOGLE_CLIENT_ID'),
    clientSecret: env.get('GOOGLE_CLIENT_SECRET'),
    callbackUrl: env.get('APP_URL') + '/google/callback',
  }),
  logto: logto({
    driver: 'logto',
    logtoUrl: env.get('LOGTO_URL'),
    authorizeUrl: env.get('LOGTO_AUTHORIZE_URL'),
    accessTokenUrl: env.get('LOGTO_ACCESS_TOKEN_URL'),
    userInfoUrl: env.get('LOGTO_USER_INFO_URL'),
    clientId: env.get('LOGTO_CLIENT_ID'),
    clientSecret: env.get('LOGTO_CLIENT_SECRET'),
    callbackUrl: env.get('LOGTO_CALLBACK_URL'),
  })
})

export default allyConfig

declare module '@adonisjs/ally/types' {
  interface SocialProviders extends InferSocialProviders<typeof allyConfig> {}
}
