import { createBackendProxyHandlers } from '@yiwallet/auth/backend-proxy'

export const { GET, POST, PUT, PATCH, DELETE } = createBackendProxyHandlers(process.env.API_URL!)
