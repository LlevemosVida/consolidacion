'use server'

import { createClient } from '@/lib/supabase/server'

// 1. Obtener un grupo con su líder y las personas asignadas
export async function getGrupoConIntegrantes(grupoId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('grupos_en_casa')
    .select(`
      id,
      barrio,
      lider:lider_id (
        id,
        nombre_completo,
        telefono
      ),
      integrantes:personas!grupo_id (
        id,
        nombre_completo,
        telefono,
        direccion,
        tipo_persona
      )
    `)
    .eq('id', grupoId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

// 2. Obtener una persona y el grupo al que pertenece (con datos del líder del grupo)
export async function getPersonaConGrupo(personaId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('personas')
    .select(`
      id,
      nombre_completo,
      telefono,
      direccion,
      grupo:grupo_id (
        id,
        barrio,
        lider:lider_id (
          id,
          nombre_completo,
          telefono
        )
      )
    `)
    .eq('id', personaId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

// 3. Asignar o remover una persona de un grupo
export async function asignarGrupoPersona(personaId: string, grupoId: string | null) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('personas')
    .update({ grupo_id: grupoId })
    .eq('id', personaId)

  if (error) throw new Error(error.message)
}
export async function crearGrupoEnCasa(data: { barrio: string; liderId?: string }) {
  const supabase = await createClient()

  const { error } = await supabase.from('grupos_en_casa').insert({
    barrio: data.barrio,
    lider_id: data.liderId || null,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function obtenerGrupos() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('grupos_en_casa')
    .select('*, lider:lider_id(nombre_completo)')
    .order('barrio', { ascending: true })

  if (error) return []
  return data
}