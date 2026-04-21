/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg:      '#0B1729',
          surface: '#142338',
          hi:      '#1C2F49',
          line:    '#24385A',
          text:    '#F2F5FA',
          mid:     '#9AA9C2',
          dim:     '#667690',
          primary: '#F6B93B',
          ink:     '#1A1205',
          danger:  '#FF5A5F',
          success: '#3DDC97',
          info:    '#5AA9FF',
        },
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.03) inset, 0 6px 20px rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
}
