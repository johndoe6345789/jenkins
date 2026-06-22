/**
 * @file Blowfish.h
 * @brief Blowfish cipher + Eksblowfish (bcrypt) key schedule.
 */
#pragma once

#include <cstdint>

namespace vault::crypto
{

/// @brief Blowfish state with the bcrypt "expensive" key schedule.
class Blowfish
{
  public:
    Blowfish();                                  ///< P/S seeded from pi.

    /// @brief One round of Eksblowfish key expansion (data XORed in).
    void expandKey(const uint8_t* data, int dataLen,
                   const uint8_t* key, int keyLen);

    /// @brief Cheap expansion with data = 0 (the 2^cost inner loop).
    void expand0(const uint8_t* key, int keyLen);

    /// @brief Encrypt one 64-bit block in place (big-endian halves).
    void encipher(uint32_t& xl, uint32_t& xr) const;

  private:
    uint32_t f(uint32_t x) const;

    uint32_t p_[18];
    uint32_t s_[4][256];
};

} // namespace vault::crypto
