import type { ReactNode } from 'react'
import { MAX_ACCURACY_M } from '../encuesta/geo'
import { LEGAL_CONTACT_EMAIL, LEGAL_UPDATED, LEGAL_VERSION } from './legalConfig'

type Section = {
  id: string
  title: string
  body: ReactNode
}

const SECTIONS: readonly Section[] = [
  {
    id: 'responsable',
    title: 'Quién trata tus datos',
    body: (
      <>
        <p>
          PulsoVecinal es un proyecto académico de encuestas ciudadanas georreferenciadas para los
          barrios de Valledupar. El equipo del proyecto es el responsable del tratamiento de los datos
          que se describen aquí.
        </p>
        <p>
          Para ejercer tus derechos escribe a{' '}
          {LEGAL_CONTACT_EMAIL !== null ? (
            <a className="font-semibold text-brand-700 underline underline-offset-4" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
              {LEGAL_CONTACT_EMAIL}
            </a>
          ) : (
            <strong>el correo de contacto del equipo (pendiente de publicar)</strong>
          )}
          .
        </p>
      </>
    ),
  },
  {
    id: 'datos',
    title: 'Qué datos recogemos',
    body: (
      <>
        <p>Cada reporte guarda únicamente:</p>
        <ul>
          <li>el barrio, la categoría del problema, el nivel de urgencia y tu descripción;</li>
          <li>la fecha y la hora del envío;</li>
          <li>
            <strong>opcionalmente</strong>, tu ubicación al momento de reportar (latitud, longitud y la
            precisión que midió tu dispositivo), la fecha en que la autorizaste y la versión de este
            texto ({LEGAL_VERSION}).
          </li>
        </ul>
        <p>
          No pedimos nombre, cédula, teléfono ni correo. Por eso te pedimos que{' '}
          <strong>no escribas datos personales de otras personas</strong> (nombres, teléfonos,
          direcciones exactas) en la descripción.
        </p>
      </>
    ),
  },
  {
    id: 'finalidad',
    title: 'Para qué los usamos',
    body: (
      <>
        <p>Usamos los reportes para:</p>
        <ul>
          <li>ubicar los problemas de cada barrio y mostrarlos en la sección Reportes en vivo;</li>
          <li>calcular qué barrios y categorías necesitan atención primero;</li>
          <li>análisis y presentación del proyecto académico.</li>
        </ul>
        <p>
          No vendemos los datos, no los usamos para publicidad y no los cruzamos con otras bases para
          identificarte.
        </p>
      </>
    ),
  },
  {
    id: 'consentimiento',
    title: 'Tu consentimiento sobre la ubicación',
    body: (
      <>
        <p>
          Una ubicación asociada a un reporte puede permitir ubicar el lugar desde donde alguien escribe,
          por eso la tratamos como dato personal. La ley exige que la autorización sea{' '}
          <strong>previa, expresa e informada</strong>. En PulsoVecinal esto significa:
        </p>
        <ul>
          <li>
            <strong>Es opcional.</strong> Puedes enviar el reporte eligiendo el barrio, sin ubicación.
          </li>
          <li>
            <strong>Es previa.</strong> El botón &laquo;Agregar mi ubicación actual&raquo; permanece
            bloqueado hasta que marques la casilla de autorización. Solo entonces el navegador te pide
            el permiso del GPS.
          </li>
          <li>
            <strong>Es expresa e informada.</strong> La casilla dice qué se guarda y que se muestra en
            el mapa público, y enlaza a este texto.
          </li>
          <li>
            <strong>Queda constancia.</strong> Guardamos la fecha de tu autorización y la versión de
            este texto, para poder demostrarla.
          </li>
          <li>
            <strong>Puedes quitarla.</strong> Antes de enviar, el botón &laquo;Quitar&raquo; descarta la
            ubicación. Después de enviar, puedes pedir su supresión (ver más abajo).
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'precision',
    title: 'Qué tan exacta es y qué se publica',
    body: (
      <>
        <p>
          Solo aceptamos una ubicación cuando tu dispositivo reporta una precisión de{' '}
          <strong>{MAX_ACCURACY_M} metros o menos</strong>. Si el GPS no llega a ese nivel, no se
          adjunta y puedes elegir el barrio de la lista.
        </p>
        <ul>
          <li>
            En la base de datos guardamos la ubicación con unos 1 m de resolución (5 decimales), para
            el análisis del equipo.
          </li>
          <li>
            En el mapa público se muestra redondeada a unos 11 m (4 decimales), sin nombre, sin
            contacto y sin tu descripción completa.
          </li>
          <li>
            Si estás fuera de Valledupar, la ubicación no se adjunta.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'derechos',
    title: 'Tus derechos',
    body: (
      <>
        <p>
          Como titular de datos personales puedes, según la Ley 1581 de 2012: conocer, actualizar y
          rectificar tus datos; pedir prueba de la autorización; ser informado del uso que se les da;
          revocar la autorización y solicitar la supresión de tus datos; y presentar quejas ante la
          Superintendencia de Industria y Comercio (SIC).
        </p>
        <p>
          Como no guardamos tu identidad, para encontrar tu reporte necesitaremos que nos indiques el
          barrio, la fecha aproximada y lo que escribiste en la descripción. Responderemos a tu
          solicitud en los plazos que fija la ley.
        </p>
      </>
    ),
  },
  {
    id: 'conservacion',
    title: 'Cuánto tiempo los conservamos',
    body: (
      <p>
        Las coordenadas de un reporte se conservan hasta 12 meses; después se eliminan y el reporte
        queda solo con barrio, categoría, urgencia y fecha, de forma que las estadísticas se mantienen
        sin ubicación. Si revocas tu autorización o pides la supresión, eliminamos la ubicación de ese
        reporte.
      </p>
    ),
  },
  {
    id: 'seguridad',
    title: 'Seguridad y límites de uso',
    body: (
      <>
        <ul>
          <li>El acceso al dashboard de análisis requiere usuario y contraseña.</li>
          <li>
            Para evitar abusos limitamos cuántos reportes puede enviar una misma conexión en un
            periodo. La dirección IP se usa solo para ese límite y puede quedar en los registros
            técnicos del servidor.
          </li>
          <li>La ubicación solo funciona en conexiones seguras (HTTPS).</li>
        </ul>
        <p>
          Ninguna medida es infalible; si detectas un uso indebido de tus datos, escríbenos y
          revisaremos el caso.
        </p>
      </>
    ),
  },
  {
    id: 'menores',
    title: 'Menores de edad',
    body: (
      <p>
        El servicio está dirigido a personas mayores de 18 años. Si eres menor, pide a una persona
        adulta que envíe el reporte, y no registres datos de menores de edad.
      </p>
    ),
  },
  {
    id: 'marco',
    title: 'Marco legal',
    body: (
      <>
        <ul>
          <li>Constitución Política de Colombia, artículo 15 (habeas data).</li>
          <li>Ley 1581 de 2012, régimen general de protección de datos personales.</li>
          <li>
            Decreto 1377 de 2013, sobre la autorización del titular, compilado en el Decreto 1074 de
            2015.
          </li>
          <li>
            Decreto 090 de 2018: la inscripción en el Registro Nacional de Bases de Datos aplica a
            entidades con activos superiores a 100.000 UVT; este proyecto académico no está en ese
            caso, pero se revisará si su alcance cambia.
          </li>
        </ul>
        <p className="rounded-2xl border border-slate-200 bg-slate-100 p-4 text-sm">
          Este texto es informativo y fue preparado por el equipo del proyecto; no es asesoría jurídica.
          Antes de operar el servicio con el público conviene que un abogado lo revise.
        </p>
      </>
    ),
  },
]

/** /legal: política de tratamiento de datos y consentimiento de ubicación. */
export default function LegalPage() {
  return (
    <div>
      <header className="border-b border-slate-200">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <h1 className="text-5xl font-bold leading-[1] text-slate-900 sm:text-6xl">
            Política de datos y consentimiento
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
            Qué datos guardamos cuando participas, para qué los usamos y cómo controlar tu ubicación.
          </p>
          <p className="mt-4 text-sm font-semibold text-slate-500">
            Versión {LEGAL_VERSION} · actualizada en {LEGAL_UPDATED}
          </p>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[16rem_1fr]">
        <nav aria-label="Contenido de la política" className="lg:sticky lg:top-24 lg:self-start">
          <ol className="space-y-1 border-l-2 border-slate-200 text-sm">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="-ml-0.5 block border-l-2 border-transparent py-1.5 pl-4 font-semibold text-slate-600 transition hover:border-slate-900 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="max-w-3xl space-y-12">
          {SECTIONS.map((section) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-title`}
              className="scroll-mt-24 [&_li]:mt-2 [&_p]:mt-3 [&_p]:leading-7 [&_p]:text-slate-700 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:text-slate-700"
            >
              <h2 id={`${section.id}-title`} className="font-display text-2xl font-bold text-slate-900">
                {section.title}
              </h2>
              {section.body}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
