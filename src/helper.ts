export function toUrl(...paths: Array<string>) {
  return paths
    .join('/')
    .replace(/\/+/g, '/')
    .replace(/^\//, '')
    .replace(/\/$/, '')
    .replace(/http:\//, 'http://')
    .replace(/https:\//, 'https://')
}
