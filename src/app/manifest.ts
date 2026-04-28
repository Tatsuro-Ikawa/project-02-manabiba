import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '人生学び場 こころ道場',
    short_name: 'こころ道場',
    description:
      'AI×セルフマネジメント×伴走コーチングで、「なりたい自分」へ確実に歩むための場',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1a1a2e',
    orientation: 'portrait-primary',
    lang: 'ja',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
