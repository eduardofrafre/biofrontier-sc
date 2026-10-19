import type { Theme } from './color'

/**
 * The theme pick shared with the eduardofrafre.com sites.
 *
 * Those sites keep the reader's last light or dark pick in a `theme` cookie on
 * the parent domain, so it follows them from one site to the next. The atlas
 * reads that cookie first and writes it along with its own localStorage key,
 * so a pick made here carries over there and the other way round. Light stays
 * the atlas's default when neither has been set.
 *
 * The root layout's inline script repeats `readSharedTheme` in plain JS,
 * because it has to run before React. Keep the two in step.
 */
export const SHARED_THEME_COOKIE = 'theme'

const PARENT_DOMAIN = /(^|\.)eduardofrafre\.com$/

export function readSharedTheme(cookie: string): Theme | null {
  const m = cookie.match(/(?:^|; )theme=(light|dark)(?:;|$)/)
  return m ? (m[1] as Theme) : null
}

/** The Set-Cookie string for a pick. Scoped to the parent domain on the live
 *  site, to the host itself anywhere else (localhost, previews). */
export function sharedThemeCookie(theme: Theme, hostname: string): string {
  const domain = PARENT_DOMAIN.test(hostname) ? '; Domain=eduardofrafre.com' : ''
  return `${SHARED_THEME_COOKIE}=${theme}${domain}; Path=/; Max-Age=31536000; SameSite=Lax`
}
