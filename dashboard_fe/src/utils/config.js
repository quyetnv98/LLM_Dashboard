import jsyaml from 'js-yaml'

// Đối tượng chứa các URL đã được build sẵn
export const API_ENDPOINTS = {
    GET_DATA_COUNT: '',
    SEARCH: '',
    FETCH_QUESTION: '',
    TAGGING: '',
    DELETING: '',
};

export function buildApiUrl(beUrl = '', bePort = '', path = '') {
    if (!path) return '';
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (!beUrl || !bePort)
        return `${window.location.origin}${normalizedPath}`;
    else return `${beUrl}:${bePort}${normalizedPath}`;

}
// fetch config.yaml
export async function initConfig() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Chỉ đợi tối đa 5 giây

    try {
        const res = await fetch('/config.yaml', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            const text = await res.text();
            const env = jsyaml.load(text);
            window.__ENV__ = env;

            // Tự động build toàn bộ Endpoint khi khởi tạo
            if (env.ENDPOINT) {
                const { BE_URL, BE_PORT, ENDPOINT } = env;
                Object.keys(ENDPOINT).forEach(key => {
                    API_ENDPOINTS[key] = buildApiUrl(BE_URL, BE_PORT, ENDPOINT[key]);
                });
            }
            console.log(API_ENDPOINTS);
        }
    } catch (e) {
        console.warn("Failed to load config.yaml", e);
        window.__ENV__ = {};
    }
};