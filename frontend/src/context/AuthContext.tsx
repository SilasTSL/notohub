'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

export type AuthUser = {
  email: string
  username: string
}

type AuthContextType = {
  user: AuthUser | null
  login: (email: string, username: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)

  function login(email: string, username: string) {
    setUser({ email, username })
  }

  function logout() {
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
