'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function crearPersona(formData: {
  nombreCompleto: string
  telefono?: string
  direccion?: string
  tipoPersona: 'nuevo' | 'miembro' | 'lider' | 'pastor'
  rolSistema?: 'super_admin' | 'encargado' | 'pastor' | 'lider' | 'miembro' | null
  email?: string
  password?: string
  liderAsignadoId?: string
  fechaIngreso?: string
  grupoId?: string
}) {
  const supabase = await createServerClient()

  // 1. Validar autenticación
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()
  if (!currentUser) return { error: 'No autenticado' }

  const { data: currentPersona } = await supabase
    .from('personas')
    .select('rol_sistema, iglesia_id')
    .eq('auth_user_id', currentUser.id)
    .single()

  const rolesPermitidos = ['super_admin', 'pastor', 'encargado']
  if (!currentPersona || !rolesPermitidos.includes(currentPersona.rol_sistema)) {
    return { error: 'No tienes permisos para registrar personas.' }
  }

  let authUserId: string | null = null

  // Evaluamos si el registro es sin credenciales de usuario (Nuevo o Miembro)
  const esRegistroSinCredenciales = formData.tipoPersona === 'nuevo' || formData.tipoPersona === 'miembro'

  // 2. Crear usuario en Supabase Auth solo si requiere acceso (Líder, Admin, Pastor)
  if (!esRegistroSinCredenciales && formData.email && formData.password) {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: formData.email,
      password: formData.password,
      email_confirm: true,
    })

    if (authError) {
      return { error: `Error en Auth: ${authError.message}` }
    }

    authUserId = authData.user.id
  }

  // 3. Insertar registro en la tabla 'personas'
  const { error: insertError } = await supabase.from('personas').insert({
    nombre_completo: formData.nombreCompleto,
    telefono: formData.telefono || null,
    direccion: formData.direccion || null,
    iglesia_id: currentPersona.iglesia_id,
    tipo_persona: formData.tipoPersona,
    rol_sistema: esRegistroSinCredenciales ? (formData.tipoPersona === 'miembro' ? 'miembro' : null) : formData.rolSistema,
    auth_user_id: authUserId,
    grupo_id: formData.grupoId || null,
    lider_asignado_id: esRegistroSinCredenciales ? formData.liderAsignadoId || null : null,
    fecha_ingreso:
      esRegistroSinCredenciales
        ? formData.fechaIngreso || new Date().toISOString().split('T')[0]
        : null,
    estado_consolidacion: formData.tipoPersona === 'nuevo' ? 'activo' : null,
  })

  if (insertError) {
    return { error: `Error en la DB: ${insertError.message}` }
  }

  revalidatePath('/admin/personas')
  return { success: true }
}

export async function cambiarEstadoConsolidacion(
  personaId: string,
  nuevoEstado: string
) {
  const supabase = await createServerClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()
  if (!currentUser) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('personas')
    .update({ estado_consolidacion: nuevoEstado })
    .eq('id', personaId)

  if (error) {
    return { error: `Error al actualizar el estado: ${error.message}` }
  }

  revalidatePath('/lider/mis-consolidados')
  revalidatePath('/admin/personas')

  return { success: true }
}