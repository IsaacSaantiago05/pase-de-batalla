import { Icon, ScreenHeader, SectionTitle } from '@shared/ui'
import type { IconName } from '@shared/ui'
import { Page, useGoBack } from '../components/AppLayout'

// "Únete a Pase de Batalla": invita a los dueños de negocios a contactar al equipo por WhatsApp.

// Números del equipo (10 dígitos, México). El enlace de WhatsApp usa la clave de país 52.
const WHATSAPP_NUMBERS = ['8999458878', '8911050382']

// Mensaje que aparece ya escrito al abrir el chat; el dueño del negocio solo lo envía.
const GREETING = 'Hola, me interesa que mi negocio forme parte de Pase de Batalla.'

const BENEFITS: { icon: IconName; texto: string }[] = [
  { icon: 'points', texto: 'Premia a tus clientes frecuentes con puntos en cada compra.' },
  { icon: 'qr', texto: 'Genera códigos QR desde tus productos en segundos.' },
  { icon: 'reward', texto: 'Publica tus recompensas y un perfil con fotos, ubicación y redes sociales.' },
]

// 8999458878 -> 899 945 8878
const formatPhone = (digits: string) => digits.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3')

const whatsappLink = (digits: string) => `https://wa.me/52${digits}?text=${encodeURIComponent(GREETING)}`

export function JoinPage() {
  const goBack = useGoBack('/businesses')

  return (
    <Page>
      <ScreenHeader onBack={goBack} title="ÚNETE" />

      <div className="flex flex-col gap-6 px-5 pb-8">
        <div className="flex flex-col items-center gap-3 pt-2 text-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-3xl text-4xl"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', boxShadow: '0 0 32px rgba(245,158,11,0.15)' }}
          >
            <Icon name="business" />
          </div>
          <h2 className="font-display text-2xl font-bold tracking-wide text-white">¿Tienes un negocio?</h2>
          <p className="text-sm leading-relaxed text-white/60">
            Si quieres formar parte de <span className="font-semibold text-white">Pase de Batalla</span> con tu negocio, contáctanos por WhatsApp y te
            ayudamos a darlo de alta.
          </p>
        </div>

        <section className="flex flex-col gap-3">
          <SectionTitle className="text-white/40">Escríbenos por WhatsApp</SectionTitle>
          <div className="flex flex-col gap-2">
            {WHATSAPP_NUMBERS.map((number) => (
              <a
                className="flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all active:scale-[0.98]"
                href={whatsappLink(number)}
                key={number}
                rel="noopener noreferrer"
                style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(16,185,129,0.06))', border: '1px solid rgba(16,185,129,0.35)' }}
                target="_blank"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399' }}>
                  <Icon color="currentColor" name="phone" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono-game text-lg font-bold tracking-wide text-white">{formatPhone(number)}</span>
                  <span className="block text-xs font-semibold text-emerald-400">Abrir chat de WhatsApp</span>
                </span>
                <svg aria-hidden="true" fill="none" height="16" stroke="rgba(255,255,255,0.35)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
                  <path d="M14 5h5v5M19 5l-8 8M11 7H6a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5" />
                </svg>
              </a>
            ))}
          </div>
          <p className="text-xs text-white/40">El chat se abre con un mensaje ya escrito; solo tienes que enviarlo.</p>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle className="text-white/40">Qué obtiene tu negocio</SectionTitle>
          <div className="pb-card flex flex-col gap-3 rounded-2xl p-4">
            {BENEFITS.map((benefit) => (
              <p className="flex items-start gap-3 text-sm text-white/70" key={benefit.texto}>
                <Icon className="mt-0.5 shrink-0 text-lg" name={benefit.icon} />
                {benefit.texto}
              </p>
            ))}
          </div>
        </section>
      </div>
    </Page>
  )
}
