/**
 * @file Blowfish.cpp
 * @brief Blowfish cipher + Eksblowfish key schedule implementation.
 */
#include "crypto/Blowfish.h"

namespace vault::crypto
{

#include "crypto/BlowfishInit.inc" // static const uint32_t BF_INIT[1042]

Blowfish::Blowfish()
{
    for (int i = 0; i < 18; ++i)
        p_[i] = BF_INIT[i];
    const uint32_t* s = BF_INIT + 18;
    for (int b = 0; b < 4; ++b)
        for (int i = 0; i < 256; ++i)
            s_[b][i] = s[b * 256 + i];
}

uint32_t Blowfish::f(uint32_t x) const
{
    return ((s_[0][x >> 24] + s_[1][(x >> 16) & 0xff]) ^ s_[2][(x >> 8) & 0xff]) +
           s_[3][x & 0xff];
}

void Blowfish::encipher(uint32_t& xl, uint32_t& xr) const
{
    for (int i = 0; i < 16; ++i) {
        xl ^= p_[i];
        xr = f(xl) ^ xr;
        uint32_t t = xl;
        xl = xr;
        xr = t;
    }
    uint32_t t = xl;
    xl = xr;
    xr = t;
    xr ^= p_[16];
    xl ^= p_[17];
}

/// @brief Pull a big-endian 32-bit word from @p data, cycling at @p len.
static uint32_t stream2word(const uint8_t* data, int len, int& off)
{
    uint32_t word = 0;
    for (int i = 0; i < 4; ++i) {
        word = (word << 8) | data[off];
        off = (off + 1) % len;
    }
    return word;
}

void Blowfish::expandKey(const uint8_t* data, int dataLen, const uint8_t* key,
                         int keyLen)
{
    int koff = 0;
    for (int i = 0; i < 18; ++i)
        p_[i] ^= stream2word(key, keyLen, koff);

    uint32_t l = 0, r = 0;
    int doff = 0;
    for (int i = 0; i < 18; i += 2) {
        l ^= stream2word(data, dataLen, doff);
        r ^= stream2word(data, dataLen, doff);
        encipher(l, r);
        p_[i] = l;
        p_[i + 1] = r;
    }
    for (int b = 0; b < 4; ++b)
        for (int i = 0; i < 256; i += 2) {
            l ^= stream2word(data, dataLen, doff);
            r ^= stream2word(data, dataLen, doff);
            encipher(l, r);
            s_[b][i] = l;
            s_[b][i + 1] = r;
        }
}

void Blowfish::expand0(const uint8_t* key, int keyLen)
{
    int koff = 0;
    for (int i = 0; i < 18; ++i)
        p_[i] ^= stream2word(key, keyLen, koff);

    uint32_t l = 0, r = 0;
    for (int i = 0; i < 18; i += 2) {
        encipher(l, r);
        p_[i] = l;
        p_[i + 1] = r;
    }
    for (int b = 0; b < 4; ++b)
        for (int i = 0; i < 256; i += 2) {
            encipher(l, r);
            s_[b][i] = l;
            s_[b][i + 1] = r;
        }
}

} // namespace vault::crypto
