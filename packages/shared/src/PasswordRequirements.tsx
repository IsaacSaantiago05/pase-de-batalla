import { Icon } from './icons'
import { PASSWORD_REQUIREMENTS } from './password'

// Lista de requisitos bajo el campo de contraseña nueva: cada uno se pone verde con palomita al cumplirse.
export function PasswordRequirements({ value }: { value: string }) {
  return (
    <ul className="flex flex-col gap-1.5 pt-1">
      {PASSWORD_REQUIREMENTS.map((rule) => {
        const met = rule.test(value)
        return (
          <li className={`flex items-center gap-2 text-xs font-semibold transition-colors ${met ? 'text-emerald-400' : 'text-white/60'}`} key={rule.label}>
            <Icon className="text-sm" color={met ? '#10b981' : 'rgba(255,255,255,0.3)'} name="check" />
            {rule.label}
            <span className="sr-only">{met ? '(cumplido)' : '(pendiente)'}</span>
          </li>
        )
      })}
    </ul>
  )
}
