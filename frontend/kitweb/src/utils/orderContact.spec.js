import { describe, it, expect } from 'vitest'
import { normalizePhone, validateContact } from './orderContact'

// Mirrors hidden-water-ed9d/src/order-validation.ts — the Worker is authoritative,
// this copy only gives the customer an inline error before they submit.
describe('normalizePhone', () => {
    it('keeps a well-formed Thai mobile number', () => {
        expect(normalizePhone('0812345678')).toBe('0812345678')
    })

    it('strips spaces, dashes, dots and brackets', () => {
        expect(normalizePhone('081-234-5678')).toBe('0812345678')
        expect(normalizePhone('(081) 234.5678')).toBe('0812345678')
    })

    it('restores a dropped leading 0 on a mobile number', () => {
        expect(normalizePhone('800065007')).toBe('0800065007')
    })

    it('accepts a Bangkok landline and international numbers', () => {
        expect(normalizePhone('02 123 4567')).toBe('021234567')
        expect(normalizePhone('+66 81 234 5678')).toBe('+66812345678')
        expect(normalizePhone('66812345678')).toBe('+66812345678')
    })

    it('rejects things that are not phone numbers', () => {
        for (const bad of ['', '   ', '12345', 'abcdefghij', '08123', '21234567', '0000000000']) {
            expect(normalizePhone(bad), bad).toBeNull()
        }
    })
})

describe('validateContact', () => {
    const good = { name: 'Somchai', phone: '081-234-5678', address: '123 Sampeng, Bangkok' }

    it('passes good details and returns the normalised phone', () => {
        expect(validateContact(good)).toEqual({ ok: true, phone: '0812345678', errors: {} })
    })

    it('reports every bad field at once so the form can mark them all', () => {
        const r = validateContact({ name: 'k', phone: '12345', address: 'ss' })
        expect(r.ok).toBe(false)
        expect(r.errors).toEqual({
            customerName: 'INVALID_NAME',
            phoneNumber: 'INVALID_PHONE',
            shippingAddress: 'INVALID_ADDRESS'
        })
    })

    it('rejects a name without letters and an address under 10 characters', () => {
        expect(validateContact({ ...good, name: '12345' }).errors.customerName).toBe('INVALID_NAME')
        expect(validateContact({ ...good, address: '123456789' }).errors.shippingAddress).toBe('INVALID_ADDRESS')
        expect(validateContact({ ...good, address: '1234567890' }).ok).toBe(true)
    })

    it('accepts a Thai name', () => {
        expect(validateContact({ ...good, name: 'สมชาย' }).ok).toBe(true)
    })
})
