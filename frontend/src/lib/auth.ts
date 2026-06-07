import {
  signUp,
  confirmSignUp,
  resendSignUpCode,
  signIn,
  signOut,
  getCurrentUser,
  fetchUserAttributes,
  fetchAuthSession,
} from 'aws-amplify/auth'

function mapError(error: unknown): never {
  const err = error as { name?: string; message?: string }
  switch (err.name) {
    case 'UsernameExistsException':
      throw new Error('An account with this email already exists')
    case 'InvalidPasswordException':
      throw new Error('Password must be at least 8 characters')
    case 'CodeMismatchException':
      throw new Error('Incorrect confirmation code')
    case 'ExpiredCodeException':
      throw new Error('Code expired, please request a new one')
    case 'NotAuthorizedException':
      throw new Error('Incorrect email or password')
    case 'UserNotFoundException':
      throw new Error('Incorrect email or password')
    default:
      throw new Error(err.message ?? 'An unexpected error occurred')
  }
}

export async function authSignUp(
  email: string,
  password: string,
  username: string
): Promise<{ step: 'CONFIRM_SIGN_UP' }> {
  try {
    await signUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          'custom:username': username,
        },
      },
    })
    return { step: 'CONFIRM_SIGN_UP' }
  } catch (error) {
    const err = error as { name?: string }
    if (err.name === 'UsernameExistsException') {
      // Account exists but may never have been confirmed. Try to resend the
      // code — if it succeeds the account is unconfirmed and we can still
      // onboard this user. If it fails, the account is confirmed and taken.
      try {
        await resendSignUpCode({ username: email })
        return { step: 'CONFIRM_SIGN_UP' }
      } catch {
        throw new Error('An account with this email already exists')
      }
    }
    mapError(error)
  }
}

export async function authConfirmSignUp(
  email: string,
  code: string
): Promise<void> {
  try {
    await confirmSignUp({
      username: email,
      confirmationCode: code,
    })
  } catch (error) {
    const err = error as { name?: string }
    // NotAuthorizedException here means the account is already confirmed
    // ("User cannot be confirmed. Current status is CONFIRMED"). The caller
    // can still proceed to sign-in — no need to surface this as an error.
    if (err.name === 'NotAuthorizedException') return
    mapError(error)
  }
}

export async function authSignIn(email: string, password: string): Promise<void> {
  try {
    await signIn({ username: email, password })
  } catch (error) {
    const err = error as { name?: string }
    // Amplify throws this when signIn is called while a session is already active
    // (e.g. a previous confirmation succeeded but a later step failed, leaving a
    // live session open). Sign out the stale session and retry.
    if (err.name === 'UserAlreadyAuthenticatedException') {
      await signOut()
      try {
        await signIn({ username: email, password })
      } catch (retryError) {
        mapError(retryError)
      }
      return
    }
    mapError(error)
  }
}

export async function authSignOut(): Promise<void> {
  try {
    await signOut()
  } catch (error) {
    mapError(error)
  }
}

export async function authGetCurrentUser(): Promise<{
  userId: string
  email: string
  username: string
} | null> {
  try {
    const { userId } = await getCurrentUser()
    const attrs = await fetchUserAttributes()
    return {
      userId,
      email: attrs.email ?? '',
      username: attrs['custom:username'] ?? '',
    }
  } catch {
    return null
  }
}

export async function authGetToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession()
    return session.tokens?.idToken?.toString() ?? null
  } catch {
    return null
  }
}

export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await authGetToken()
  if (!token) throw new Error('Not authenticated')
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}
