import { describe, it, expect } from 'vitest'
import {
    LINE_OA_ID, WHATSAPP_NUMBER, confirmationText, lineConfirmUrl, whatsappConfirmUrl
} from './orderConfirmation'

describe('order confirmation links', () => {
    const id = 'WH-2026-AB12C'

    it('uses the shop OA and WhatsApp number', () => {
        expect(LINE_OA_ID).toBe('@oar4837p')
        expect(WHATSAPP_NUMBER).toBe('66894886877')
    })

    it('words the message so staff can search the order id', () => {
        expect(confirmationText(id)).toBe('Hi, my order is WH-2026-AB12C')
    })

    it('builds a LINE OA pre-filled message link', () => {
        expect(lineConfirmUrl(id)).toBe(
            'https://line.me/R/oaMessage/@oar4837p/?Hi%2C%20my%20order%20is%20WH-2026-AB12C'
        )
    })

    it('builds a WhatsApp click-to-chat link in international digits', () => {
        expect(whatsappConfirmUrl(id)).toBe(
            'https://wa.me/66894886877?text=Hi%2C%20my%20order%20is%20WH-2026-AB12C'
        )
    })
})
