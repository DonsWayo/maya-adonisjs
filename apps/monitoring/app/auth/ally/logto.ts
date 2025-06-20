/*
|--------------------------------------------------------------------------
| Ally Oauth driver
|--------------------------------------------------------------------------
|
| This is a dummy implementation of the Oauth driver. Make sure you
|
| - Got through every line of code
| - Read every comment
|
*/

import { Oauth2Driver, RedirectRequest } from '@adonisjs/ally'
import { ApiRequestContract } from '@adonisjs/ally/types'
import { HttpContext } from '@adonisjs/core/http'

/**
 * Define the access token object properties in this type. It
 * must have "token" and "type" and you are free to add
 * more properties.
 */
export type LogtoDriverAccessToken = {
  token: string
  type: 'bearer'
}

/**
 * Define a union of scopes your driver accepts. Here's an example of same
 * https://github.com/adonisjs/ally/blob/develop/adonis-typings/ally.ts#L236-L268
 *
 */
export type LogtoDriverScopes = 'openid profile'

/**
 * Define the configuration options accepted by your driver. It must have the following
 * properties and you are free add more.
 */
export type LogtoDriverConfig = {
  driver: 'logto'
  logtoUrl?: string
  clientId: string
  clientSecret: string
  callbackUrl: string
  authorizeUrl?: string
  accessTokenUrl?: string
  userInfoUrl?: string
}

/**
 * Driver implementation. It is mostly configuration driven except the user calls
 */
export class LogtoDriver extends Oauth2Driver<LogtoDriverAccessToken, LogtoDriverScopes> {
  /**
   * The URL for the redirect request. The user will be redirected on this page
   * to authorize the request.
   *
   * Do not define query strings in this URL.
   */
  protected authorizeUrl: string

  /**
   * The URL to hit to exchange the authorization code for the access token
   *
   * Do not define query strings in this URL.
   */
  protected accessTokenUrl: string

  /**
   * The URL to hit to get the user details
   *
   * Do not define query strings in this URL.
   */
  protected userInfoUrl: string

  /**
   * The param name for the authorization code. Read the documentation of your oauth
   * provider and update the param name to match the query string field name in
   * which the oauth provider sends the authorization_code post redirect.
   */
  protected codeParamName = 'code'

  /**
   * The param name for the error. Read the documentation of your oauth provider and update
   * the param name to match the query string field name in which the oauth provider sends
   * the error post redirect
   */
  protected errorParamName = 'error'

  /**
   * Cookie name for storing the CSRF token. Make sure it is always unique. So a better
   * approach is to prefix the oauth provider name to `oauth_state` value. For example:
   * For example: "facebook_oauth_state"
   */
  protected stateCookieName = 'logto_oauth_state'

  /**
   * Parameter name to be used for sending and receiving the state from.
   * Read the documentation of your oauth provider and update the param
   * name to match the query string used by the provider for exchanging
   * the state.
   */
  protected stateParamName = 'state'

  /**
   * Parameter name for sending the scopes to the oauth provider.
   */
  protected scopeParamName = 'scope'

  /**
   * The separator indentifier for defining multiple scopes
   */
  protected scopesSeparator = ' '

  constructor(
    ctx: HttpContext,
    public config: LogtoDriverConfig
  ) {
    super(ctx, config)

    // Update config
    this.config = config

    // Set default base URL if not provided
    const logtoUrl = this.config.logtoUrl || 'https://logto.dev'

    // Build authorizeUrl if not defined
    this.authorizeUrl = this.config.authorizeUrl || `${logtoUrl}/oidc/auth`

    // Build accessTokenUrl if not defined
    this.accessTokenUrl = this.config.accessTokenUrl || `${logtoUrl}/oidc/token`

    // Build userInfoUrl if not defined
    this.userInfoUrl = this.config.userInfoUrl || `${logtoUrl}/oidc/userinfo`

    // Log the configuration for debugging
    console.log('Logto driver configuration:', {
      clientId: this.config.clientId,
      callbackUrl: this.config.callbackUrl,
      authorizeUrl: this.authorizeUrl,
    })

    /**
     * Extremely important to call the following method to clear the
     * state set by the redirect request.
     *
     * DO NOT REMOVE THE FOLLOWING LINE
     */
    this.loadState()
  }

  /**
   * Optionally configure the authorization redirect request. The actual request
   * is made by the base implementation of "Oauth2" driver and this is a
   * hook to pre-configure the request.
   */
  protected configureRedirectRequest(request: RedirectRequest<LogtoDriverScopes>) {
    request.scopes([
      'openid',
      'profile',
      'email',
      'urn:logto:scope:organizations',
      'urn:logto:scope:organization_roles',
    ])
    request.param('response_type', 'code')
  }

  /**
   * Optionally configure the access token request. The actual request is made by
   * the base implementation of "Oauth2" driver and this is a hook to pre-configure
   * the request
   */
  //protected configureAccessTokenRequest(request: ApiRequest) {
  //  request.param('grant_type', 'authorization_code')
  //  TODO other params
  //}

  /**
   * Update the implementation to tell if the error received during redirect
   * means "ACCESS DENIED".
   */
  accessDenied() {
    return this.ctx.request.input('error') === 'user_denied'
  }

  /**
   * Returns the HTTP request with the authorization header set
   */
  protected getAuthenticatedRequest(url: string, token: string) {
    const request = this.httpClient(url)
    request.header('Authorization', `Bearer ${token}`)
    request.header('Accept', 'application/json')
    request.parseAs('json')
    return request
  }

  /**
   * Fetches the user info from the Logto API
   */
  protected async getUserInfo(token: string, callback?: (request: ApiRequestContract) => void) {
    // Ensure token is a string
    if (!token) {
      throw new Error('Access token is required to fetch user info')
    }

    const request = this.getAuthenticatedRequest(this.userInfoUrl, token)
    if (typeof callback === 'function') {
      callback(request)
    }

    const body = await request.get()

    console.log('getUserInfo', { body })

    return body
  }

  /**
   * Returns details for the authorized user
   */
  async user(callback?: (request: ApiRequestContract) => void) {
    const token = await this.accessToken(callback)
    const user = await this.getUserInfo(token.token, callback)

    return {
      ...user,
      token,
    }
  }

  /**
   * Finds the user by the access token
   */
  async userFromToken(token: string, callback?: (request: ApiRequestContract) => void) {
    const user = await this.getUserInfo(token, callback)

    return {
      ...user,
      token: { token, type: 'bearer' as const },
    }
  }
}
