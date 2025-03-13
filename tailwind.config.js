/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/renderer/**/*.{js,jsx,ts,tsx}",
        "./src/renderer/index.html",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    light: '#818CF8',
                    DEFAULT: '#4F46E5',
                    dark: '#3730A3',
                },
                secondary: {
                    light: '#E9D5FF',
                    DEFAULT: '#A855F7',
                    dark: '#7E22CE',
                }
            },
        },
    },
    plugins: [],
}; 