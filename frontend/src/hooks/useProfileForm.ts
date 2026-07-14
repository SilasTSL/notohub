import { useCallback, useEffect, useRef, useState, ChangeEvent } from 'react'
import { getProfile, getAvatarUploadUrl, saveProfile } from '@/lib/api'

export interface ProfileFormState {
  bio: string
  avatarUrl: string
  socialLinks: { twitter: string; github: string; linkedin: string }
}

const EMPTY_FORM: ProfileFormState = {
  bio: '',
  avatarUrl: '',
  socialLinks: { twitter: '', github: '', linkedin: '' },
}

const URL_RE = /^https?:\/\/.+/i

function sameForm(a: ProfileFormState, b: ProfileFormState): boolean {
  return (
    a.bio === b.bio &&
    a.avatarUrl === b.avatarUrl &&
    a.socialLinks.twitter === b.socialLinks.twitter &&
    a.socialLinks.github === b.socialLinks.github &&
    a.socialLinks.linkedin === b.socialLinks.linkedin
  )
}

/**
 * Shared profile form state/logic — used by both the standalone Profile page
 * and the onboarding flow, so avatar upload, validation, and save behave
 * identically in both places.
 */
export function useProfileForm() {
  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM)
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string>('')
  const [profileLoading, setProfileLoading] = useState(true)

  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  const [socialErrors, setSocialErrors] = useState<Record<string, string>>({})

  const [saving, setSaving] = useState(false)
  const [successUrl, setSuccessUrl] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Snapshot of the last loaded-or-saved state, to detect unsaved changes.
  const savedSnapshotRef = useRef<ProfileFormState>(EMPTY_FORM)
  const [isDirty, setIsDirty] = useState(false)

  const loadProfile = useCallback(async () => {
    setProfileLoading(true)
    try {
      const profile = await getProfile()
      const loaded: ProfileFormState = {
        bio: profile.bio ?? '',
        avatarUrl: profile.avatarUrl ?? '',
        socialLinks: {
          twitter: profile.socialLinks?.twitter ?? '',
          github: profile.socialLinks?.github ?? '',
          linkedin: profile.socialLinks?.linkedin ?? '',
        },
      }
      setForm(loaded)
      setPreviewAvatarUrl(loaded.avatarUrl)
      savedSnapshotRef.current = loaded
      setIsDirty(false)
    } catch {
      // Non-fatal — user may not have a profile yet
    } finally {
      setProfileLoading(false)
    }
  }, [])

  // Recompute dirty state whenever the form changes.
  useEffect(() => {
    setIsDirty(!sameForm(form, savedSnapshotRef.current))
  }, [form])

  // Warn before closing/refreshing the tab with unsaved changes.
  useEffect(() => {
    if (!isDirty) return
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setAvatarError('Please upload a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('File must be smaller than 5 MB.')
      return
    }

    setAvatarError(null)

    // Instant local preview
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    const blobUrl = URL.createObjectURL(file)
    blobUrlRef.current = blobUrl
    setPreviewAvatarUrl(blobUrl)
    setAvatarUploading(true)

    try {
      const { uploadUrl, publicUrl } = await getAvatarUploadUrl(file.type)

      // Cache-Control must match exactly what the backend signed into the
      // upload URL (see generate_presigned_put_url) or S3 rejects the PUT
      // with a signature mismatch — this is what forces CloudFront/browsers
      // to revalidate on every load instead of serving a stale cached copy.
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type, 'Cache-Control': 'no-cache' },
      })
      if (!putRes.ok) {
        throw new Error(`Upload failed with status ${putRes.status}`)
      }

      // Upload succeeded — switch to the permanent public URL. This only
      // takes effect on the profile once "Save" persists it — until then
      // it's just sitting in form state, same as any other unsaved edit.
      URL.revokeObjectURL(blobUrl)
      blobUrlRef.current = null
      setPreviewAvatarUrl(publicUrl)
      setForm((prev) => ({ ...prev, avatarUrl: publicUrl }))
    } catch {
      setAvatarError('Upload failed. Please try again.')
      URL.revokeObjectURL(blobUrl)
      blobUrlRef.current = null
      setPreviewAvatarUrl(form.avatarUrl)
    } finally {
      setAvatarUploading(false)
    }
  }

  function validateSocialUrl(field: string, value: string) {
    if (value && !URL_RE.test(value)) {
      setSocialErrors((prev) => ({
        ...prev,
        [field]: 'Must be a valid URL starting with http:// or https://',
      }))
    } else {
      setSocialErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  async function handleSubmit(e?: React.FormEvent): Promise<boolean> {
    e?.preventDefault()

    if (Object.keys(socialErrors).length > 0) return false

    setSaving(true)
    setSaveError(null)
    setSuccessUrl(null)

    try {
      const payload: Parameters<typeof saveProfile>[0] = {}

      if (form.bio) payload.bio = form.bio
      if (form.avatarUrl) payload.avatarUrl = form.avatarUrl
      const sl = form.socialLinks
      if (sl.twitter || sl.github || sl.linkedin) {
        payload.socialLinks = {}
        if (sl.twitter) payload.socialLinks.twitter = sl.twitter
        if (sl.github) payload.socialLinks.github = sl.github
        if (sl.linkedin) payload.socialLinks.linkedin = sl.linkedin
      }

      const { url } = await saveProfile(payload)
      setSuccessUrl(url)
      savedSnapshotRef.current = form
      setIsDirty(false)
      return true
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      return false
    } finally {
      setSaving(false)
    }
  }

  return {
    form,
    setForm,
    previewAvatarUrl,
    profileLoading,
    loadProfile,
    avatarUploading,
    avatarError,
    handleAvatarChange,
    socialErrors,
    validateSocialUrl,
    saving,
    successUrl,
    saveError,
    handleSubmit,
    isDirty,
  }
}
