// Requisitos de la contraseña nueva. Son los mismos que exige el backend
// (Password::min(8)->mixedCase()->numbers()->symbols() en AppServiceProvider).
export const PASSWORD_REQUIREMENTS = [
  { label: 'Mínimo 8 caracteres', test: (value: string) => value.length >= 8 },
  { label: 'Una letra mayúscula', test: (value: string) => /\p{Lu}/u.test(value) },
  { label: 'Una letra minúscula', test: (value: string) => /\p{Ll}/u.test(value) },
  { label: 'Un número', test: (value: string) => /\p{N}/u.test(value) },
  { label: 'Un símbolo (por ejemplo ! @ # $)', test: (value: string) => /[\p{S}\p{P}]/u.test(value) },
]

export const PASSWORD_REQUIREMENTS_ERROR = 'Cumple todos los requisitos de la contraseña.'

export function meetsAllRequirements(value: string) {
  return PASSWORD_REQUIREMENTS.every((rule) => rule.test(value))
}
