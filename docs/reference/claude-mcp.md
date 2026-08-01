# Connect Claude to Instatic with MCP

This guide connects Claude Code or a Claude custom connector to an Instatic site through the Model Context Protocol (MCP).

Instatic exposes a capability-scoped MCP server at `/_instatic/mcp`. Claude can read content without an editor, relay editing tools to the signed-in user's open Site or Content workspace, and publish only through the explicit `site_publish` tool.

---

## TL;DR

- Use the MCP endpoint, not the website root: `https://<your-host>/_instatic/mcp`.
- For Creator Signal, use `https://creatorsignal.me/_instatic/mcp`.
- Prefer OAuth for a deployed HTTPS site. Creator Signal authenticates the Instatic consent screen through Zitadel.
- Run `claude mcp add --transport http instatic <endpoint>`, then `claude mcp login instatic`.
- Grant the smallest capability set needed. Publishing requires both write access and `pages.publish`.
- Keep the matching Instatic Site or Content workspace open while Claude performs visual-editor mutations.
- Draft writes do not publish. Ask Claude to call `site_publish` only after reviewing the result.

## Prerequisites

Before connecting:

1. Confirm the Instatic site is reachable over HTTPS.
2. Sign in to `/admin` with an account that can manage AI connections.
3. Install Claude Code 2.1.186 or newer so the `mcp login` and `mcp logout` commands are available.
4. Decide whether Claude needs read-only, editing, or publishing access.

The Instatic account must hold `ai.providers.manage` to approve or create an MCP connection. The consent screen only offers capabilities held by that account. The capability checks are implemented in `server/ai/mcp/handlers/oauthAuthorization.ts` and `server/ai/mcp/handlers/management.ts`.

Creator Signal configures Instatic with Zitadel authentication. Zitadel authenticates the author; Instatic then issues a resource-bound MCP grant to Claude. Claude does not receive a Zitadel access token.

## Connect Claude Code with OAuth

OAuth avoids copying an Instatic token into the Claude configuration.

### 1. Add the server

For Creator Signal:

```sh
claude mcp add --transport http instatic https://creatorsignal.me/_instatic/mcp
```

For another Instatic deployment:

```sh
claude mcp add --transport http instatic https://<your-host>/_instatic/mcp
```

The default Claude Code scope is local to the current project. Add `--scope user` when the connection must be available in every project:

```sh
claude mcp add --transport http --scope user instatic https://creatorsignal.me/_instatic/mcp
```

### 2. Authenticate

Start the OAuth flow from the terminal:

```sh
claude mcp login instatic
```

If that command is unavailable, start an interactive Claude Code session, run `/mcp`, select `instatic`, and choose the authentication action.

Claude opens the Instatic authorization page. On Creator Signal:

1. Sign in through Zitadel.
2. Confirm that the client name and loopback callback belong to the Claude session you started.
3. Select the required capabilities.
4. Approve the connection and complete step-up authentication when prompted.

Instatic supports OAuth discovery, dynamic client registration, S256 PKCE, and Claude's HTTP loopback callback. The endpoint paths are defined in `server/ai/mcp/paths.ts`; callback validation is in `server/ai/mcp/oauth/protocol.ts`.

### 3. Verify the connection

```sh
claude mcp get instatic
claude mcp list
```

Inside Claude Code, `/mcp` must show `instatic` as connected. A first safe prompt is:

```text
Use Instatic to list the published pages I can access. Do not change or publish anything.
```

## Choose capabilities

The picker in **AI → MCP connections** groups the available grants. Its source of truth is `src/admin/pages/ai/tabs/mcpCapabilities.ts`.

| Task | Typical capabilities |
|---|---|
| Inspect site pages and content | `site.read` and the required content/data read capabilities |
| Edit site structure or page content | `ai.tools.write`, `site.structure.edit`, `site.content.edit`, and `pages.edit` as required |
| Edit site styling | `ai.tools.write` and `site.style.edit` |
| List governed Component Library entries | `site.read` |
| Insert or configure a governed Component Library entry | `ai.tools.write` and `site.components.edit` |
| Edit content entries | `ai.tools.write` plus the applicable `content.create` or `content.edit.*` capability |
| Publish the public site | `ai.tools.write` and `pages.publish` |

Start read-only and reconnect with a wider grant only when the workflow needs it. Instatic filters the MCP tool catalog before Claude sees it through `server/ai/mcp/registry.ts`.

### Use governed Component Library entries

1. Call `site_list_component_library` with an optional search/category filter.
2. Choose a returned entry ID and, if needed, a returned preset or variant ID.
3. Call `site_insert_component` with the entry ID and a real parent node ID from
   the current document.
4. Configure the instance with `site_update_component_field` for declared
   fields and `site_apply_component_option` for registered presets or variants.

The insertion uses the same registry, placement checks and backing
implementation as the Site editor. Catalogue identity/version, plugin source,
slots, accessibility contract and capability/provider metadata remain attached
to the authored instance. Unknown fields/options and disallowed parents are
rejected. Registered preset and variant values are resolved inside Instatic and
are not supplied by Claude.

