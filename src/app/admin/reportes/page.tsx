'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface ReporteMetricas {
  totalLideres: number
  totalNuevos: number
  totalGrupos: number
  totalMiembros: number
}

type TipoReporte = 'lideres' | 'nuevos' | 'grupos' | 'miembros'

interface ModalDetalle {
  titulo: string
  subtitulo: string
  integrantes: Array<{
    id: string
    nombre_completo: string
    telefono?: string
    tipo_persona?: string
    barrio_grupo?: string
    nombre_lider?: string
  }>
}

export default function ReportesPage() {
  const [reporteActual, setReporteActual] = useState<TipoReporte>('lideres')
  const [loading, setLoading] = useState(true)
  const [metricas, setMetricas] = useState<ReporteMetricas>({
    totalLideres: 0,
    totalNuevos: 0,
    totalGrupos: 0,
    totalMiembros: 0,
  })
  const [detalle, setDetalle] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [modalData, setModalData] = useState<ModalDetalle | null>(null)

  const supabase = useMemo(() => createClient(), [])

  // 1. Carga de métricas y datos enriquecidos por módulo
  const cargarMetricasYDetalle = useCallback(async () => {
    setLoading(true)

    // Conteos rápidos
    const { count: lideresCount } = await supabase
      .from('personas')
      .select('*', { count: 'exact', head: true })
      .in('tipo_persona', ['lider', 'pastor'])

    const { count: nuevosCount } = await supabase
      .from('personas')
      .select('*', { count: 'exact', head: true })
      .eq('tipo_persona', 'nuevo')

    const { count: gruposCount } = await supabase
      .from('grupos_en_casa')
      .select('*', { count: 'exact', head: true })

    const { count: miembrosCount } = await supabase
      .from('personas')
      .select('*', { count: 'exact', head: true })

    setMetricas({
      totalLideres: lideresCount || 0,
      totalNuevos: nuevosCount || 0,
      totalGrupos: gruposCount || 0,
      totalMiembros: miembrosCount || 0,
    })

    // Consultas específicas para el reporte seleccionado
    if (reporteActual === 'lideres') {
      const { data, error } = await supabase
        .from('personas')
        .select(`
          id, 
          nombre_completo, 
          telefono, 
          created_at, 
          grupos_en_casa!lider_id(barrio),
          discipulos:personas!lider_asignado_id(id, nombre_completo, telefono, tipo_persona, grupo:grupo_id(barrio))
        `)
        .in('tipo_persona', ['lider', 'pastor'])
        .order('nombre_completo', { ascending: true })

      if (error) console.error('Error al cargar líderes:', error)

      setDetalle(
        (data || []).map((p: any) => {
          const grupoInfo = Array.isArray(p.grupos_en_casa) ? p.grupos_en_casa[0] : p.grupos_en_casa
          return {
            id: p.id,
            nombre_completo: p.nombre_completo,
            telefono: p.telefono || 'Sin teléfono',
            barrio_grupo: grupoInfo?.barrio || 'Sin asignación',
            cantidad_discipulos: p.discipulos?.length || 0,
            discipulos: (p.discipulos || []).map((d: any) => ({
              id: d.id,
              nombre_completo: d.nombre_completo,
              telefono: d.telefono || 'Sin teléfono',
              tipo_persona: d.tipo_persona,
              barrio_grupo: d.grupo?.barrio || 'Sin grupo',
            })),
            created_at: new Date(p.created_at).toLocaleDateString(),
          }
        })
      )
    } else if (reporteActual === 'nuevos') {
      const { data } = await supabase
        .from('personas')
        .select(`
          id, 
          nombre_completo, 
          telefono, 
          estado_consolidacion, 
          created_at, 
          lider:lider_asignado_id(nombre_completo),
          grupo:grupo_id(barrio)
        `)
        .eq('tipo_persona', 'nuevo')
        .order('created_at', { ascending: false })

      setDetalle(
        (data || []).map((p: any) => ({
          id: p.id,
          nombre_completo: p.nombre_completo,
          telefono: p.telefono || 'Sin teléfono',
          estado: p.estado_consolidacion || 'Activo',
          nombre_lider: p.lider?.nombre_completo || 'Sin líder',
          barrio_grupo: p.grupo?.barrio || 'Sin grupo asignado',
          created_at: new Date(p.created_at).toLocaleDateString(),
        }))
      )
    } else if (reporteActual === 'grupos') {
      const { data } = await supabase
        .from('grupos_en_casa')
        .select(`
          id, 
          barrio, 
          iglesia_id, 
          personas:lider_id(nombre_completo),
          integrantes:personas!grupo_id(id, nombre_completo, telefono, tipo_persona, lider:lider_asignado_id(nombre_completo))
        `)
        .order('barrio', { ascending: true })

      setDetalle(
        (data || []).map((g: any) => ({
          id: g.id,
          barrio: g.barrio || 'Sin Barrio',
          nombre_lider: g.personas?.nombre_completo || 'Sin líder encargado',
          cantidad_integrantes: g.integrantes?.length || 0,
          integrantes: (g.integrantes || []).map((i: any) => ({
            id: i.id,
            nombre_completo: i.nombre_completo,
            telefono: i.telefono || 'Sin teléfono',
            tipo_persona: i.tipo_persona,
            nombre_lider: i.lider?.nombre_completo || 'Sin líder',
          })),
        }))
      )
    } else if (reporteActual === 'miembros') {
      const { data } = await supabase
        .from('personas')
        .select(`
          id, 
          nombre_completo, 
          tipo_persona, 
          telefono, 
          created_at,
          lider:lider_asignado_id(nombre_completo),
          grupo:grupo_id(barrio)
        `)
        .order('nombre_completo', { ascending: true })

      setDetalle(
        (data || []).map((p: any) => ({
          id: p.id,
          nombre_completo: p.nombre_completo,
          tipo: p.tipo_persona === 'nuevo' ? 'Nuevo' : p.tipo_persona === 'lider' ? 'Líder' : p.tipo_persona === 'pastor' ? 'Pastor' : 'Miembro',
          telefono: p.telefono || 'Sin teléfono',
          barrio_grupo: p.grupo?.barrio || 'Sin grupo',
          nombre_lider: p.lider?.nombre_completo || 'Sin líder',
          created_at: new Date(p.created_at).toLocaleDateString(),
        }))
      )
    }

    setLoading(false)
  }, [supabase, reporteActual])

  useEffect(() => {
    cargarMetricasYDetalle()
  }, [cargarMetricasYDetalle])

  const detalleFiltrado = useMemo(() => {
    return detalle.filter((item) =>
      Object.values(item).some((val) =>
        typeof val === 'string' && val.toLowerCase().includes(busqueda.toLowerCase())
      )
    )
  }, [detalle, busqueda])

  // Función Helper para descargar CSV
  const descargarArchivoCSV = (filas: any[], nombreArchivo: string) => {
    if (!filas.length) return
    const keys = Object.keys(filas[0]).filter((k) => !['id', 'discipulos', 'integrantes'].includes(k))
    const headers = keys.join(',')

    const rows = filas.map((row) =>
      keys.map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(',')
    )

    const csvContent = '\uFEFF' + [headers, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${nombreArchivo}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Exportar Global según selección actual
  const exportarCSVGlobal = () => {
    if (!detalleFiltrado.length) return

    let datosAExportar: any[] = []

    if (reporteActual === 'lideres') {
      // Desglosa el líder con sus discípulos asignados y grupo
      detalleFiltrado.forEach((lider) => {
        if (lider.discipulos && lider.discipulos.length > 0) {
          lider.discipulos.forEach((d: any) => {
            datosAExportar.push({
              Lider: lider.nombre_completo,
              Telefono_Lider: lider.telefono,
              Grupo_Lider: lider.barrio_grupo,
              Nombre_Discipulo: d.nombre_completo,
              Telefono_Discipulo: d.telefono,
              Tipo_Discipulo: d.tipo_persona,
              Grupo_Discipulo: d.barrio_grupo,
            })
          })
        } else {
          datosAExportar.push({
            Lider: lider.nombre_completo,
            Telefono_Lider: lider.telefono,
            Grupo_Lider: lider.barrio_grupo,
            Nombre_Discipulo: 'Sin discípulos',
            Telefono_Discipulo: '-',
            Tipo_Discipulo: '-',
            Grupo_Discipulo: '-',
          })
        }
      })
    } else if (reporteActual === 'grupos') {
      // Desglosa los grupos con sus integrantes
      detalleFiltrado.forEach((grupo) => {
        if (grupo.integrantes && grupo.integrantes.length > 0) {
          grupo.integrantes.forEach((i: any) => {
            datosAExportar.push({
              Grupo_Barrio: grupo.barrio,
              Lider_Encargado: grupo.nombre_lider,
              Nombre_Integrante: i.nombre_completo,
              Telefono_Integrante: i.telefono,
              Tipo_Persona: i.tipo_persona,
              Lider_Asignado: i.nombre_lider,
            })
          })
        } else {
          datosAExportar.push({
            Grupo_Barrio: grupo.barrio,
            Lider_Encargado: grupo.nombre_lider,
            Nombre_Integrante: 'Sin integrantes',
            Telefono_Integrante: '-',
            Tipo_Persona: '-',
            Lider_Asignado: '-',
          })
        }
      })
    } else {
      datosAExportar = detalleFiltrado
    }

    descargarArchivoCSV(datosAExportar, `reporte_global_${reporteActual}`)
  }

  const exportarOImprimir = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0eb6f4] hover:text-[#0284c7] mb-2 transition print:hidden"
            >
              &larr; Volver al Panel
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Módulo de Reportes y Estadísticas
            </h1>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={exportarCSVGlobal}
              className="bg-emerald-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-md hover:bg-emerald-700 transition flex items-center justify-center gap-2"
            >
              <span>📊</span> Exportar Excel
            </button>
            <button
              onClick={exportarOImprimir}
              className="bg-purple-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-md hover:bg-purple-700 transition flex items-center justify-center gap-2"
            >
              <span>🖨️</span> PDF / Imprimir
            </button>
          </div>
        </div>

        {/* Tarjetas resumen de métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden">
          <button
            onClick={() => setReporteActual('lideres')}
            className={`p-4 rounded-2xl border text-left transition ${
              reporteActual === 'lideres'
                ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <p className="text-xs font-semibold text-slate-500 uppercase">Líderes Activos</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{metricas.totalLideres}</p>
          </button>

          <button
            onClick={() => setReporteActual('nuevos')}
            className={`p-4 rounded-2xl border text-left transition ${
              reporteActual === 'nuevos'
                ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <p className="text-xs font-semibold text-slate-500 uppercase">Nuevos Activos</p>
            <p className="text-2xl font-bold text-[#0097A3] mt-1">{metricas.totalNuevos}</p>
          </button>

          <button
            onClick={() => setReporteActual('grupos')}
            className={`p-4 rounded-2xl border text-left transition ${
              reporteActual === 'grupos'
                ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <p className="text-xs font-semibold text-slate-500 uppercase">Grupos en Casa</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{metricas.totalGrupos}</p>
          </button>

          <button
            onClick={() => setReporteActual('miembros')}
            className={`p-4 rounded-2xl border text-left transition ${
              reporteActual === 'miembros'
                ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Miembros</p>
            <p className="text-2xl font-bold text-[#0eb6f4] mt-1">{metricas.totalMiembros}</p>
          </button>
        </div>

        {/* Buscador de reporte */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm print:hidden">
          <input
            type="text"
            placeholder="Filtrar reporte..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-slate-50"
          />
        </div>

        {/* Tabla de reporte dinámico */}
        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-slate-50/50">
            <h2 className="font-bold text-sm text-slate-700 capitalize">
              Detalle del Reporte: {reporteActual.replace('_', ' ')} ({detalleFiltrado.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b text-slate-500 uppercase font-semibold">
                  {reporteActual === 'lideres' && (
                    <>
                      <th className="p-3.5">Nombre</th>
                      <th className="p-3.5">Teléfono</th>
                      <th className="p-3.5">Grupo</th>
                      <th className="p-3.5 text-center">Discípulos</th>
                      <th className="p-3.5 text-right print:hidden">Acción</th>
                    </>
                  )}
                  {reporteActual === 'nuevos' && (
                    <>
                      <th className="p-3.5">Nombre</th>
                      <th className="p-3.5">Teléfono</th>
                      <th className="p-3.5">Líder Asignado</th>
                      <th className="p-3.5">Grupo en Casa</th>
                      <th className="p-3.5">Estado</th>
                      <th className="p-3.5">Fecha</th>
                    </>
                  )}
                  {reporteActual === 'grupos' && (
                    <>
                      <th className="p-3.5">Barrio</th>
                      <th className="p-3.5">Líder Encargado</th>
                      <th className="p-3.5 text-center">Miembros Asignados</th>
                      <th className="p-3.5 text-right print:hidden">Acción</th>
                    </>
                  )}
                  {reporteActual === 'miembros' && (
                    <>
                      <th className="p-3.5">Nombre</th>
                      <th className="p-3.5">Tipo</th>
                      <th className="p-3.5">Teléfono</th>
                      <th className="p-3.5">Grupo</th>
                      <th className="p-3.5">Líder</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Cargando datos del reporte...
                    </td>
                  </tr>
                ) : detalleFiltrado.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No hay registros disponibles para este reporte.
                    </td>
                  </tr>
                ) : (
                  detalleFiltrado.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      {reporteActual === 'lideres' && (
                        <>
                          <td className="p-3.5 font-semibold text-slate-800">{row.nombre_completo}</td>
                          <td className="p-3.5 text-slate-600">{row.telefono}</td>
                          <td className="p-3.5 text-slate-600">🏡 {row.barrio_grupo}</td>
                          <td className="p-3.5 text-center font-bold text-purple-700">
                            {row.cantidad_discipulos}
                          </td>
                          <td className="p-3.5 text-right print:hidden">
                            <button
                              onClick={() =>
                                setModalData({
                                  titulo: `Discípulos de ${row.nombre_completo}`,
                                  subtitulo: `Grupo en Casa: ${row.barrio_grupo} | Tel: ${row.telefono}`,
                                  integrantes: row.discipulos,
                                })
                              }
                              className="text-xs bg-purple-100 text-purple-800 hover:bg-purple-200 px-3 py-1.5 rounded-lg font-semibold transition"
                            >
                              Ver personas ({row.cantidad_discipulos})
                            </button>
                          </td>
                        </>
                      )}
                      {reporteActual === 'nuevos' && (
                        <>
                          <td className="p-3.5 font-semibold text-slate-800">{row.nombre_completo}</td>
                          <td className="p-3.5 text-slate-600">{row.telefono}</td>
                          <td className="p-3.5 text-slate-600">{row.nombre_lider}</td>
                          <td className="p-3.5 text-slate-600">🏡 {row.barrio_grupo}</td>
                          <td className="p-3.5 capitalize text-slate-600">{row.estado}</td>
                          <td className="p-3.5 text-slate-500">{row.created_at}</td>
                        </>
                      )}
                      {reporteActual === 'grupos' && (
                        <>
                          <td className="p-3.5 font-semibold text-slate-800">🏡 {row.barrio}</td>
                          <td className="p-3.5 text-slate-600">{row.nombre_lider}</td>
                          <td className="p-3.5 text-center font-bold text-indigo-600">
                            {row.cantidad_integrantes}
                          </td>
                          <td className="p-3.5 text-right print:hidden">
                            <button
                              onClick={() =>
                                setModalData({
                                  titulo: `Miembros de Grupo: ${row.barrio}`,
                                  subtitulo: `Líder a cargo: ${row.nombre_lider}`,
                                  integrantes: row.integrantes,
                                })
                              }
                              className="text-xs bg-indigo-100 text-indigo-800 hover:bg-indigo-200 px-3 py-1.5 rounded-lg font-semibold transition"
                            >
                              Ver miembros ({row.cantidad_integrantes})
                            </button>
                          </td>
                        </>
                      )}
                      {reporteActual === 'miembros' && (
                        <>
                          <td className="p-3.5 font-semibold text-slate-800">{row.nombre_completo}</td>
                          <td className="p-3.5 text-slate-600">{row.tipo}</td>
                          <td className="p-3.5 text-slate-600">{row.telefono}</td>
                          <td className="p-3.5 text-slate-600">🏡 {row.barrio_grupo}</td>
                          <td className="p-3.5 text-slate-600">{row.nombre_lider}</td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Detalle Específico (Líder o Grupo) */}
        {modalData && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:p-0 print:bg-white print:static">
            <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none">
              
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{modalData.titulo}</h3>
                  <p className="text-xs text-slate-500">{modalData.subtitulo}</p>
                </div>
                <button
                  onClick={() => setModalData(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg print:hidden"
                >
                  ✕
                </button>
              </div>

              {/* Botones de acción del Modal */}
              <div className="flex justify-end gap-2 print:hidden">
                <button
                  onClick={() =>
                    descargarArchivoCSV(
                      modalData.integrantes,
                      `detalle_${modalData.titulo.replace(/\s+/g, '_').toLowerCase()}`
                    )
                  }
                  className="bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-emerald-700 transition"
                >
                  📊 Exportar a Excel
                </button>
                <button
                  onClick={exportarOImprimir}
                  className="bg-purple-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-purple-700 transition"
                >
                  🖨️ Imprimir / PDF
                </button>
              </div>

              {/* Lista de Integrantes del Modal */}
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b text-slate-500 uppercase font-semibold">
                      <th className="p-3">Nombre</th>
                      <th className="p-3">Teléfono</th>
                      <th className="p-3">Tipo / Rol</th>
                      {modalData.integrantes[0]?.barrio_grupo && <th className="p-3">Grupo</th>}
                      {modalData.integrantes[0]?.nombre_lider && <th className="p-3">Líder Asignado</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modalData.integrantes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400">
                          No hay integrantes asignados a este registro.
                        </td>
                      </tr>
                    ) : (
                      modalData.integrantes.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-800">{item.nombre_completo}</td>
                          <td className="p-3 text-slate-600">{item.telefono}</td>
                          <td className="p-3 capitalize text-slate-600">{item.tipo_persona || 'Miembro'}</td>
                          {item.barrio_grupo && <td className="p-3 text-slate-600">🏡 {item.barrio_grupo}</td>}
                          {item.nombre_lider && <td className="p-3 text-slate-600">{item.nombre_lider}</td>}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2 print:hidden">
                <button
                  onClick={() => setModalData(null)}
                  className="bg-slate-100 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl hover:bg-slate-200 transition"
                >
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  )
}