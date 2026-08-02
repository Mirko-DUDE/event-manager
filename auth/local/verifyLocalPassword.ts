import crypto from 'node:crypto'

/**
 * Verifica password locale con lo stesso algoritmo di Payload (pbkdf2 / authenticateLocalStrategy).
 */
export function verifyLocalPassword(
  password: string,
  hash: string,
  salt: string,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 25000, 512, 'sha256', (err, hashBuffer) => {
      if (err) {
        reject(err)
        return
      }

      try {
        const storedHashBuffer = Buffer.from(hash, 'hex')
        resolve(
          hashBuffer.length === storedHashBuffer.length &&
            crypto.timingSafeEqual(hashBuffer, storedHashBuffer),
        )
      } catch {
        resolve(false)
      }
    })
  })
}
