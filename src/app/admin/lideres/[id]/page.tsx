import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default async function DetalleLiderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: liderId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 1. Obtener información del líder
  const { data: lider } = await supabase
    .from('personas')
    .select('id, nombre_completo, telefono, direccion')
    .eq('id', liderId)
    .single()

  if (!lider) redirect('/admin/lideres')

  // 2. Obtener los consolidados de este líder (agregado tipo_persona)
  const { data: consolidados } = await supabase
    .from('personas')
    .select('id, nombre_completo, telefono, estado_consolidacion, fecha_ingreso, tipo_persona')
    .eq('lider_asignado_id', lider.id)
    .order('fecha_ingreso', { ascending: false })

  const idsConsolidados = consolidados?.map((c) => c.id) || []

  // 3. Obtener el progreso de etapas
  let seguimientosMap: Record<string, number> = {}

  if (idsConsolidados.length > 0) {
    const { data: seguimientos } = await supabase
      .from('seguimiento_etapas')
      .select('persona_id, completado')
      .in('persona_id', idsConsolidados)
      .eq('completado', true)

    seguimientos?.forEach((s) => {
      seguimientosMap[s.persona_id] = (seguimientosMap[s.persona_id] || 0) + 1
    })
  }

  const listaConProgreso = consolidados?.map((c) => ({
    ...c,
    etapasCompletadas: seguimientosMap[c.id] || 0,
  }))

  const obtenerBadgeTipo = (tipo?: string) => {
    switch (tipo) {
      case 'nuevo':
        return (
          <span className="text-[10px] bg-sky-100 text-[#0284c7] font-semibold px-2 py-0.5 rounded-full border border-sky-200 uppercase">
            Nuevo
          </span>
        )
      case 'miembro':
        return (
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
            Miembro
          </span>
        )
      case 'lider':
        return (
          <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded-full border border-purple-200 uppercase">
            Líder
          </span>
        )
      case 'pastor':
        return (
          <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full border border-amber-200 uppercase">
            Pastor
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      <header className="bg-white border-b border-gray-200/80 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link
            href="/admin/lideres"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0eb6f4] hover:text-[#0a9ed6] transition"
          >
            &larr; Volver a Líderes
          </Link>

          <Image
            src="/images/Logo-Negro.png"
            alt="Logo Vida Abundante"
            width={32}
            height={32}
            className="object-contain"
          />
        </div>
      </header>

      <main className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
        {/* Header del Líder */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#0eb6f4] bg-[#0eb6f4]/10 px-2.5 py-1 rounded-full">
              Líder Encargado
            </span>
            <h1 className="text-2xl font-bold text-gray-800 pt-1">{lider.nombre_completo}</h1>
            <p className="text-xs text-gray-500 pt-1">
              📞 {lider.telefono || 'Sin celular'} | 📍 {lider.direccion || 'Sin dirección registrada'}
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-100 p-3.5 rounded-xl text-right">
            <span className="text-xs text-gray-500 block">Total en Consolidación</span>
            <span className="text-xl font-bold text-[#0eb6f4]">
              {listaConProgreso?.length || 0} Personas
            </span>
          </div>
        </div>

        {/* Lista de Consolidados */}
        <h2 className="text-lg font-bold text-gray-800 pt-2">Personas Asignadas</h2>

        {!listaConProgreso || listaConProgreso.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-gray-400 shadow-sm">
            Este líder no tiene personas asignadas actualmente.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {listaConProgreso.map((persona) => {
              const etapasCompletadas = persona.etapasCompletadas
              const porcentaje = Math.round((etapasCompletadas / 8) * 100)

              return (
                <div
                  key={persona.id}
                  className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className="font-bold text-gray-800 text-base leading-snug">
                        {persona.nombre_completo}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1 justify-end">
                        {obtenerBadgeTipo(persona.tipo_persona)}
                        <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full border border-slate-200 uppercase">
                          {persona.estado_consolidacion || 'activo'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mb-4">
                      📞 {persona.telefono || 'Sin teléfono'}
                    </p>

                    {/* Barra de Progreso */}
                    <div className="mb-5 space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-gray-600">
                        <span>Ruta de Crecimiento</span>
                        <span className="text-[#0eb6f4]">
                          {etapasCompletadas} / 8 ({porcentaje}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-gray-100">
                        <div
                          className="bg-[#0eb6f4] h-full rounded-full transition-all duration-500"
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Supervisión directa */}
                  <Link
                    href={`/admin/lideres/${lider.id}/seguimiento/${persona.id}`}
                    className="block text-center w-full bg-[#0eb6f4] text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-[#0a9ed6] transition shadow-sm"
                  >
                    Supervisar Etapas &rarr;
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}