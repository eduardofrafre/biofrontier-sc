import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import DonateModal, { DONATE_URL, PIX_CODE, PIX_KEY } from '@/features/donate/DonateModal'
import messages from '@/messages/pt-BR.json'
import enMessages from '@/messages/en.json'

function mount(open: boolean, onClose = () => {}, locale = 'pt-BR') {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === 'en' ? enMessages : messages}>
      <DonateModal open={open} onClose={onClose} />
    </NextIntlClientProvider>,
  )
}

describe('DonateModal', () => {
  afterEach(cleanup)

  it('renders nothing until it is opened', () => {
    mount(false)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  // The whole point of the interstitial: the thanks has to reach the reader
  // before PayPal does.
  it('thanks the reader for using, contributing and supporting', () => {
    mount(true)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent(messages.Donate.title)
    expect(dialog).toHaveTextContent(messages.Donate.usingIt)
    expect(dialog).toHaveTextContent(messages.Donate.contributing)
    expect(dialog).toHaveTextContent(messages.Donate.supporting)
  })

  it('does not reach PayPal until the reader chooses to', async () => {
    let closed = false
    mount(true, () => { closed = true })

    await userEvent.click(screen.getByRole('button', { name: 'PayPal' }))
    const link = screen.getByRole('link', { name: messages.Donate.continue })
    expect(link).toHaveAttribute('href', DONATE_URL)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(closed).toBe(false)

    await userEvent.click(link)
    expect(closed).toBe(true)
  })

  it('closes on Escape, "later", the ✕ and the backdrop', async () => {
    const dismissals: Array<() => Promise<unknown>> = [
      () => userEvent.keyboard('{Escape}'),
      () => userEvent.click(screen.getByText(messages.Donate.later)),
      () => userEvent.click(screen.getByLabelText(messages.Donate.close)),
      // The backdrop is the dialog's parent; clicking the dialog itself must
      // NOT close it, which the next assertion block covers.
      () => userEvent.click(screen.getByRole('dialog').parentElement!),
    ]

    for (const dismiss of dismissals) {
      let closed = false
      mount(true, () => { closed = true })
      await dismiss()
      expect(closed).toBe(true)
      cleanup()
    }
  })

  // Enter on an auto-focused payment link would send someone to PayPal without
  // them choosing to, which is exactly what this dialog exists to prevent.
  it('does not put focus on the outbound payment link', () => {
    mount(true)
    expect(document.activeElement).toBe(screen.getByRole('dialog'))
  })

  it('stays open when the dialog body itself is clicked', async () => {
    let closed = false
    mount(true, () => { closed = true })

    await userEvent.click(screen.getByRole('dialog'))
    expect(closed).toBe(false)
  })

  // In Brazil almost nobody pays by PayPal, and abroad nobody has Pix.
  it('opens on Pix in Portuguese and on PayPal in English', () => {
    mount(true)
    expect(screen.getByRole('button', { name: 'Pix' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('link', { name: messages.Donate.continue })).toBeNull()
    cleanup()

    mount(true, () => {}, 'en')
    expect(screen.getByRole('button', { name: 'PayPal' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('link', { name: enMessages.Donate.continue })).toHaveAttribute('href', DONATE_URL)
  })

  it('copies the Pix code and stays open for the trip to the bank app', async () => {
    const user = userEvent.setup()
    let closed = false
    mount(true, () => { closed = true })

    expect(screen.getByRole('dialog')).toHaveTextContent(PIX_KEY)
    await user.click(screen.getByRole('button', { name: messages.Donate.copyPix }))
    expect(await navigator.clipboard.readText()).toBe(PIX_CODE)
    expect(screen.getByRole('button', { name: messages.Donate.copied })).toBeInTheDocument()
    expect(closed).toBe(false)
  })

  // A bank app rejects a code whose checksum is off, so editing the key or the
  // city without recomputing the last four characters breaks every donation.
  it('carries a Pix code whose CRC matches its contents', () => {
    const body = PIX_CODE.slice(0, -4)
    let crc = 0xffff
    for (const byte of new TextEncoder().encode(body)) {
      crc ^= byte << 8
      for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
    expect(body.endsWith('6304')).toBe(true)
    expect(PIX_CODE.slice(-4)).toBe(crc.toString(16).toUpperCase().padStart(4, '0'))
  })
})
