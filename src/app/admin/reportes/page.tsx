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

  const supabase = useMemo(() => createClient(), [])

  // 1. Carga de métricas y datos por módulo
  const cargarMetricasYDetalle = useCallback(async () => {
    setLoading(true)

    // Conteos
    const { count: lideresCount } = await supabase
      .from('personas')
      .select('*', { count: 'exact', head: true })
      .in('tipo_persona', ['lider', 'pastor'])

    const { count: nuevosCount } = await supabase
      .from('personas')
      .select('*', { count: 'exact', head: true })
      .eq('tipo_persona', 'nuevo')

    // Corregido: consulta a grupos_en_casa
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

    // Consultas específicas
    if (reporteActual === 'lideres') {
      // Se especifica !lider_id para guiar a Supabase en el JOIN inverso
      const { data, error } = await supabase
        .from('personas')
        .select('id, nombre_completo, telefono, created_at, grupos_en_casa!lider_id(barrio)')
        .in('tipo_persona', ['lider', 'pastor'])
        .order('nombre_completo', { ascending: true })

      if (error) {
        console.error('Error al cargar líderes:', error)
      }

      setDetalle(
        (data || []).map((p: any) => {
          // Manejar respuesta si viene como arreglo u objeto
          const grupoInfo = Array.isArray(p.grupos_en_casa) ? p.grupos_en_casa[0] : p.grupos_en_casa
          return {
            id: p.id,
            nombre_completo: p.nombre_completo,
            telefono: p.telefono || 'Sin teléfono',
            barrio_grupo: grupoInfo?.barrio || 'Sin asignación',
            created_at: new Date(p.created_at).toLocaleDateString(),
          }
        })
      )
    } else if (reporteActual === 'nuevos') {
      const { data } = await supabase
        .from('personas')
        .select('id, nombre_completo, telefono, estado_consolidacion, created_at, lider:lider_asignado_id(nombre_completo)')
        .eq('tipo_persona', 'nuevo')
        .order('created_at', { ascending: false })

      setDetalle(
        (data || []).map((p: any) => ({
          id: p.id,
          nombre_completo: p.nombre_completo,
          telefono: p.telefono || 'Sin teléfono',
          estado: p.estado_consolidacion || 'activo',
          nombre_lider: p.lider?.nombre_completo || 'Sin líder',
          created_at: new Date(p.created_at).toLocaleDateString(),
        }))
      )
    } else if (reporteActual === 'grupos') {
      // Corregido: consulta a grupos_en_casa seleccionando id, barrio, lider_id e iglesia_id
      const { data } = await supabase
        .from('grupos_en_casa')
        .select('id, barrio, iglesia_id, personas:lider_id(nombre_completo)')
        .order('barrio', { ascending: true })

      setDetalle(
        (data || []).map((g: any) => ({
          id: g.id,
          barrio: g.barrio || 'Sin Barrio',
          iglesia_id: g.iglesia_id || 'N/A',
          nombre_lider: g.personas?.nombre_completo || 'Sin líder encargado',
        }))
      )
    } else if (reporteActual === 'miembros') {
      const { data } = await supabase
        .from('personas')
        .select('id, nombre_completo, tipo_persona, telefono, created_at')
        .order('nombre_completo', { ascending: true })

      setDetalle(
        (data || []).map((p: any) => ({
          id: p.id,
          nombre_completo: p.nombre_completo,
          tipo: p.tipo_persona === 'nuevo' ? 'Nuevo' : p.tipo_persona === 'lider' ? 'Líder' : 'Pastor',
          telefono: p.telefono || 'Sin teléfono',
          created_at: new Date(p.created_at).toLocaleDateString(),
        }))
      )
    }

    setLoading(false)
  }, [supabase, reporteActual])

  const cargarDatos = useCallback(() => {
    cargarMetricasYDetalle()
  }, [cargarMetricasYDetalle])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const detalleFiltrado = useMemo(() => {
    return detalle.filter((item) =>
      Object.values(item).some((val) =>
        String(val).toLowerCase().includes(busqueda.toLowerCase())
      )
    )
  }, [detalle, busqueda])

  const exportarCSV = () => {
    if (!detalleFiltrado.length) return

    const keys = Object.keys(detalleFiltrado[0]).filter((k) => k !== 'id')
    const headers = keys.join(',')

    const rows = detalleFiltrado.map((row) =>
      keys.map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(',')
    )

    const csvContent = '\uFEFF' + [headers, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `reporte_${reporteActual}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0eb6f4] hover:text-[#0284c7] mb-2 transition"
            >
              &larr; Volver al Panel
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Módulo de Reportes y Estadísticas
            </h1>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={exportarCSV}
              className="bg-emerald-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-md hover:bg-emerald-700 transition flex items-center justify-center gap-2"
            >
              <span>📊</span> Exportar a Sheets / Excel
            </button>
            <button
              onClick={exportarOImprimir}
              className="bg-purple-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-md hover:bg-purple-700 transition flex items-center justify-center gap-2"
            >
              <span>🖨️</span> PDF
            </button>
          </div>
        </div>

        {/* Tarjetas resumen de métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                      <th className="p-3.5">Fecha Registro</th>
                    </>
                  )}
                  {reporteActual === 'nuevos' && (
                    <>
                      <th className="p-3.5">Nombre</th>
                      <th className="p-3.5">Teléfono</th>
                      <th className="p-3.5">Líder Asignado</th>
                      <th className="p-3.5">Estado</th>
                      <th className="p-3.5">Fecha</th>
                    </>
                  )}
                  {reporteActual === 'grupos' && (
                    <>
                      <th className="p-3.5">Barrio</th>
                      <th className="p-3.5">Líder Encargado</th>
                    </>
                  )}
                  {reporteActual === 'miembros' && (
                    <>
                      <th className="p-3.5">Nombre</th>
                      <th className="p-3.5">Tipo</th>
                      <th className="p-3.5">Teléfono</th>
                      <th className="p-3.5">Fecha Registro</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Cargando datos del reporte...
                    </td>
                  </tr>
                ) : detalleFiltrado.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
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
                          <td className="p-3.5 text-slate-500">{row.created_at}</td>
                        </>
                      )}
                      {reporteActual === 'nuevos' && (
                        <>
                          <td className="p-3.5 font-semibold text-slate-800">{row.nombre_completo}</td>
                          <td className="p-3.5 text-slate-600">{row.telefono}</td>
                          <td className="p-3.5 text-slate-600">{row.nombre_lider}</td>
                          <td className="p-3.5 capitalize text-slate-600">{row.estado}</td>
                          <td className="p-3.5 text-slate-500">{row.created_at}</td>
                        </>
                      )}
                      {reporteActual === 'grupos' && (
                        <>
                          <td className="p-3.5 font-semibold text-slate-800">🏡 {row.barrio}</td>
                          <td className="p-3.5 text-slate-600">{row.nombre_lider}</td>
                        </>
                      )}
                      {reporteActual === 'miembros' && (
                        <>
                          <td className="p-3.5 font-semibold text-slate-800">{row.nombre_completo}</td>
                          <td className="p-3.5 text-slate-600">{row.tipo}</td>
                          <td className="p-3.5 text-slate-600">{row.telefono}</td>
                          <td className="p-3.5 text-slate-500">{row.created_at}</td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}