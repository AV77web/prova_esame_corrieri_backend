const isProduction = process.env.NODE_ENV === 'production';

const FRONTEND_URL = isProduction
    ? "https://prova-esame-corrieriri-frontend.vercel.app"
    : "http://localhost:5173";

module.exports = {
    FRONTEND_URL
};