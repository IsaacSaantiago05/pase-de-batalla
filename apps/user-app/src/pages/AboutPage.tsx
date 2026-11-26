import { Icon, IslandView, ScreenHeader, SectionTitle } from '@shared/ui'
import type { IconName } from '@shared/ui'
import { Page, useGoBack } from '../components/AppLayout'

// "Acerca del proyecto": de dónde viene la idea, quién lo desarrolla y para qué existe.
// Los datos de las personas están aquí arriba para corregirlos sin tocar el diseño.

type Person = {
  nombre: string
  rol: string
  iniciales: string
  color: string
}

const TEAM: Person[] = [
  { nombre: 'José Isaac Santiago Ojeda', rol: 'Desarrollo', iniciales: 'JS', color: '#f59e0b' },
  { nombre: 'Erick Iván Ponce Hernández', rol: 'Desarrollo', iniciales: 'EP', color: '#a855f7' },
]

const IDEA_AUTHOR: Person = { nombre: 'Ing. César Armando Mota', rol: 'Autor de la idea', iniciales: 'CM', color: '#60a5fa' }

const ACADEMIC_ADVISOR: Person = { nombre: 'Ing. Leymi Olivares Barreiro', rol: 'Asesora académica', iniciales: 'LO', color: '#10b981' }

const STEPS: { icon: IconName; titulo: string; texto: string }[] = [
  { icon: 'business', titulo: 'Compra en un negocio participante', texto: 'Cafeterías, pastelerías y otros negocios locales de la región.' },
  { icon: 'qr', titulo: 'Escanea su código QR', texto: 'El negocio te muestra un código que dura 30 segundos y solo se puede usar una vez.' },
  { icon: 'reward', titulo: 'Usa tus puntos', texto: 'Sube de nivel, avanza en el pase de batalla, decora tu isla y canjea recompensas.' },
]

function Avatar({ person }: { person: Person }) {
  return (
    <div
      aria-hidden="true"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold"
      style={{ background: `${person.color}22`, border: `1px solid ${person.color}55`, color: person.color }}
    >
      {person.iniciales}
    </div>
  )
}

function PersonRow({ person }: { person: Person }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar person={person} />
      <div className="min-w-0">
        <p className="font-display text-sm font-bold text-white">{person.nombre}</p>
        <p className="text-xs text-white/50">{person.rol}</p>
      </div>
    </div>
  )
}

export function AboutPage() {
  const goBack = useGoBack('/profile')
  const people = [...TEAM, IDEA_AUTHOR, ACADEMIC_ADVISOR]

  return (
    <Page>
      <ScreenHeader onBack={goBack} title="ACERCA DEL PROYECTO" />

      <div className="flex flex-col gap-6 px-5 pb-8">
        <div className="flex flex-col gap-4">
          <IslandView size="sm" />
          <div className="text-center">
            <h2 className="pb-text-gold font-display text-3xl font-bold tracking-widest">PASE DE BATALLA</h2>
            <p className="mt-1 text-sm text-white/60">Gana puntos, sube de nivel y construye tu propia isla.</p>
          </div>
        </div>

        <section className="flex flex-col gap-3">
          <SectionTitle className="text-white/40">Propósito</SectionTitle>
          <div className="pb-card flex flex-col gap-3 rounded-2xl p-5 text-sm leading-relaxed text-white/70">
            <p>
              Pase de Batalla es un programa de lealtad para los negocios locales, pensado principalmente para apoyar a la comunidad de{' '}
              <span className="font-semibold text-white">Gustavo Díaz Ordaz, Tamaulipas</span>. Cada compra en un negocio participante te da puntos que se
              juntan en una sola cuenta, sin importar en cuál negocio los ganes.
            </p>
            <p>
              Para los negocios es una forma sencilla y segura de premiar a sus clientes frecuentes: sustituye a las tarjetas de sellos de papel, que se
              pierden o se pueden falsificar, y les da información sobre la actividad de su negocio.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle className="text-white/40">Cómo funciona</SectionTitle>
          <ol className="flex flex-col gap-2">
            {STEPS.map((step, index) => (
              <li className="pb-card flex items-start gap-3 rounded-2xl p-4" key={step.titulo}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <Icon name={step.icon} />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold text-white">
                    {index + 1}. {step.titulo}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/50">{step.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle className="text-white/40">El origen</SectionTitle>
          <div className="pb-card flex flex-col gap-4 rounded-2xl p-5 text-sm leading-relaxed text-white/70">
            <p>
              La idea de Pase de Batalla surgió del <span className="font-semibold text-white">{IDEA_AUTHOR.nombre}</span> y se convirtió en un proyecto de
              estadía de la <span className="font-semibold text-white">Universidad Politécnica de la Región Ribereña (UPRR)</span>, en Ciudad Miguel Alemán,
              Tamaulipas.
            </p>
            <p>
              Durante la estadía, dos estudiantes de la UPRR diseñan y desarrollan la plataforma (esta app para clientes y el panel para los negocios), con la
              asesoría académica de la <span className="font-semibold text-white">{ACADEMIC_ADVISOR.nombre}</span>.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle className="text-white/40">Equipo</SectionTitle>
          <div className="pb-card flex flex-col gap-4 rounded-2xl p-5">
            {people.map((person) => (
              <PersonRow key={person.nombre} person={person} />
            ))}
          </div>
        </section>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-white/30">
          <Icon color="currentColor" name="location" />
          Gustavo Díaz Ordaz, Tamaulipas
        </p>
      </div>
    </Page>
  )
}
