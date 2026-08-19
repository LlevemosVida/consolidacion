'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Grupo {
  id: string
  barrio: string
}

export interface Persona {
  id: string
  nombre_completo: string
  telefono?: string
  direccion?: string
  tipo_persona: 'nuevo' |'miembro'| 'lider' | 'pastor'
  lider_asignado_id?: string | null
  grupo_id?: string | null
  auth_user_id?: string | null
  nombre_lider_asignado?: string | null
  barrio_grupo?: string | null
  created_at?: string
}

interface Props {
  isOpen: boolean
  persona: Persona | null
  lideres: Persona[]
  grupos: Grupo[]
  onClose: () => void
  onSuccess: () => void
}

export default function EditarPersonaModal({
  isOpen,
  persona,
  lideres,
  grupos,
  onClose,
  onSuccess,
}: Props) {
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [grupoId, setGrupoId] = useState('')
  const [liderAsignadoId, setLiderAsignadoId] = useState('')
  const [tipoPersona, setTipoPersona] = useState<'nuevo' | 'lider' |'miembro'| 'pastor'>('nuevo')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (persona) {
      setNombreCompleto(persona.nombre_completo || '')
      setTelefono(persona.telefono || '')
      setDireccion(persona.direccion || '')
      setGrupoId(persona.grupo_id || '')
      setLiderAsignadoId(persona.lider_asignado_id || '')
      setTipoPersona(persona.tipo_persona || 'nuevo')
      setError(null)
    }
  }, [persona])

  if (!isOpen || !persona) return null

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const supabase = createClient()

    const { error: updateError } = await supabase
      .from('personas')
      .update({
        nombre_completo: nombreCompleto,
        telefono: telefono || null,
        direccion: direccion || null,
        grupo_id: grupoId || null,
        lider_asignado_id: liderAsignadoId || null,
        tipo_persona: tipoPersona,
      })
      .eq('id', persona.id)

    setSubmitting(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      onSuccess()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white text-slate-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-lg font-bold text-slate-900">
            Editar Integrante
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleGuardar} className="space-y-3 text-xs sm:text-sm">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              Nombre Completo
            </label>
            <input
              type="text"
              required
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0eb6f4] outline-none transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0eb6f4] outline-none transition"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Rol / Tipo de Persona
              </label>
              <select
                value={tipoPersona}
                onChange={(e) => setTipoPersona(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0eb6f4] bg-white outline-none transition"
              >
                <option value="nuevo">Nuevo / Integrante</option>
                <option value="lider">Líder</option>
                <option value="pastor">Pastor</option>
                <option value="miembro">Miembro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              Dirección
            </label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0eb6f4] outline-none transition"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              Grupo en Casa Asignado
            </label>
            <select
              value={grupoId}
              onChange={(e) => setGrupoId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0eb6f4] bg-white outline-none transition"
            >
              <option value="">Sin Grupo en Casa</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  🏡 {g.barrio}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              Líder Asignado
            </label>
            <select
              value={liderAsignadoId}
              onChange={(e) => setLiderAsignadoId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0eb6f4] bg-white outline-none transition"
            >
              <option value="">Sin Líder Asignado</option>
              {lideres
                .filter((l) => l.id !== persona.id) // Evita asignarse a sí mismo como líder
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre_completo}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-[#0eb6f4] text-white rounded-lg font-semibold hover:bg-[#0284c7] transition disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}