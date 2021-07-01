export const reload = () => window.location.reload();

export const frontendPath = (p: string) => {
  const path = p.startsWith("/") ? p.slice(1) : p;
  return process.env.PUBLIC_URL
    ? `${process.env.PUBLIC_URL}/${path}`
    : `/${path}`;
};

export const navigate = (p: string) => {
  window.location.href = p;
};

export const isLocalhost = window.location.hostname === "localhost";
