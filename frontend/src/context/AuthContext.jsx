import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)
const TOKEN_STORAGE_KEY = 'token'
const USER_STORAGE_KEY = 'user'
const LEGACY_AUTH_STORAGE_KEY = 'rentease_auth'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const restoreSession = async () => {
      try {
        let localToken = localStorage.getItem(TOKEN_STORAGE_KEY)
        const legacyAuth = localStorage.getItem(LEGACY_AUTH_STORAGE_KEY)

        // One-time migration from legacy combined storage shape.
        if (!localToken && legacyAuth) {
          const parsedLegacy = JSON.parse(legacyAuth)
          if (parsedLegacy?.token) {
            localStorage.setItem(TOKEN_STORAGE_KEY, parsedLegacy.token)
            localToken = parsedLegacy.token
          }
          if (parsedLegacy?.user) {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(parsedLegacy.user))
          }
          localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY)
        }

        if (!localToken) {
          setLoading(false)
          return
        }

        const response = await api.get('/api/auth/me')

        setToken(localToken)
        setUser(response.data.user)
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data.user))
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        localStorage.removeItem(USER_STORAGE_KEY)
        localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY)
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
  }, [])

  useEffect(() => {
    console.log('Current user:', user)
    console.log('Token:', localStorage.getItem(TOKEN_STORAGE_KEY))
  }, [user])

  const persistAuthSession = (authToken, authUser) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, authToken)
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser))
    setToken(authToken)
    setUser(authUser)
  }

  const hydrateUserFromToken = async (authToken) => {
    const response = await api.get('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })

    return response.data.user
  }

  const login = async (mobileNumber, password) => {
    const response = await api.post('/api/auth/login', {
      mobileNumber,
      password,
    })

    const loginToken = response.data.token
    const loginUserFromServer = await hydrateUserFromToken(loginToken)

    persistAuthSession(loginToken, loginUserFromServer)

    return loginUserFromServer
  }

  const register = async ({ name, mobileNumber, password }) => {
    const response = await api.post('/api/auth/register', {
      name,
      mobileNumber,
      password,
    })

    const registerToken = response.data.token
    const registerUserFromServer = await hydrateUserFromToken(registerToken)

    persistAuthSession(registerToken, registerUserFromServer)

    return registerUserFromServer
  }

  useEffect(() => {
    const syncAuthFromStorage = () => {
      const latestToken = localStorage.getItem(TOKEN_STORAGE_KEY)
      const latestUserRaw = localStorage.getItem(USER_STORAGE_KEY)

      if (!latestToken || !latestUserRaw) {
        setToken(null)
        setUser(null)
        return
      }

      try {
        const latestUser = JSON.parse(latestUserRaw)
        setToken(latestToken)
        setUser(latestUser)
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        localStorage.removeItem(USER_STORAGE_KEY)
        setToken(null)
        setUser(null)
      }
    }

    window.addEventListener('storage', syncAuthFromStorage)

    return () => {
      window.removeEventListener('storage', syncAuthFromStorage)
    }
  }, [])

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(USER_STORAGE_KEY)
    localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY)
    setToken(null)
    setUser(null)

    if (window.location.pathname !== '/login') {
      window.location.assign('/login')
    }
  }

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
    }),
    [token, user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
