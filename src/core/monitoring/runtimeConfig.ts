import { Type, type Static } from '@sinclair/typebox'

export const MonitoringRuntimeConfigSchema = Type.Object({
  dsn: Type.String({ minLength: 1 }),
  environment: Type.String({ minLength: 1, maxLength: 80 }),
  release: Type.Optional(Type.String({ minLength: 1, maxLength: 160 })),
})

export type MonitoringRuntimeConfig = Static<typeof MonitoringRuntimeConfigSchema>
