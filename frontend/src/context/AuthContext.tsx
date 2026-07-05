'use client'

import '@/lib/amplify'
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import {
  authSignIn,
  authSignUp,
  authConfirmSignUp,
  authSignOut,
  authGetCurrentUser,
  authDeleteUser,
} from '@/lib/auth'
import { registerUser } from '@/lib/api'
import type { AuthUser } from '@/types'

const IS_FAKE_AUTH = process.env.NEXT_PUBLIC_USE_FAKE_AUTH === 'true'
const FAKE_USER_KEY = 'nh_fake_user'
const PENDING_USERNAME_KEY = 'nh_pending_username'
const PENDING_PASSWORD_KEY = 'nh_pending_pw'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username: string) => Promise<void>
  confirmSignUp: (email: string, code: string) => Promise<void>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      if (IS_FAKE_AUTH) {
        try {
          const stored = localStorage.getItem(FAKE_USER_KEY)
          if (stored) setUser(JSON.parse(stored) as AuthUser)
        } catch {
          localStorage.removeItem(FAKE_USER_KEY)
        }
        setLoading(false)
      } else {
        try {
          const currentUser = await authGetCurrentUser()
          setUser(currentUser)
          // If this session was confirmed but the DynamoDB write failed previously,
          // this idempotent call creates the missing record on the next visit.
          if (currentUser) registerUser().catch(() => {})
        } finally {
          setLoading(false)
        }
      }
    }
    init()
  }, [])

  async function signIn(email: string, password: string) {
    if (IS_FAKE_AUTH) {
      const fakeUser: AuthUser = { userId: 'fake-id', email, username: 'testuser' }
      localStorage.setItem(FAKE_USER_KEY, JSON.stringify(fakeUser))
      setUser(fakeUser)
      return
    }
    await authSignIn(email, password)
    const currentUser = await authGetCurrentUser()
    setUser(currentUser)
    registerUser().catch(() => {})
  }

  async function signUp(email: string, password: string, username: string) {
    if (IS_FAKE_AUTH) {
      const fakeUser: AuthUser = { userId: 'fake-id', email, username: 'testuser' }
      localStorage.setItem(FAKE_USER_KEY, JSON.stringify(fakeUser))
      setUser(fakeUser)
      return
    }
    await authSignUp(email, password, username)
    sessionStorage.setItem(PENDING_USERNAME_KEY, username)
    sessionStorage.setItem(PENDING_PASSWORD_KEY, password)
  }

  async function confirmSignUp(email: string, code: string) {
    if (IS_FAKE_AUTH) {
      // no-op in fake mode — user is already set by signUp
      return
    }
    const password = sessionStorage.getItem(PENDING_PASSWORD_KEY) ?? ''
    await authConfirmSignUp(email, code)
    sessionStorage.removeItem(PENDING_USERNAME_KEY)
    sessionStorage.removeItem(PENDING_PASSWORD_KEY)
    await authSignIn(email, password)
    // Non-fatal: if the DynamoDB write fails here the next signIn retries it.
    await registerUser().catch(() => {})
    const currentUser = await authGetCurrentUser()
    setUser(currentUser)
  }

  async function signOut() {
    if (IS_FAKE_AUTH) {
      localStorage.removeItem(FAKE_USER_KEY)
      setUser(null)
      return
    }
    await authSignOut()
    setUser(null)
  }

  // Deletes the Cognito login itself. Callers must delete backend data
  // (articles, profile, S3 content) first — this invalidates the session.
  async function deleteAccount() {
    if (IS_FAKE_AUTH) {
      localStorage.removeItem(FAKE_USER_KEY)
      setUser(null)
      return
    }
    await authDeleteUser()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, confirmSignUp, signOut, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
