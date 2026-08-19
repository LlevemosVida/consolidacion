'use client'

import { useState } from 'react'
import {
  actualizarSeguimientoEtapa,
  iniciarSeguimientoEtapa,
} from '@/app/actions/seguimiento-actions'

interface EtapaItemProps {
  seguimientoId?: string | null
  personaId: string
  etapa: {
    id: string
    orden?: number
    nombre: string
    descripcion?: string
    tiene_subpasos: boolean
    total_subpasos?: number | null
  }
  completadoInicial: boolean
  subpasosIniciales: number
  notasIniciales: string
  fechaInicioInicial?: string | null
}

export default function EtapaItemCard({
  seguimientoId,
  personaId,
  etapa,
  completadoInicial,
  subpasosIniciales,
  notasIniciales,
  fechaInicioInicial,
}: EtapaItemProps) {
  const [completado, setCompletado] = useState(completadoInicial)
  const [subpasos, setSubpasos] = useState(subpasosIniciales)
  const [notas, setNotas] = useState(notasIniciales)
  const [fechaInicio, setFechaInicio] = useState<string | null | undefined>(fechaInicioInicial)

  const [saving, setSaving] = useState(false)
  const [starting, setStarting] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  // Guardar avances (funciona para etapas con o sin subpasos)
  const handleGuardar = async (nuevoCompletado = completado, nuevoSubpasos = subpasos) => {
    setSaving(true)
    setSavedMsg(false)

    const res = await actualizarSeguimientoEtapa({
      seguimientoId: seguimientoId || undefined,
      etapaId: etapa.id,
      personaId,
      completado: nuevoCompletado,
      subpasosCompletados: etapa.tiene_subpasos ? nuevoSubpasos : 0,
      notas,
    })

    setSaving(false)
    if (res.success) {
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2000)
    }
  }

  // Acción para comenzar etapa
  const handleComenzarEtapa = async () => {
    setStarting(true)
    const res = await iniciarSeguimientoEtapa({
      seguimientoId: seguimientoId || undefined,
      etapaId: etapa.id,
      personaId,
    })
    setStarting(false)

    if (res.success && res.fechaInicio) {
      setFechaInicio(res.fechaInicio)
    }
  }

  // Incrementar / decrementar subpasos (+ / -)
  const handleSubpasoChange = (delta: number) => {
    const max = etapa.total_subpasos || 1
    const nuevoValor = Math.max(0, Math.min(max, subpasos + delta))
    setSubpasos(nuevoValor)

    if (!fechaInicio && delta > 0) {
      handleComenzarEtapa()
    }

    const autoCompletado = nuevoValor === max
    if (autoCompletado !== completado) setCompletado(autoCompletado)

    handleGuardar(autoCompletado, nuevoValor)
  }

  const formatearFecha = (fechaIso?: string | null) => {
    if (!fechaIso) return null
    return new Date(fechaIso).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const totalSubpasos = etapa.total_subpasos || 0

  return (
    <div
      className={`border rounded-xl p-5 bg-white shadow-sm transition ${
        completado ? 'border-[#0eb6f4]/40 bg-[#0eb6f4]/5' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0eb6f4]/15 text-[#0883b2] font-bold flex items-center justify-center text-sm">
            {etapa.orden ? `#${etapa.orden}` : '📖'}
          </span>
          <div>
            <h3 className="font-bold text-gray-800 text-base">{etapa.nombre}</h3>
            {etapa.descripcion && (
              <p className="text-xs text-gray-500 mt-0.5">{etapa.descripcion}</p>
            )}

            {/* Fecha de inicio / Botón comenzar */}
            <div className="mt-2 flex items-center gap-2">
              {fechaInicio ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0883b2] bg-[#0eb6f4]/15 px-2 py-0.5 rounded-md">
                  🚀 Iniciado el: {formatearFecha(fechaInicio)}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleComenzarEtapa}
                  disabled={starting}
                  className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#0eb6f4] hover:bg-[#0a9ed6] active:scale-95 transition px-3 py-1 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {starting ? 'Iniciando...' : '▶ Comenzar esta etapa'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Checkbox de estado global de la etapa */}
        <label className="flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border text-xs font-semibold text-gray-700">
          <input
            type="checkbox"
            checked={completado}
            onChange={(e) => {
              const checked = e.target.checked
              setCompletado(checked)

              if (checked && !fechaInicio) {
                handleComenzarEtapa()
              }

              const nuevasLecciones = checked
                ? etapa.tiene_subpasos
                  ? totalSubpasos
                  : 0
                : subpasos

              setSubpasos(nuevasLecciones)
              handleGuardar(checked, nuevasLecciones)
            }}
            className="w-4 h-4 text-[#0eb6f4] rounded focus:ring-[#0eb6f4]"
          />
          {completado ? 'Etapa Completada' : 'Marcar Completada'}
        </label>
      </div>

      {/* Control de Subpasos (sólo se muestra si la etapa los tiene) */}
      {etapa.tiene_subpasos && totalSubpasos > 0 && (
        <div className="mt-4 pt-3 border-t flex items-center justify-between bg-gray-50 p-3 rounded-lg">
          <span className="text-xs font-medium text-gray-700">
            Avance de subpasos: <strong>{subpasos} de {totalSubpasos}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubpasoChange(-1)}
              disabled={subpasos <= 0 || saving}
              className="w-8 h-8 bg-white border rounded-lg font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 text-sm shadow-sm flex items-center justify-center"
            >
              -
            </button>
            <span className="text-sm font-semibold text-gray-800 px-2">{subpasos}</span>
            <button
              type="button"
              onClick={() => handleSubpasoChange(1)}
              disabled={subpasos >= totalSubpasos || saving}
              className="w-8 h-8 bg-white border rounded-lg font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 text-sm shadow-sm flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Observaciones */}
      <div className="mt-3">
        <textarea
          rows={2}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          onBlur={() => handleGuardar()}
          placeholder="Añade observaciones (ej: 'Completado con éxito, muestra buena disposición')"
          className="w-full p-2 border rounded-md text-xs outline-none focus:ring-1 focus:ring-[#0eb6f4] bg-gray-50/50 text-gray-800"
        />
      </div>

      {/* Indicadores */}
      <div className="mt-1 flex justify-end">
        {saving && <span className="text-xs text-gray-400">Guardando...</span>}
        {savedMsg && <span className="text-xs text-[#0a9ed6] font-medium">✓ Guardado</span>}
      </div>
    </div>
  )
}