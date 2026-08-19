'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { obtenerGrupos } from '@/app/actions/grupos-actions'
import ResetPasswordModal from '@/components/ResetPasswordModal'
import CrearPersonaForm from '@/components/personas/CrearPersonaForm'
import CrearGrupoForm from '@/components/personas/CrearGrupoForm'
import EditarPersonaModal from '@/components/personas/EditarPersonasModal'
import Link from 'next/link'

interface Persona {
  id: string
  nombre_completo: string
  telefono?: string
  direccion?: string
  tipo_persona: 'nuevo' | 'miembro' | 'lider' | 'pastor'
  lider_asignado_id?: string | null
  grupo_id?: string | null
  auth_user_id?: string | null
  nombre_lider_asignado?: string | null
  barrio_grupo?: string | null
  created_at: string
}

interface Grupo {
  id: string
  barrio: string
}

type ModoModal = 'persona' | 'grupo'

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [lideres, setLideres] = useState<Persona[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('persona')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Estados para Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroGrupo, setFiltroGrupo] = useState<string>('todos')
  const [filtroLider, setFiltroLider] = useState<string>('todos')

  // Estado para controlar la persona enviada al Modal de Edición
  const [personaAEditar, setPersonaAEditar] = useState<Persona | null>(null)

  const [resetModalState, setResetModalState] = useState({
    isOpen: false,
    authUserId: '',
    nombre: '',
  })

  const supabase = useMemo(() => createClient(), [])

  const cargarDatos = useCallback(async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('personas')
      .select('*, lider:lider_asignado_id(nombre_completo), grupo:grupo_id(barrio)')
      .order('created_at', { ascending: false })

    const listaGrupos = await obtenerGrupos()
    setGrupos(listaGrupos)

    if (error) {
      setMessage({ type: 'error', text: 'Error al cargar los datos.' })
      setLoading(false)
      return
    }

    if (data) {
      const personasFormateadas: Persona[] = data.map((p: any) => ({
        ...p,
        nombre_lider_asignado: p.lider?.nombre_completo || null,
        barrio_grupo: p.grupo?.barrio || null,
      }))

      setPersonas(personasFormateadas)
      setLideres(personasFormateadas.filter((p) => p.tipo_persona === 'lider' || p.tipo_persona === 'pastor'))
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  // Lógica de filtrado dinámico
  const personasFiltradas = useMemo(() => {
    return personas.filter((p) => {
      // Filtro por Nombre / Búsqueda
      const coincideNombre = p.nombre_completo
        .toLowerCase()
        .includes(busqueda.toLowerCase())

      // Filtro por Tipo de Persona
      const coincideTipo =
        filtroTipo === 'todos' || p.tipo_persona === filtroTipo

      // Filtro por Grupo en Casa
      const coincideGrupo =
        filtroGrupo === 'todos'
          ? true
          : filtroGrupo === 'sin_grupo'
          ? !p.grupo_id
          : p.grupo_id === filtroGrupo

      // Filtro por Líder Asignado
      const coincideLider =
        filtroLider === 'todos'
          ? true
          : filtroLider === 'sin_lider'
          ? !p.lider_asignado_id
          : p.lider_asignado_id === filtroLider

      return coincideNombre && coincideTipo && coincideGrupo && coincideLider
    })
  }, [personas, busqueda, filtroTipo, filtroGrupo, filtroLider])

  const limpiarFiltros = () => {
    setBusqueda('')
    setFiltroTipo('todos')
    setFiltroGrupo('todos')
    setFiltroLider('todos')
  }

  const handleSuccessModal = () => {
    setIsModalOpen(false)
    setMessage({ type: 'success', text: 'Operación realizada correctamente.' })
    cargarDatos()
  }

  const handleSuccessEdicion = () => {
    setPersonaAEditar(null)
    setMessage({ type: 'success', text: 'Persona actualizada con éxito.' })
    cargarDatos()
  }

  const obtenerEtiquetaTipo = (tipo: string) => {
    switch (tipo) {
      case 'nuevo':
        return 'Nuevo'
      case 'miembro':
        return 'Miembro'
      case 'lider':
        return 'Líder'
      case 'pastor':
        return 'Pastor'
      default:
        return tipo
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0eb6f4] hover:text-[#0284c7] mb-2 transition"
            >
              &larr; Volver al Panel
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Gestión de Integrantes y Grupos
            </h1>
          </div>

          <button
            onClick={() => {
              setModoModal('persona')
              setIsModalOpen(true)
            }}
            className="bg-[#0eb6f4] text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-md hover:bg-[#0284c7] transition flex items-center justify-center gap-2"
          >
            <span>+</span> Administrar Integrantes / Grupos
          </button>
        </div>

        {message && (
          <div
            className={`p-3.5 rounded-xl text-sm border-l-4 ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                : 'bg-red-50 border-red-500 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Panel de Búsqueda y Filtros */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Búsqueda por Nombre */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Buscar por Nombre
              </label>
              <input
                type="text"
                placeholder="Ej: Juan Pérez..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border rounded-xl focus:ring-2 focus:ring-[#0eb6f4] outline-none bg-slate-50"
              />
            </div>

            {/* Filtro por Tipo */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Tipo
              </label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border rounded-xl focus:ring-2 focus:ring-[#0eb6f4] outline-none bg-slate-50"
              >
                <option value="todos">Todos los Tipos</option>
                <option value="nuevo">Nuevo / Integrante</option>
                <option value="miembro">Miembro</option>
                <option value="lider">Líder</option>
                <option value="pastor">Pastor</option>
              </select>
            </div>

            {/* Filtro por Grupo */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Grupo en Casa
              </label>
              <select
                value={filtroGrupo}
                onChange={(e) => setFiltroGrupo(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border rounded-xl focus:ring-2 focus:ring-[#0eb6f4] outline-none bg-slate-50"
              >
                <option value="todos">Todos los Grupos</option>
                <option value="sin_grupo">Sin Grupo Asignado</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    🏡 {g.barrio}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Líder */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Líder Asignado
              </label>
              <select
                value={filtroLider}
                onChange={(e) => setFiltroLider(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border rounded-xl focus:ring-2 focus:ring-[#0eb6f4] outline-none bg-slate-50"
              >
                <option value="todos">Todos los Líderes</option>
                <option value="sin_lider">Sin Líder Asignado</option>
                {lideres.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre_completo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Estado de Filtros / Botón Limpiar */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t">
            <span>
              Mostrando <strong className="text-slate-800">{personasFiltradas.length}</strong> de{' '}
              {personas.length} registros
            </span>
            {(busqueda ||
              filtroTipo !== 'todos' ||
              filtroGrupo !== 'todos' ||
              filtroLider !== 'todos') && (
              <button
                onClick={limpiarFiltros}
                className="text-[#0eb6f4] hover:text-[#0284c7] font-semibold transition"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Tabla principal */}
        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase">
                  <th className="p-3.5 sm:p-4">Nombre</th>
                  <th className="p-3.5 sm:p-4">Tipo</th>
                  <th className="p-3.5 sm:p-4">Grupo en Casa</th>
                  <th className="p-3.5 sm:p-4">Líder Asignado</th>
                  <th className="p-3.5 sm:p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Cargando registros...
                    </td>
                  </tr>
                ) : personasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No se encontraron resultados con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  personasFiltradas.map((p) => (
                    <tr key={p.id} className="hover:bg-sky-50/40">
                      <td className="p-3.5 sm:p-4 font-semibold text-slate-800">{p.nombre_completo}</td>
                      <td className="p-3.5 sm:p-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            p.tipo_persona === 'nuevo'
                              ? 'bg-sky-100 text-[#0284c7]'
                              : p.tipo_persona === 'miembro'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-[#0eb6f4]/15 text-[#0369a1]'
                          }`}
                        >
                          {obtenerEtiquetaTipo(p.tipo_persona)}
                        </span>
                      </td>
                      <td className="p-3.5 sm:p-4 text-slate-600">
                        {p.barrio_grupo ? `🏡 ${p.barrio_grupo}` : <span className="text-slate-400 italic">Sin Grupo</span>}
                      </td>
                      <td className="p-3.5 sm:p-4 text-slate-600">
                        {p.nombre_lider_asignado || <span className="text-slate-400 italic">Sin Líder</span>}
                      </td>
                      <td className="p-3.5 sm:p-4 text-right space-x-3">
                        {/* Botón de Edición General */}
                        <button
                          onClick={() => setPersonaAEditar(p)}
                          className="text-xs text-[#0eb6f4] hover:text-[#0284c7] font-semibold hover:underline"
                        >
                          Editar
                        </button>

                        {/* Botón de Reset Password */}
                        {p.auth_user_id && (
                          <button
                            onClick={() =>
                              setResetModalState({
                                isOpen: true,
                                authUserId: p.auth_user_id!,
                                nombre: p.nombre_completo,
                              })
                            }
                            className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
                          >
                            Clave
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Principal Unificado */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white text-slate-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold">Administrar Sistema</h3>

              {/* Pestañas Simplificadas */}
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setModoModal('persona')}
                  className={`py-2 rounded-lg transition ${
                    modoModal === 'persona' ? 'bg-white text-[#0eb6f4] shadow-sm font-bold' : 'text-slate-500'
                  }`}
                >
                  Crear Persona
                </button>
                <button
                  onClick={() => setModoModal('grupo')}
                  className={`py-2 rounded-lg transition ${
                    modoModal === 'grupo' ? 'bg-white text-[#0eb6f4] shadow-sm font-bold' : 'text-slate-500'
                  }`}
                >
                  Crear Grupo
                </button>
              </div>

              {/* Formulario Dinámico Unificado */}
              {modoModal === 'persona' && (
                <CrearPersonaForm
                  lideres={lideres}
                  grupos={grupos}
                  onSuccess={handleSuccessModal}
                  onCancel={() => setIsModalOpen(false)}
                />
              )}

              {modoModal === 'grupo' && (
                <CrearGrupoForm
                  lideres={lideres}
                  onSuccess={handleSuccessModal}
                  onCancel={() => setIsModalOpen(false)}
                />
              )}
            </div>
          </div>
        )}

        {/* Modal de Edición de Persona */}
        <EditarPersonaModal
          isOpen={Boolean(personaAEditar)}
          persona={personaAEditar}
          lideres={lideres}
          grupos={grupos}
          onClose={() => setPersonaAEditar(null)}
          onSuccess={handleSuccessEdicion}
        />

        {/* Modal Reset Password */}
        <ResetPasswordModal
          isOpen={resetModalState.isOpen}
          authUserId={resetModalState.authUserId}
          nombrePersona={resetModalState.nombre}
          onClose={() => setResetModalState((prev) => ({ ...prev, isOpen: false }))}
        />
      </div>
    </div>
  )
}