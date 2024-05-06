import stringify from 'json-stable-stringify'

export const getKey = (method: string, params: unknown[] = []) =>
  `${method}(${params.map(param => stringify(param)).join(',')})`
