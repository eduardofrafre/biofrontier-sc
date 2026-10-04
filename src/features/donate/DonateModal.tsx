'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'

/**
 * PayPal and Pix are the whole payment stack here. There is no account system
 * to bill against and no recurring tier to manage: a one-off transfer from
 * someone who found the map useful is the entire expected volume, and anything
 * heavier would cost more to operate than it collects. PayPal is for supporters
 * abroad; in Brazil almost everyone pays by Pix.
 */
export const DONATE_URL =
  'https://www.paypal.com/donate/?hosted_button_id=N2T3FKPS2Z7DQ'

/**
 * Pix has no web link, only this code (BR Code, "copia e cola"): static, no
 * amount, so the donor types it in the bank app. It is built from a random Pix
 * key that reveals nothing about the owner; the QR in public/donate-pix.svg
 * encodes the same string, and both must change together.
 */
export const PIX_KEY = '9e1497a0-9a23-4910-9937-f5cec7c85f4b'
export const PIX_CODE =
  '00020126580014br.gov.bcb.pix0136' + PIX_KEY +
  '5204000053039865802BR5915EDUARDO FREITAS6008CRICIUMA62070503***6304BCD9'

type Method = 'paypal' | 'pix'

interface DonateModalProps {
  open: boolean
  onClose: () => void
}

/**
 * Thanks the reader before handing them off to PayPal or to their bank app.
 *
 * The donate link used to go straight out to a payment form, which put the ask
 * before the thanks and sent people to a third-party page with no idea what the
 * money was for. The interstitial is the only place the project gets to say
 * what a contribution actually pays for, and to thank the larger group who
 * use the map and submit observations without ever donating anything.
 */
export default function DonateModal({ open, onClose }: DonateModalProps) {
  const t = useTranslations('Donate')
  const locale = useLocale()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [method, setMethod] = useState<Method>(locale === 'pt-BR' ? 'pix' : 'paypal')
  const [copied, setCopied] = useState(false)

  const copyPix = () => {
    // Only reports success when the clipboard took it; otherwise the key stays
    // on screen, selectable, for copying by hand.
    navigator.clipboard?.writeText(PIX_CODE).then(() => setCopied(true), () => {})
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    // Move focus into the dialog so Tab walks its controls rather than the map
    // behind it. Focus the container, not the PayPal link: making the outbound
    // payment link the default action means a stray Enter navigates away from
    // the app, which is the one thing this dialog exists to stop happening by
    // accident.
    dialogRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="donate-title"
        className="w-full max-w-md bg-panel border border-slate-200 rounded-lg shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-slate-200">
          <h2
            id="donate-title"
            className="text-sm font-semibold text-slate-800 uppercase tracking-wider font-condensed"
          >
            {t('title')}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 text-lg leading-none"
            aria-label={t('close')}
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 text-xs text-slate-500 leading-relaxed">
          <p>{t('usingIt')}</p>
          <p>{t('contributing')}</p>
          <p>{t('supporting')}</p>
          <p className="text-brand-ink">{t('freeEitherWay')}</p>
        </div>

        <div
          role="group"
          aria-label={t('method')}
          className="flex mx-5 mb-3 border border-slate-200 rounded text-xs overflow-hidden"
        >
          {(['pix', 'paypal'] as const).map(m => (
            <button
              key={m}
              type="button"
              aria-pressed={method === m}
              onClick={() => { setMethod(m); setCopied(false) }}
              className={`flex-1 py-1.5 transition-colors ${
                method === m ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {m === 'pix' ? 'Pix' : 'PayPal'}
            </button>
          ))}
        </div>

        {/* The QR code is for someone reading on a computer who would rather pay
            from their phone. On a phone it would be scanning its own screen. */}
        <div className="hidden sm:flex items-center gap-3 mx-5 mb-3 p-2 border border-slate-200 rounded">
          <Image
            src={method === 'pix' ? '/donate-pix.svg' : '/donate-qr.svg'}
            alt=""
            width={96}
            height={96}
            className="rounded-sm"
          />
          <p className="text-xs text-slate-500 leading-relaxed">
            {method === 'pix' ? t('scanPix') : t('scan')}
          </p>
        </div>

        {method === 'pix' && (
          <p className="mx-5 mb-3 text-xs text-slate-500">
            {t('pixKey')}{' '}
            <code className="select-all break-all text-slate-700">{PIX_KEY}</code>
          </p>
        )}

        <div className="flex items-center justify-end gap-3 px-5 pb-4 pt-1">
          <button
            onClick={onClose}
            className="text-xs text-slate-600 hover:text-slate-900 transition-colors"
          >
            {t('later')}
          </button>
          {method === 'pix' ? (
            // Stays open after copying: the reader still has to switch to the
            // bank app, and the confirmation tells them the copy worked.
            <button
              type="button"
              onClick={copyPix}
              aria-live="polite"
              className="text-xs font-medium px-3 py-1.5 rounded bg-brand-solid text-white hover:bg-brand-solid/90 transition-colors"
            >
              {copied ? t('copied') : t('copyPix')}
            </button>
          ) : (
            /* A real link, not a scripted `window.open`: it survives a popup
               blocker and still supports middle-click and open-in-new-tab. */
            <a
              href={DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="text-xs font-medium px-3 py-1.5 rounded bg-brand-solid text-white hover:bg-brand-solid/90 transition-colors"
            >
              {t('continue')}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
