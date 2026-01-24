/// <reference types="vite/client" />

// Vite supports importing asset URLs via `?url`.
declare module "*?url" {
  const src: string;
  export default src;
}
