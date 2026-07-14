import type { useProfileForm } from '@/hooks/useProfileForm'
import { avatarColour } from '@/components/ProfilePreview'

type ProfileForm = ReturnType<typeof useProfileForm>

interface ProfileFormFieldsProps {
  username: string
  profile: ProfileForm
}

const SOCIAL_FIELDS = [
  { field: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/yourname' },
  { field: 'github', label: 'GitHub', placeholder: 'https://github.com/yourname' },
  { field: 'twitter', label: 'X (Twitter)', placeholder: 'https://x.com/yourname' },
] as const

/** Avatar upload + bio + social links fields — shared by the Profile page and onboarding. */
export default function ProfileFormFields({ username, profile }: ProfileFormFieldsProps) {
  const {
    form,
    setForm,
    previewAvatarUrl,
    avatarUploading,
    avatarError,
    handleAvatarChange,
    socialErrors,
    validateSocialUrl,
  } = profile

  const bioLength = form.bio.length
  const bioOver = bioLength > 280

  return (
    <div className="space-y-7">
      {/* Avatar */}
      <div className="bg-white rounded-2xl border border-[#e6e6e6] p-6">
        <label className="block text-sm font-semibold text-[#1a1a1a] mb-4">
          Profile Photo
        </label>
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            {previewAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewAvatarUrl}
                alt="Avatar preview"
                className="w-24 h-24 rounded-full object-cover border-2 border-[#e6e6e6]"
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-heading font-semibold select-none"
                style={{ backgroundColor: avatarColour(username) }}
              >
                {username[0]?.toUpperCase()}
              </div>
            )}
            {avatarUploading && (
              <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
                <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="avatar-input"
              className="cursor-pointer inline-block bg-white border border-[#e6e6e6] hover:border-[#1a8917] text-[#1a1a1a] text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {avatarUploading ? 'Uploading…' : 'Upload photo'}
            </label>
            <input
              id="avatar-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleAvatarChange}
              disabled={avatarUploading}
            />
            <p className="text-xs text-[#6b6b6b] mt-1.5">JPEG, PNG or WebP · max 5 MB</p>
            {avatarError && (
              <p className="text-xs text-red-500 mt-1">{avatarError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="bg-white rounded-2xl border border-[#e6e6e6] p-6">
        <label htmlFor="bio" className="block text-sm font-semibold text-[#1a1a1a] mb-2">
          Bio
        </label>
        <textarea
          id="bio"
          rows={4}
          maxLength={280}
          placeholder="Tell readers a bit about yourself…"
          value={form.bio}
          onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
          className="w-full border border-[#e6e6e6] rounded-lg px-3 py-2.5 text-sm text-[#1a1a1a] placeholder-[#b0b0b0] focus:outline-none focus:border-[#1a8917] resize-none transition-colors"
        />
        <p className={`text-xs mt-1 text-right ${bioOver ? 'text-red-500' : 'text-[#6b6b6b]'}`}>
          {bioLength}/280
        </p>
      </div>

      {/* Social links */}
      <div className="bg-white rounded-2xl border border-[#e6e6e6] p-6 space-y-4">
        <p className="text-sm font-semibold text-[#1a1a1a]">Social Links</p>

        {SOCIAL_FIELDS.map(({ field, label, placeholder }) => (
          <div key={field}>
            <label htmlFor={`social-${field}`} className="block text-xs font-medium text-[#6b6b6b] mb-1">
              {label}
            </label>
            <input
              id={`social-${field}`}
              type="url"
              placeholder={placeholder}
              value={form.socialLinks[field]}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  socialLinks: { ...prev.socialLinks, [field]: e.target.value },
                }))
              }
              onBlur={(e) => validateSocialUrl(field, e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm text-[#1a1a1a] placeholder-[#b0b0b0] focus:outline-none transition-colors ${
                socialErrors[field]
                  ? 'border-red-400 focus:border-red-400'
                  : 'border-[#e6e6e6] focus:border-[#1a8917]'
              }`}
            />
            {socialErrors[field] && (
              <p className="text-xs text-red-500 mt-1">{socialErrors[field]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
