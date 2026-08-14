'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="px-4 py-2 bg-[#0eb6f4]/10 text-[#0883b2] hover:bg-[#0eb6f4]/20 rounded-lg text-sm font-medium transition disabled:opacity-50"
    >
      {loading ? 'Cerrando sesión...' : 'Cerrar Sesión'}
    </button>
  )
}