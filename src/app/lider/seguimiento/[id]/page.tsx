import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import EtapaItemCard from '@/components/EtapaItemCard'

export default async function SeguimientoPersonaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: personaId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 1. Cargar datos de la Persona
  const { data: persona } = await supabase
    .from('personas')
    .select('id, nombre_completo, telefono, direccion, fecha_ingreso')
    .eq('id', personaId)
    .single()

  if (!persona) redirect('/lider/mis-consolidados')

  // 2. Cargar TODAS las etapas definidas en el plan master
  const { data: todasLasEtapas, error: errorEtapas } = await supabase
    .from('etapas_plan')
    .select('id, orden, nombre, descripcion, tiene_subpasos, total_subpasos')
    .order('orden', { ascending: true })

  // 3. Cargar el seguimiento existente de esta persona
  const { data: seguimientos } = await supabase
    .from('seguimiento_etapas')
    .select('id, etapa_id, completado, subpasos_completados, notas, fecha_completado')
    .eq('persona_id', personaId)

  // Mapear seguimientos por etapa_id para acceso rápido
  const mapaSeguimientos = new Map<string, any>()
  seguimientos?.forEach((s) => {
    mapaSeguimientos.set(s.etapa_id, s)
  })

  // 4. Calcular el avance global del plan
  const totalEtapas = todasLasEtapas?.length || 0
  const etapasCompletadas = todasLasEtapas?.filter((e) => {
    const seg = mapaSeguimientos.get(e.id)
    return seg?.completado
  }).length || 0

  const porcentajeGlobal = totalEtapas > 0 ? Math.round((etapasCompletadas / totalEtapas) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      {/* Header / Nav */}
      <header className="bg-white border-b border-gray-200/80 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link
            href="/lider/mis-consolidados"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0eb6f4] hover:text-[#0a7da7] transition"
          >
            &larr; Volver a mis consolidados
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400 hidden sm:inline">
              Ruta de Crecimiento Llevando Vida
            </span>
            <Image
              src="/images/Logo-Negro.png"
              alt="Logo Vida Abundante"
              width={28}
              height={28}
              className="object-contain"
            />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Banner de la Persona */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#0eb6f4] bg-[#0eb6f4]/10 px-2.5 py-1 rounded-full">
              Ficha de Consolidación
            </span>
            <h1 className="text-2xl font-bold text-gray-800 pt-1">
              {persona.nombre_completo}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 pt-1">
              <span className="flex items-center gap-1">
                📞 {persona.telefono || 'Sin celular'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                📍 {persona.direccion || 'Sin dirección registrada'}
              </span>
            </div>
          </div>

          {/* Widget de Progreso General */}
          <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl flex flex-col justify-between min-w-[220px]">
            <div className="flex justify-between items-center text-xs font-bold text-gray-700 mb-2">
              <span>Avance Global</span>
              <span className="text-[#0eb6f4]">
                {etapasCompletadas} / {totalEtapas} Etapas
              </span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-1">
              <div
                className="bg-[#0eb6f4] h-full rounded-full transition-all duration-500"
                style={{ width: `${porcentajeGlobal}%` }}
              />
            </div>
            <span className="text-[11px] text-right text-gray-400 font-medium">
              {porcentajeGlobal}% Completado
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <h2 className="text-lg font-bold text-gray-800">
            Ruta de Crecimiento ({totalEtapas} Etapas)
          </h2>
          <span className="text-xs text-gray-500">
            Marca el progreso de cada etapa
          </span>
        </div>

        {/* Lista Completa de Etapas */}
        {!todasLasEtapas || todasLasEtapas.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center text-gray-500 text-sm">
            No hay etapas configuradas en la tabla <code className="text-xs font-mono">etapas_plan</code>.
          </div>
        ) : (
          <div className="space-y-4">
            {todasLasEtapas.map((etapa) => {
              const seguimiento = mapaSeguimientos.get(etapa.id)

              return (
                <EtapaItemCard
                  key={etapa.id}
                  seguimientoId={seguimiento?.id || null}
                  personaId={persona.id}
                  etapa={{
                    id: etapa.id,
                    orden: etapa.orden,
                    nombre: etapa.nombre,
                    descripcion: etapa.descripcion,
                    tiene_subpasos: etapa.tiene_subpasos,
                    total_subpasos: etapa.total_subpasos,
                  }}
                  completadoInicial={seguimiento?.completado || false}
                  subpasosIniciales={seguimiento?.subpasos_completados || 0}
                  notasIniciales={seguimiento?.notas || ''}
                />
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}