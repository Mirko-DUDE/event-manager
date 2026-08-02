import type { Validate } from 'payload'

/** Minimo 8 caratteri, almeno un alfanumerico e almeno un carattere speciale. */
const PASSWORD_COMPLEXITY =
  /^(?=.*[a-zA-Z0-9])(?=.*[^a-zA-Z0-9\s]).{8,}$/

/** Testo breve per il tooltip nativo di Payload (messaggi lunghi vengono troncati). */
export const PASSWORD_VALIDATION_MESSAGE =
  'Min. 8 caratteri, alfanumerico e speciale.'

/** Messaggio completo per log/documentazione; non usato in UI campo. */
export const PASSWORD_REQUIREMENTS_FULL =
  'La password deve contenere almeno 8 caratteri, un carattere alfanumerico e almeno un carattere speciale.'

export function isPasswordComplexEnough(value: string): boolean {
  return PASSWORD_COMPLEXITY.test(value)
}

/**
 * Validazione custom sul campo password (Payload impone nativamente solo minLength 3
 * in generatePasswordSaltHash — vedi specifica 2.4).
 */
export const validatePasswordComplexity: Validate<string> = (value) => {
  if (!value) return true
  if (!isPasswordComplexEnough(value)) {
    return PASSWORD_VALIDATION_MESSAGE
  }
  return true
}
