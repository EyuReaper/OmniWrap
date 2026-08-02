import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/site';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0b 0%, #121016 50%, #0a0a0b 100%)',
          padding: '80px',
        }}
      >
        <div
          style={{
            fontSize: 108,
            fontWeight: 900,
            backgroundImage: 'linear-gradient(90deg, #1DB954, #ffffff, #FF0000)',
            backgroundClip: 'text',
            color: 'transparent',
            fontFamily: 'sans-serif',
          }}
        >
          {SITE_NAME}
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 34,
            color: '#d4d4d8',
            fontFamily: 'sans-serif',
            textAlign: 'center',
            maxWidth: 900,
          }}
        >
          {SITE_DESCRIPTION}
        </div>
      </div>
    ),
    { ...size },
  );
}
