let API_URL;

if (import.meta.env.VITE_API_URL) {
    API_URL = import.meta.env.VITE_API_URL;
} else {
    // If no ENV set:
    // In Production (Vercel), default to "" (relative path, same domain)
    // In Development, default to localhost:5000
    if (import.meta.env.PROD) {
        API_URL = '';
    } else {
        API_URL = 'http://localhost:5000';
    }
}

export default API_URL;
