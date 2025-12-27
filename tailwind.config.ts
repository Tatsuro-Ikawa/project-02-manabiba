import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // カスタムタイポグラフィー設定
      typography: {
        // フォントファミリー
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif'],
          mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
        },
        
        // フォントサイズ（プロジェクト固有）
        fontSize: {
          // 見出し用
          'h1': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '700' }], // 36px
          'h2': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '600' }], // 30px
          'h3': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }], // 24px
          'h4': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }], // 20px
          
          // 本文用
          'body-lg': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '400' }], // 18px
          'body': ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }], // 16px
          'body-sm': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }], // 14px
          
          // UI用
          'label': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }], // 14px
          'caption': ['0.75rem', { lineHeight: '1rem', fontWeight: '400' }], // 12px
          'button': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }], // 14px
          
          // レスポンシブ用
          'header': ['1rem', { lineHeight: '1.25rem', fontWeight: '700' }], // 16px (スマホ)
          'header-md': ['1.125rem', { lineHeight: '1.375rem', fontWeight: '700' }], // 18px (タブレット)
          'header-lg': ['1.25rem', { lineHeight: '1.5rem', fontWeight: '700' }], // 20px (PC)
        },
        
        // 行間
        lineHeight: {
          'tight': '1.25',
          'snug': '1.375',
          'normal': '1.5',
          'relaxed': '1.625',
          'loose': '2',
        },
        
        // 文字間隔
        letterSpacing: {
          'tighter': '-0.05em',
          'tight': '-0.025em',
          'normal': '0em',
          'wide': '0.025em',
          'wider': '0.05em',
          'widest': '0.1em',
        },
      },
      
      // カスタムカラー（必要に応じて）
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
    },
  },
  plugins: [],
}

export default config
