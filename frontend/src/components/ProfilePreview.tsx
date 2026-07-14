function TwitterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.647.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  )
}

function LinkedinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

// Avatar initial colour — same deterministic logic as the server template.
const INITIAL_COLOURS = [
  '#1a8917', '#0077b6', '#c0392b', '#e67e22',
  '#7b2d8b', '#2d6a4f', '#e76f51',
]

export function avatarColour(username: string): string {
  const sum = Array.from(username).reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return INITIAL_COLOURS[sum % INITIAL_COLOURS.length]
}

interface ProfilePreviewProps {
  username: string
  bio: string
  avatarUrl: string
  socialLinks: { twitter: string; github: string; linkedin: string }
}

export default function ProfilePreview({ username, bio, avatarUrl, socialLinks }: ProfilePreviewProps) {
  const initial = username ? username[0].toUpperCase() : '?'
  const colour = avatarColour(username)

  return (
    <div className="bg-white rounded-2xl border border-[#e6e6e6] p-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#6b6b6b] mb-5">
        Preview
      </p>

      {/* Avatar */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={username}
          className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border-2 border-[#e6e6e6]"
        />
      ) : (
        <div
          className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-2xl font-heading font-semibold select-none"
          style={{ backgroundColor: colour }}
        >
          {initial}
        </div>
      )}

      {/* Username */}
      <p className="font-heading text-lg font-semibold text-[#1a1a1a] mb-1">{username || '—'}</p>

      {/* Bio */}
      {bio && (
        <p className="text-sm text-[#6b6b6b] leading-relaxed max-w-xs mx-auto mb-3">{bio}</p>
      )}

      {/* Social icons */}
      {(socialLinks.twitter || socialLinks.github || socialLinks.linkedin) && (
        <div className="flex gap-3 justify-center text-[#6b6b6b] mt-2">
          {socialLinks.twitter && (
            <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-[#1a8917] transition-colors">
              <TwitterIcon />
            </a>
          )}
          {socialLinks.github && (
            <a href={socialLinks.github} target="_blank" rel="noopener noreferrer" className="hover:text-[#1a8917] transition-colors">
              <GithubIcon />
            </a>
          )}
          {socialLinks.linkedin && (
            <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-[#1a8917] transition-colors">
              <LinkedinIcon />
            </a>
          )}
        </div>
      )}
    </div>
  )
}
