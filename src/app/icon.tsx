import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 55%, #0f3460 100%)',
          color: '#fff',
          fontSize: 220,
          fontWeight: 700,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        心
      </div>
    ),
    { ...size }
  );
}
