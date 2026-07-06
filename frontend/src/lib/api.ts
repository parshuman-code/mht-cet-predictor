const PRODUCTION_API_URL = "https://mht-cet-predictor-f8dl.onrender.com";
const LOCAL_API_PORT = "8001";

export function getBackendBaseUrl() {
  if (typeof window === "undefined") {
    return process.env.BACKEND_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || PRODUCTION_API_URL;
  }

  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  if (isLocalHostname(window.location.hostname)) {
    return "/api/backend";
  }

  return PRODUCTION_API_URL;
}

export function getLocalBackendBaseUrl() {
  return process.env.BACKEND_API_BASE_URL || `http://127.0.0.1:${LOCAL_API_PORT}`;
}

function isLocalHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}
