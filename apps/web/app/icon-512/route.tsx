import { ImageResponse } from 'next/og';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1DB954, #6F42C1)',
          color: '#fff',
          fontSize: 280,
          fontWeight: 900,
          fontFamily: 'sans-serif',
        }}
      >
        O
      </div>
    ),
    { width: 512, height: 512 },
  );
}
