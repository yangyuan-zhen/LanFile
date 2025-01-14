/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html"
    ],
    theme: {
        extend: {
            colors: {
                primary: '#4F46E5',
                secondary: '#6B7280',
            },
        },
    },
    plugins: [],
}; 