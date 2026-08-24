# Test an Instatic MCP connection as an end user

This guide verifies an Instatic MCP connection from any compatible client without publishing or changing shared content by default.

---

## TL;DR

- Connect to `https://<your-host>/_instatic/mcp`, never the website root.
- Start with `site.read`; add write capabilities only for a disposable draft test.
- Keep the matching signed-in **Site** or **Content** workspace open for browser-relayed tools.
- Prove discovery, tool filtering, a read, a reversible draft edit, cleanup, and revocation.
- Do not call `site_publish` unless publication of that exact target was separately approved.
- Never paste a token into screenshots, chat transcripts, source control, or test evidence.

## Choose a safe target

Use a local or explicitly designated test installation with disposable content. Record the exact origin before connecting. Do not use a production site for the write and cleanup sections of this guide.

The canonical endpoint is:

```text
https://<your-host>/_instatic/mcp
```

An unauthenticated request should receive an authentication challenge. HTML or a `404` normally means the client was given the website root or the wrong path. A `503` means the deployment or route is unavailable; it is not an authentication failure.

## Connect with least privilege

In Instatic, open **AI → MCP connections**. Use one connection per client or device so it can be audited and revoked independently.

Choose one authentication mode:

1. **Hosted OAuth** — preferred for compatible clients and deployed HTTPS sites. Paste the Remote MCP URL into the client, start its connection flow, sign in to Instatic, verify the client name and callback, select capabilities, and approve.
2. **Personal token** — suitable for local development or clients that accept an `Authorization: Bearer …` header. Create the token after step-up authentication, copy it once into a protected environment variable or client secret store, and do not commit it.

Grant only the capabilities needed for the current stage:

| Test stage | Required capabilities |
|---|---|
| List pages and Component Library entries | `site.read` |
| Insert and update governed components | `site.read`, `ai.tools.write`, `site.components.edit` |
| Move or remove page-tree nodes during reversible cleanup | add `site.structure.edit` |
| Publish after separate approval | add `pages.publish` |

Instatic filters the visible tool list to the connection grant. A missing write or publish tool is expected when its capability was not granted.

## Read-only smoke test

Connect the client, then give it this instruction:

```text
Use only the connected Instatic MCP server. List the editable site documents and
search the Component Library for "Section Intro". Report the document titles,
the matching component ID and its declared fields. Do not change or publish anything.
```

The client should use `site_list_documents` and `site_list_component_library`. Confirm that:

- the response belongs to the intended Instatic origin;
- the expected documents and governed entry are returned;
- mutation tools are absent when the connection has only `site.read`;
- the connection's last-used time advances in **AI → MCP connections**.

This stage does not require the Site editor to remain open because both catalogues are resolved by the server.

## Reversible draft Component Library test

Run this only on a disposable page in a local or designated test installation. Reconnect with the component and structure capabilities in the table above.

1. Sign in to Instatic with the same account that approved the connection.
2. Open **Site**, select the disposable page, and keep that browser tab open.
3. Ask the client to inspect before changing anything:

```text
Use Instatic to open the disposable page named "MCP acceptance" and read its
current document. Find a valid parent or slot for a Section Intro. Do not publish.
```

4. Ask for one uniquely identifiable draft component:

```text
Insert the governed Component Library entry creator-signal.site.section-intro
into that valid parent or slot. Set its heading field to
"MCP draft acceptance 2026-08-24". Keep the result as a draft and return the
inserted node ID. Do not publish.
```

The client should use `site_insert_component` and `site_update_component_field`, not `site_insert_html` or arbitrary prop injection. Verify the component appears in the open Components panel and its heading appears on the canvas.

5. If the parent safely contains another disposable item, ask the client to move the new node with `site_move_node`, then read the document again and confirm its parent and index. Do not move retained content merely to complete this test.
6. Ask the client to remove the inserted node with `site_delete_node`, then read the document again and confirm the unique heading and node ID are gone.
7. Reload the Instatic page and confirm the cleanup persisted.

If a mutation reports that the workspace is unavailable, keep the matching signed-in Site workspace open. A Content mutation similarly requires the signed-in Content workspace. The browser bridge deliberately prevents a second headless page-tree writer from racing the live editor.

## Review and optional publication

Draft writes never publish by themselves. Review the canvas and Components tree before considering publication.

`site_publish` rebuilds and swaps the full public site. Test it only when all of the following are true:

- the exact target is approved for publication;
- the connection has `ai.tools.write` and `pages.publish`;
- the draft has been reviewed in Instatic;
- provider and public-side effects are understood;
- the instruction explicitly asks for one `site_publish` call.

Publication is outside the default test procedure. A successful draft test does not prove or authorize publishing.

## Revoke and prove denial

After testing:

1. Disconnect or log out from the MCP server in the client.
2. In Instatic, open **AI → MCP connections**, select the test connection, and revoke it.
3. Retry the read-only smoke test without reconnecting.
4. Confirm the old credential is denied and the connection no longer records successful use.
5. Remove the client configuration if it is no longer needed.

Removing a client-side configuration does not revoke the Instatic grant. Revoke server-side as well.

## Troubleshooting

| Symptom | What to verify |
|---|---|
| HTML or `404` | The URL ends exactly in `/_instatic/mcp`. |
| `401` before connecting | Complete OAuth or supply a current personal token. This is the expected unauthenticated response. |
| `503` | The Instatic service or edge route is unavailable. |
| Fewer tools than expected | Reconnect with the required capabilities; the catalog is grant-filtered. |
| Workspace unavailable | Open Site or Content in Instatic with the account that approved the connection. |
| Insufficient capability | Add only the named capability, reconnect, and repeat the affected step. |
| OAuth callback rejected | Restart from the client and approve only its exact registered callback. |
| Token is rejected without OAuth UI | Replace the expired/revoked token or remove the invalid authorization header. |
| Draft changed but public page did not | This is expected until an authorized `site_publish` call. |

## Evidence checklist

Record:

- date and tester;
- Instatic origin and environment classification;
- client name and connection label;
- authentication mode, without credential values;
- granted capabilities;
- documents and Component Library entry tested;
- tool names and pass/fail outcomes;
- inserted synthetic value and returned node ID;
- visual draft verification and persisted cleanup result;
- whether publication was skipped or separately authorized;
- connection last-used evidence and post-revocation denial.

Do not record tokens, authorization codes, cookies, private content, customer data, or screenshots that expose those values.

## Related

- [`claude-mcp.md`](claude-mcp.md) — Claude-specific setup commands and connector screens.
- [`../features/mcp-connectors.md`](../features/mcp-connectors.md) — protocol, authorization, tool registry, and browser bridge design.
- [`../features/auth-and-access.md`](../features/auth-and-access.md) — sessions, capabilities, MFA, and step-up authentication.
- `server/ai/mcp/registry.ts` — capability-filtered MCP tool catalogue.
- `server/ai/mcp/editorBridge.ts` — live Site and Content workspace relay.
- `server/ai/mcp/e2e.test.ts` — authenticated wire and capability-filtering coverage.
