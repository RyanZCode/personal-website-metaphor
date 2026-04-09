import { COLORS } from '../../lib/constants';
import SectionBackground from '../background/SectionBackground';

interface ContactSectionProps {
  isActive: boolean;
}

interface ContactMethod {
  platform: string;
  handle: string;
  descriptor: string;
  description: string;
  href: string;
}

const CONTACTS: ContactMethod[] = [
  {
    platform: 'GitHub',
    handle: 'github.com/RyanZCode',
    descriptor: 'Open Source',
    description: 'Projects, contributions, and everything I build in the open.',
    href: 'https://github.com/RyanZCode',
  },
  {
    platform: 'LinkedIn',
    handle: 'linkedin.com/in/ryanzhou154',
    descriptor: 'Professional',
    description: 'Work history, recommendations, and professional network.',
    href: 'https://www.linkedin.com/in/ryanzhou154/',
  },
  {
    platform: 'Email',
    handle: 'r97zhou@uwaterloo.ca',
    descriptor: 'Direct',
    description: 'Best for project inquiries, collaboration, or just saying hi.',
    href: 'mailto:r97zhou@uwaterloo.ca',
  },
];

const accent = 'hsl(25, 80%, 50%)';

export default function ContactSection({ isActive }: ContactSectionProps) {
  return (
    <section
      aria-hidden={!isActive}
      data-contact-section
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 12,
        pointerEvents: isActive ? 'auto' : 'none',
        color: 'var(--text-primary)',
      }}
    >
      <SectionBackground />
      {/* Watermark title */}
      <div
        data-section-title
        style={{
          position: 'absolute',
          top: '-3vh',
          left: '-1vw',
          fontSize: 'clamp(7rem, 16vw, 17rem)',
          fontWeight: 900,
          letterSpacing: '-0.06em',
          textTransform: 'uppercase',
          color: COLORS.textPrimary,
          opacity: 0.06,
          lineHeight: 1,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 0,
          whiteSpace: 'nowrap',
        }}
      >
        Contact
      </div>

      {/* Left content panel */}
      <div
        data-section-content
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '52vw',
          padding: '8vh 3vw 8vh 8vw',
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
          zIndex: 1,
        }}
      >
        <div
          data-contact-header
          style={{
            marginBottom: '3rem',
          }}
        >
        </div>

        <div data-contact-list style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {CONTACTS.map((contact, i) => {
            const isFirst = i === 0;
            return (
              <a
                key={contact.platform}
                href={contact.href}
                target="_blank"
                rel="noopener noreferrer"
                data-contact-row
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.2rem 1rem 1.2rem 0',
                  borderBottom: '1px solid rgba(240, 232, 236, 0.08)',
                  background: isFirst ? 'rgba(180, 90, 20, 0.1)' : 'transparent',
                  textDecoration: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                }}
              >
                {isFirst && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '-8vw',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      background: `linear-gradient(90deg, ${accent}28, rgba(180, 90, 20, 0.07) 60%, transparent)`,
                      pointerEvents: 'none',
                    }}
                  />
                )}
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div
                    style={{
                      fontSize: isFirst ? 'var(--font-fluid-lg)' : 'var(--font-fluid-md)',
                      fontWeight: isFirst ? 700 : 500,
                      letterSpacing: '0.04em',
                      color: isFirst ? COLORS.textPrimary : COLORS.textPrimaryDim,
                    }}
                  >
                    {contact.platform}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--font-fluid-sm)',
                      color: isFirst ? accent : COLORS.textPrimaryFade,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {contact.handle}
                  </div>
                  {isFirst && (
                    <div
                      style={{
                        fontFamily: 'Cambria, "Times New Roman", serif',
                        fontSize: 'var(--font-fluid-sm)',
                        color: COLORS.textPrimaryFade,
                        marginTop: '0.2rem',
                        maxWidth: '28rem',
                      }}
                    >
                      {contact.description}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    padding: '0.25rem 0.65rem',
                    background: isFirst ? `${accent}22` : 'rgba(240, 232, 236, 0.05)',
                    border: `1px solid ${isFirst ? accent + '55' : 'rgba(240, 232, 236, 0.1)'}`,
                    fontSize: 'var(--font-fluid-2xs)',
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: isFirst ? accent : COLORS.textPrimaryFade,
                    flexShrink: 0,
                    marginLeft: '1.5rem',
                    position: 'relative',
                  }}
                >
                  {contact.descriptor}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
