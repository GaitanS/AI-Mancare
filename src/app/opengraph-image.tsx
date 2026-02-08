import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'CatalogSmart - Cataloage Online Kaufland, Lidl, Profi';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0c0a09 0%, #1c1917 50%, #292524 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              'radial-gradient(circle at 20% 50%, rgba(225, 29, 72, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
            display: 'flex',
          }}
        />

        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: 'linear-gradient(90deg, #e11d48, #f97316, #eab308)',
            display: 'flex',
          }}
        />

        {/* Icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #e11d48, #be123c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            boxShadow: '0 8px 32px rgba(225, 29, 72, 0.3)',
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-0.02em',
            display: 'flex',
          }}
        >
          CatalogSmart
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            color: '#a8a29e',
            marginTop: 16,
            textAlign: 'center',
            maxWidth: 700,
            display: 'flex',
          }}
        >
          Cataloage Online Kaufland, Lidl, Profi
        </div>

        {/* Store badges */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginTop: 32,
          }}
        >
          {['Kaufland', 'Lidl', 'Profi'].map((store) => (
            <div
              key={store}
              style={{
                padding: '10px 24px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#d6d3d1',
                fontSize: 18,
                fontWeight: 600,
                display: 'flex',
              }}
            >
              {store}
            </div>
          ))}
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            fontSize: 16,
            color: '#78716c',
            display: 'flex',
          }}
        >
          Oferte actualizate saptamanal | Retete economice | Economiseste la cumparaturi
        </div>
      </div>
    ),
    { ...size }
  );
}
