'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface ActualizarSeguimientoParams {
  seguimientoId?: string
  etapaId?: string
  personaId: string
  completado: boolean
  subpasosCompletados: number
  notas?: string
}

interface IniciarSeguimientoParams {
  seguimientoId?: string
  etapaId?: string
  personaId: string
}

// 1. Actualizar Avance Regular de la Etapa
export async function actualizarSeguimientoEtapa(params: ActualizarSeguimientoParams) {
  const supabase = await createClient()

  // Validar sesión
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesión no válida' }

  // Obtener el ID de la persona logueada (el líder que registra)
  const { data: personaLider } = await supabase
    .from('personas')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!personaLider) return { error: 'Perfil de líder no encontrado' }

  const fechaCompletado = params.completado ? new Date().toISOString().split('T')[0] : null

  // Payload para UPSERT
  const payload: Record<string, any> = {
    persona_id: params.personaId,
    completado: params.completado,
    subpasos_completados: params.subpasosCompletados,
    notas: params.notas || null,
    fecha_completado: fechaCompletado,
    registrado_por: personaLider.id,
    updated_at: new Date().toISOString(),
  }

  if (params.seguimientoId) {
    payload.id = params.seguimientoId
  }

  if (params.etapaId) {
    payload.etapa_id = params.etapaId
  }

  const { error } = await supabase
    .from('seguimiento_etapas')
    .upsert(payload, { onConflict: 'persona_id, etapa_id' })

  if (error) {
    return { error: `Error DB: ${error.message}` }
  }

  revalidatePath(`/lider/seguimiento/${params.personaId}`)
  return { success: true }
}

// 🎯 2. Iniciar la Etapa (Registrar Fecha de Inicio)
export async function iniciarSeguimientoEtapa(params: IniciarSeguimientoParams) {
  const supabase = await createClient()

  // Validar sesión
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesión no válida' }

  // Obtener el ID del líder logueado
  const { data: personaLider } = await supabase
    .from('personas')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!personaLider) return { error: 'Perfil de líder no encontrado' }

  // Fecha actual en formato YYYY-MM-DD
  const fechaInicioActual = new Date().toISOString().split('T')[0]

  // Payload para UPSERT
  const payload: Record<string, any> = {
    persona_id: params.personaId,
    fecha_inicio: fechaInicioActual,
    registrado_por: personaLider.id,
    updated_at: new Date().toISOString(),
  }

  if (params.seguimientoId) {
    payload.id = params.seguimientoId
  }

  if (params.etapaId) {
    payload.etapa_id = params.etapaId
  }

  const { error } = await supabase
    .from('seguimiento_etapas')
    .upsert(payload, { onConflict: 'persona_id, etapa_id' })

  if (error) {
    return { error: `Error DB: ${error.message}` }
  }

  revalidatePath(`/lider/seguimiento/${params.personaId}`)
  return { success: true, fechaInicio: fechaInicioActual }
}