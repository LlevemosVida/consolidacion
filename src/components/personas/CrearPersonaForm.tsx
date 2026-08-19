'use client'

import { useState } from 'react'
import { crearPersona } from '@/app/actions/personas-actions'

interface Grupo {
  id: string
  barrio: string
}

interface Persona {
  id: string
  nombre_completo: string
}

interface Props {
  lideres: Persona[]
  grupos: Grupo[]
  onSuccess: () => void
  onCancel: () => void
}

type TipoRolForm = 'nuevo' | 'miembro' | 'lider' | 'super_admin'

export default function CrearPersonaForm({
  lideres,
  grupos,
  onSuccess,
  onCancel,
}: Props) {
  const [tipoRol, setTipoRol] = useState<TipoRolForm>('nuevo')
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [liderAsignadoId, setLiderAsignadoId] = useState('')
  const [grupoId, setGrupoId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    let tipoPersonaPayload: 'nuevo' | 'miembro' | 'lider' | 'pastor' = 'nuevo'
    let rolSistemaPayload: 'super_admin' | 'encargado' | 'pastor' | 'lider' | 'miembro' | null = null

    if (tipoRol === 'nuevo') {
      tipoPersonaPayload = 'nuevo'
      rolSistemaPayload = null
    } else if (tipoRol === 'miembro') {
      tipoPersonaPayload = 'miembro'
      rolSistemaPayload = 'miembro'
    } else if (tipoRol === 'lider') {
      tipoPersonaPayload = 'lider'
      rolSistemaPayload = 'lider'
    } else if (tipoRol === 'super_admin') {
      tipoPersonaPayload = 'pastor'
      rolSistemaPayload = 'super_admin'
    }

    const esSinCredenciales = tipoRol === 'nuevo' || tipoRol === 'miembro'

    const res = await crearPersona({
      nombreCompleto,
      telefono,
      direccion,
      tipoPersona: tipoPersonaPayload,
      rolSistema: rolSistemaPayload,
      email: !esSinCredenciales ? email : undefined,
      password: !esSinCredenciales ? password : undefined,
      liderAsignadoId: esSinCredenciales ? liderAsignadoId : undefined,
      grupoId: grupoId || undefined,
    })

    setSubmitting(false)

    if (res?.error) {
      setError(res.error)
    } else {
      onSuccess()
    }
  }

  const esSinCredenciales = tipoRol === 'nuevo' || tipoRol === 'miembro'

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
      {error && <div className="p-2.5 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>}

      {/* Selector de Rol Principal */}
      <div>
        <label className="block font-semibold text-slate-700 mb-1">Tipo de Registro</label>
        <select
          value={tipoRol}
          onChange={(e) => setTipoRol(e.target.value as TipoRolForm)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0eb6f4] bg-slate-50 font-medium outline-none"
        >
          <option value="nuevo">Nuevo / Integrante</option>
          <option value="miembro">Miembro de la Iglesia</option>
          <option value="lider">Líder de Grupo</option>
          <option value="super_admin">Super Admin / Pastor</option>
        </select>
      </div>

      <div>
        <label className="block font-semibold text-slate-600 mb-1">Nombre Completo *</label>
        <input
          type="text"
          required
          value={nombreCompleto}
          onChange={(e) => setNombreCompleto(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0eb6f4] outline-none"
          placeholder="Ej: Juan Pérez"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold text-slate-600 mb-1">Teléfono</label>
          <input
            type="text"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0eb6f4] outline-none"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-600 mb-1">Dirección</label>
          <input
            type="text"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0eb6f4] outline-none"
          />
        </div>
      </div>

      {/* Asignación de Grupo en Casa */}
      <div>
        <label className="block font-semibold text-slate-600 mb-1">Grupo en Casa</label>
        <select
          value={grupoId}
          onChange={(e) => setGrupoId(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0eb6f4] bg-white outline-none"
        >
          <option value="">Sin Grupo Asignado</option>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>
              🏡 {g.barrio}
            </option>
          ))}
        </select>
      </div>

      {/* Solo para "Nuevo" o "Miembro" */}
      {esSinCredenciales && (
        <div>
          <label className="block font-semibold text-slate-600 mb-1">Líder Asignado</label>
          <select
            value={liderAsignadoId}
            onChange={(e) => setLiderAsignadoId(e.target.value)}
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
      )}

      {/* Solo para "Líder" o "Super Admin" */}
      {!esSinCredenciales && (
        <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100 space-y-3">
          <p className="font-semibold text-xs text-[#0284c7]">Credenciales de Acceso al Sistema</p>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Correo Electrónico *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0eb6f4] bg-white outline-none"
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Contraseña Inicial *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0eb6f4] bg-white outline-none"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
        </div>
      )}

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
          className="px-4 py-2 bg-[#0eb6f4] text-white rounded-lg font-semibold hover:bg-[#0284c7] transition disabled:opacity-50"
        >
          {submitting ? 'Guardando...' : 'Guardar Integrante'}
        </button>
      </div>
    </form>
  )
}