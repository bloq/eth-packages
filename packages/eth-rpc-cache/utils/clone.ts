// Won't work for functions or circular references
export const clone = <T extends object>(value: T) =>
  JSON.parse(JSON.stringify(value))
