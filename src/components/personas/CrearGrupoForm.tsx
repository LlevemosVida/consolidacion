'use client'

import { useState } from 'react'
import { crearGrupoEnCasa } from '@/app/actions/grupos-actions'

interface Persona {
  id: string
  nombre_completo: string
}

interface Props {
  lideres: Persona[]
  onSuccess: () => void
  onCancel: () => void
}

export default function CrearGrupoForm({ lideres, onSuccess, onCancel }: Props) {
  const [barrio, setBarrio] = useState('')
  const [liderId, setLiderId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const res = await crearGrupoEnCasa({ barrio, liderId: liderId || undefined })

    setSubmitting(false)

    if (res?.error) {
      setError(res.error)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
      {error && <div className="p-2 bg-red-50 text-red-700 rounded-lg">{error}</div>}

      <div>
        <label className="block font-semibold text-slate-600 mb-1">
          Nombre del Barrio / Sector
        </label>
        <input
          type="text"
          required
          placeholder="Ej: Barrio San José"
          value={barrio}
          onChange={(e) => setBarrio(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0eb6f4] outline-none"
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-600 mb-1">
          Líder Encargado del Grupo
        </label>
        <select
          value={liderId}
          onChange={(e) => setLiderId(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0eb6f4] bg-white outline-none"
        >
          <option value="">Sin Líder Asignado</option>
          {lideres.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nombre_completo}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-lg hover:bg-slate-50 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-[#0eb6f4] text-white rounded-lg font-semibold hover:bg-[#0284c7] transition"
        >
          {submitting ? 'Creando Grupo...' : 'Crear Grupo en Casa'}
        </button>
      </div>
    </form>
  )
}