Do not recreate a catalogue component with `site_insert_html`; that tool is for
freeform structure and requires `site.structure.edit`. Component edits remain a
draft until an explicit `site_publish` call is made with `pages.publish`.

## Edit and publish safely

Headless read tools work without the Instatic editor open. Visual-editor mutations use the live browser bridge in `server/ai/mcp/editorBridge.ts` and require the connection owner's matching workspace:

- Open **Site** in Instatic for page-tree, HTML, CSS, design-token, or site-structure edits.
- Open **Content** for content-entry edits.
- Keep the workspace open until Claude finishes the edit sequence.

A safe authoring sequence is:

1. Ask Claude to inspect the current page or entry.
2. Ask for the required changes and explicitly say to keep them as a draft.
3. Review the draft in Instatic.
4. Ask Claude to publish only after approval.

Example:

```text
Open the Instatic /features page, update the hero heading, and keep the change as a draft.
Do not publish.
```

After review:

```text
Publish the saved Instatic site draft now. Call site_publish once.
```

`site_publish` runs the canonical full-site publisher and atomically swaps the public static slot. Its implementation and capability requirement are in `server/ai/mcp/tools/publishTool.ts`.

## Connect with a personal access token

Use a personal access token for local development or when OAuth is unavailable.

1. Sign in to Instatic.
2. Open **AI → MCP connections**.
3. Select **Personal token**, then **Create access token**.
4. Name the client, set an expiry, and select the minimum capabilities.
5. Copy the token immediately. Instatic stores only its hash.

For the Creator Signal local stack:

```sh
claude mcp add --transport http instatic-local http://localhost:4330/_instatic/mcp --header "Authorization: Bearer imcp_pat_…"
```

For a deployed site:

```sh
claude mcp add --transport http instatic https://<your-host>/_instatic/mcp --header "Authorization: Bearer imcp_pat_…"
```

Do not commit a plaintext token to `.mcp.json`. Claude Code supports environment-variable expansion in HTTP headers:

```json
{
  "mcpServers": {
    "instatic": {
      "type": "http",
      "url": "https://creatorsignal.me/_instatic/mcp",
      "headers": {
        "Authorization": "Bearer ${INSTATIC_MCP_TOKEN}"
      }
    }
  }
}
```

Set `INSTATIC_MCP_TOKEN` in the environment before starting Claude Code. Give each device or automation client a separate token so it can be revoked independently.

## Claude custom connector

For Claude's hosted custom-connector UI:

1. Open Instatic **AI → MCP connections → Hosted OAuth**.
2. Copy the **Remote MCP URL**.
3. In Claude, add a custom connector and paste that URL.
4. Leave OAuth Client ID and OAuth Client Secret empty.
5. Choose **Connect**, sign in to Instatic, select capabilities, and approve.

Hosted connectors cannot reach `localhost`, private network addresses, or HTTP-only deployments.

## Disconnect or revoke access

Clear Claude Code's locally stored OAuth credentials:

```sh
claude mcp logout instatic
```

Remove the server configuration:

```sh
claude mcp remove instatic
```

To invalidate the server-side grant or personal token, open Instatic **AI → MCP connections**, select the authorized connection, and revoke it. Removing the Claude configuration alone does not revoke the Instatic grant.

## Troubleshooting

| Symptom | Check |
|---|---|
| Claude receives HTML or a 404 | Use `/_instatic/mcp`; the website root is not the MCP endpoint. |
| Endpoint returns 401 before setup | This is the expected authentication challenge. Complete OAuth or provide a valid personal token. |
| Endpoint returns 503 | The Instatic deployment, edge route, or production cutover is not available. |
| `/mcp` says authentication is required | Run `claude mcp login instatic` or complete authentication from `/mcp`. |
| Zitadel login loops or returns to the wrong host | Check Instatic's configured public origin and the exact Zitadel redirect URI. |
| OAuth reports an untrusted or invalid callback | Start the flow from Claude Code and approve only the loopback callback shown for that session. |
| Claude connects but shows fewer tools than expected | Reconnect with the required Instatic capabilities; tools are filtered by the grant. |
| An edit tool says the workspace is unavailable | Open the matching Site or Content workspace in Instatic using the account that approved the connection. |
| Claude can edit but cannot publish | Grant both `ai.tools.write` and `pages.publish`. |
| A PAT connection fails and never offers OAuth | Remove the invalid `Authorization` header or replace the expired/revoked token. |

## Related

- `docs/features/mcp-connectors.md` — MCP protocol, authorization, tools, and data model.
- `docs/features/auth-and-access.md` — Instatic sessions, capabilities, MFA, and step-up authentication.
- `server/ai/mcp/paths.ts` — canonical MCP and OAuth endpoint paths.
- `server/ai/mcp/oauth/protocol.ts` — OAuth resource, redirect, scope, and PKCE rules.
- `server/ai/mcp/editorBridge.ts` — live Site and Content workspace relay.
- `server/ai/mcp/tools/publishTool.ts` — explicit full-site publish tool.
- `server/ai/mcp/e2e.test.ts` — Claude Code-style initialize, list, and tool-call gate.
- [Claude Code MCP documentation](https://code.claude.com/docs/en/mcp) — current Claude CLI, scope, OAuth, and configuration reference.
