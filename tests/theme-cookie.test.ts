import { describe, it, expect } from 'vitest'
import { readSharedTheme, sharedThemeCookie } from '@/lib/theme-cookie'

describe('readSharedTheme', () => {
  it('reads the pick from the shared cookie', () => {
    expect(readSharedTheme('lang=en; theme=dark; consent=yes')).toBe('dark')
    expect(readSharedTheme('theme=light')).toBe('light')
  })

  it('returns null when there is no pick', () => {
    expect(readSharedTheme('')).toBeNull()
    expect(readSharedTheme('lang=pt')).toBeNull()
  })

  it('ignores values that are not a theme', () => {
    expect(readSharedTheme('theme=sepia')).toBeNull()
  })

  it('does not match a cookie whose name only ends in theme', () => {
    expect(readSharedTheme('biofrontier-theme=dark')).toBeNull()
    expect(readSharedTheme('xtheme=dark; lang=en')).toBeNull()
  })
})

describe('sharedThemeCookie', () => {
  it('scopes the cookie to the parent domain on the live site', () => {
    expect(sharedThemeCookie('dark', 'biofrontier.sc.eduardofrafre.com'))
      .toBe('theme=dark; Domain=eduardofrafre.com; Path=/; Max-Age=31536000; SameSite=Lax')
  })

  it('leaves the domain off anywhere else', () => {
    expect(sharedThemeCookie('light', 'localhost'))
      .toBe('theme=light; Path=/; Max-Age=31536000; SameSite=Lax')
    expect(sharedThemeCookie('light', 'biofrontier-sc.vercel.app')).not.toContain('Domain')
  })
})
