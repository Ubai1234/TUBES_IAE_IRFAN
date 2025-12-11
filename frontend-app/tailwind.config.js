/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-blue': '#2563EB', // Biru utama (Royal Blue)
        'brand-dark': '#1E40AF', // Biru lebih gelap
        'brand-light': '#EFF6FF', // Biru sangat muda (hampir putih)
      },
      backgroundImage: {
        // Gradasi biru ke putih
        'ocean-gradient': 'linear-gradient(180deg, #3B82F6 0%, #FFFFFF 100%)',
      }
    },
  },
  plugins: [],
}