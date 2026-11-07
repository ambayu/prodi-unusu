/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ONE_UNUSU_URL?: string;
  readonly VITE_SSO_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
