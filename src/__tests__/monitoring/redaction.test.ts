import { describe, expect, it } from 'bun:test'
import {
  redactMonitoringEvent,
  safeMonitoringRoute,
} from '@core/monitoring'

describe('monitoring redaction', () => {
  it('reduces routes to an approved structural vocabulary', () => {
    expect(safeMonitoringRoute('https://cms.example.com/admin/site/secret-page?token=secret'))
      .toBe('/admin/site/:id')
  })

  it('removes identity, request secrets, arbitrary messages, and unknown tags', () => {
    const event = redactMonitoringEvent({
      event_id: 'abc123',
      message: 'owner@example.com opened customer/acme',
      user: { email: 'owner@example.com', ip_address: '127.0.0.1' },
      request: {
        method: 'POST',
        url: 'https://cms.example.com/admin/api/cms/plugins/private-id?token=secret',
        headers: { authorization: 'Bearer secret' },
        cookies: { session: 'secret' },
        data: { password: 'secret' },
      },
      tags: {
        source: 'server-request',
        route: '/admin/api/cms/plugins/private-id',
        workspace: 'secret-workspace',
      },
      exception: {
        values: [{
          type: 'Error',
          value: 'database password leaked',
          stacktrace: {
            frames: [{
              filename: 'https://cms.example.com/assets/index.js?token=secret',
              function: 'handleRequest',
              lineno: 10,
            }],
          },
        }],
      },
    })

    expect(event).toEqual({
      event_id: 'abc123',
      request: {
        method: 'POST',
        url: '/admin/api/cms/plugins/:id',
      },
      tags: {
        source: 'server-request',
        route: '/admin/api/cms/plugins/:id',
      },
      exception: {
        values: [{
          type: 'Error',
          value: 'Instatic operation failed',
          stacktrace: {
            frames: [{
              filename: '/assets/index.js',
              function: 'handleRequest',
              lineno: 10,
            }],
          },
        }],
      },
    })
  })
})
