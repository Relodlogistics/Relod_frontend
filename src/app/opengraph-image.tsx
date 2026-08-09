import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'ReLod — Post a Load, Match a Truck, Track Every Mile';
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
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '80px',
          background: '#f9f8fc',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              width: 72,
              height: 72,
              borderRadius: 16,
              background: '#7c3aed',
              color: '#ffffff',
              fontSize: 40,
              fontWeight: 700,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            R
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, color: '#1a1523' }}>ReLod</div>
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 56,
            fontWeight: 700,
            color: '#1a1523',
            lineHeight: 1.15,
            maxWidth: 900,
          }}
        >
          Post a load. Match a truck. Track every mile.
        </div>
        <div style={{ marginTop: 28, fontSize: 28, color: '#6b6478', maxWidth: 800 }}>
          India&apos;s direct marketplace for shippers and truck owners.
        </div>
      </div>
    ),
    { ...size },
  );
}
