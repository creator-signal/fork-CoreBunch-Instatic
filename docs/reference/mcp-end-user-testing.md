# Test an Instatic MCP connection as an end user

This guide verifies an Instatic MCP connection from any compatible client without publishing or changing shared content by default.

---

## TL;DR

- Connect to `https://<your-host>/_instatic/mcp`, never the website root.
- For administrator-managed editing in ChatGPT, create a custom MCP app with **OAuth** and dynamic client registration; do not paste an Instatic personal token into ChatGPT.
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

## Connect Instatic to ChatGPT as a workspace administrator

This path lets an Instatic administrator inspect and update CMS drafts from a ChatGPT conversation. It uses Instatic's hosted OAuth flow, so ChatGPT never receives an Instatic password or personal access token.

### Prerequisites and boundaries

- Use ChatGPT on the web in a workspace where custom MCP apps and write actions are available. For an administrator-managed shared app with write access, use ChatGPT Business or Enterprise/Edu and sign in as a workspace Admin or Owner. OpenAI is rolling out this capability, so availability and labels may differ by workspace.
- Deploy Instatic at a stable HTTPS origin that ChatGPT can reach. ChatGPT cannot connect directly to `localhost`, a private LAN hostname or an HTTP-only endpoint. Private-network tunnelling is a separate infrastructure decision and is not covered by this test.
- Sign in to Instatic as the account that will own the connection. It needs `ai.providers.manage`, the target's read/edit capabilities and a fresh step-up authentication window.
- Use a disposable page in Local or an explicitly designated test environment for the first write. Do not begin with retained Production content.
- Keep publication out of the initial grant. Instatic draft edits and publishing are separate actions.

OpenAI's current setup and safety guidance is maintained in [ChatGPT Developer mode](https://developers.openai.com/api/docs/guides/developer-mode) and [Developer mode and MCP apps in ChatGPT](https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt). Check those pages if the ChatGPT labels below have moved.

### 1. Prepare Instatic

1. In Instatic, open **AI → MCP connections** and copy the Remote MCP URL. It must be exactly:

   ```text
   https://<your-host>/_instatic/mcp
   ```

2. Open **Site** in another browser tab, select the disposable page and leave the tab open. ChatGPT can list documents without this tab, but document reads, Component Library discovery and page mutations use the signed-in owner's live Site workspace through `server/ai/mcp/editorBridge.ts`.
3. Do not create a personal access token for ChatGPT. Instatic supports the OAuth discovery, dynamic client registration, PKCE and refresh-token flow ChatGPT needs through `server/ai/mcp/oauth/handler.ts` and `server/ai/mcp/oauth/protocol.ts`.

### 2. Create a private ChatGPT app

1. Sign in to ChatGPT on the web as a workspace Admin or Owner.
2. Enable **Developer mode** for your account. Depending on the current ChatGPT rollout, this is under **Settings → Apps → Advanced settings**, **Settings → Security and login**, or offered while creating a custom app.
3. Open **Workspace settings → Apps → Create**. If your workspace instead shows the Plugins directory, use its **+** action to create a developer-mode app from a remote MCP server.
4. Name the app for the exact environment, for example `Instatic DEV`. Do not give a Production connection a generic name.
5. Paste the Remote MCP URL from Instatic as the server endpoint.
6. Choose **OAuth**. If ChatGPT asks for the client-registration method, choose **Dynamic Client Registration (DCR)**. Leave static OAuth Client ID and Client Secret fields empty.
7. Choose **Scan tools** or **Connect**. ChatGPT should discover Instatic's OAuth metadata and redirect the browser to Instatic.
8. On the Instatic consent screen, verify:
   - the Instatic origin and environment;
   - the ChatGPT client name;
   - the exact callback URI;
   - that you initiated this request.
9. For a draft component-editing test, grant only:
   - `site.read`;
   - `ai.tools.write`;
   - `site.components.edit`;
   - `site.structure.edit` only if the test will move or remove nodes.
10. Do not grant `pages.publish`. Approve the connection after completing Instatic's step-up prompt, return to ChatGPT, wait for the tool scan and create the app as a private draft.

If tool scanning completes before the OAuth consent or shows no Instatic tools, reconnect the app and run **Refresh tools** after authorization.

### 3. Apply ChatGPT safety controls

In ChatGPT's app details, review every discovered action before testing:

- Keep the app private while validating it.
- Restrict user access to the intended administrators or administrator group.
- Enable only the Instatic actions required for the journey. A minimal component-editing set is `site_list_documents`, `site_read_document`, `site_list_component_library`, `site_update_component_field` and, only when required, `site_move_node` or `site_delete_node`.
- Keep confirmation enabled for write actions. Inspect the expanded JSON input before approving a change.
- Disable `site_publish` in ChatGPT action controls. It should also be absent because `pages.publish` was not granted in Instatic.
- Do not treat ChatGPT controls as a replacement for Instatic permissions. Both layers must allow an action.

Enterprise/Edu administrators can use role-based access and per-action controls. ChatGPT Business controls may differ, and a published custom app may need to be recreated and republished when its tool definitions change. In all plans, re-scan or refresh tools after the Instatic grant or MCP catalogue changes; ChatGPT does not automatically accept new actions.

### 4. Test the private app from chat

Start a new ChatGPT conversation, select the private Instatic app for the message, and run the [read-only smoke test](#read-only-smoke-test) below. Be explicit about the server and forbid alternatives:

```text
Use only the Instatic app. Do not browse the public website and do not use any
other app. List the editable site documents and find the disposable page named
"MCP acceptance". Report what you find. Do not change or publish anything.
```

Then test one governed draft update while the matching Instatic Site tab remains open:

```text
Use only the Instatic app. On the disposable page "MCP acceptance", read the
current document and find its Section Intro component. Change only its heading
field from "MCP original heading" to "MCP ChatGPT acceptance <YYYY-MM-DD>".
Before changing it, show the exact document, node ID, field and new value. Do
not alter structure and do not call site_publish.
```

Review ChatGPT's proposed tool input, approve the write, then verify the new heading in Instatic's canvas and Components panel. Ask ChatGPT to read the document again and report the persisted field value.

Clean up with another explicit prompt:

```text
Use only the Instatic app. Restore the same Section Intro heading on the
"MCP acceptance" draft from "MCP ChatGPT acceptance <YYYY-MM-DD>" to
"MCP original heading". Change no other field or node and do not publish.
Read the document again and confirm the original value is restored.
```

Reload the Instatic page and verify the cleanup persisted. Do not rely only on ChatGPT's success message.

### 5. Make the app available to other administrators

Publishing the **ChatGPT app** makes the connector available to permitted workspace users; it does **not** publish the Instatic website. The Instatic website is published only by the separate `site_publish` MCP tool.

After the private test and cleanup pass:

1. In **Workspace settings → Apps → Drafts**, open the Instatic app and choose **Publish**.
2. Recheck action controls and keep `site_publish` disabled.
3. Restrict access to the intended administrator role or group.
4. Each user connects the app and completes Instatic OAuth as their own account. The effective tools are limited by that user's Instatic capabilities and the ChatGPT workspace controls.
5. Tell users to select or mention the Instatic app whenever a message needs fresh CMS data or an action. App selection may apply only to the current message.

An Instatic user who cannot approve MCP connections or edit the target cannot gain those permissions through ChatGPT. Do not share one administrator's OAuth connection or browser session with another user.

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

`site_list_documents` is server-resolved, but `site_list_component_library` reads the current plugin-backed catalogue through the live Site workspace. Keep the matching signed-in Site editor open for this combined smoke test. If only `site_list_documents` is called, the editor may remain closed.

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
| ChatGPT has no Create or Developer mode control | Confirm the current ChatGPT plan, workspace role and admin policy. The feature is still rolling out. |
| ChatGPT asks for OAuth Client ID or Secret | Select DCR and leave static credentials empty. Instatic registers ChatGPT as a public PKCE client. |
| ChatGPT lists stale or missing actions | Reconnect OAuth if needed, then use Refresh tools/actions and review the changes before enabling them. |
| ChatGPT cannot update the draft | Keep the matching Site or Content workspace open under the same Instatic user and verify both Instatic capabilities and ChatGPT action controls. |
| ChatGPT app was published but the website did not change | Publishing a ChatGPT app only distributes the connector. Instatic publication still requires the separately governed `site_publish` tool. |

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

- [ChatGPT Developer mode](https://developers.openai.com/api/docs/guides/developer-mode) — current OpenAI setup, authentication, tool review and confirmation guidance.
- [`claude-mcp.md`](claude-mcp.md) — Claude-specific setup commands and connector screens.
- [`../features/mcp-connectors.md`](../features/mcp-connectors.md) — protocol, authorization, tool registry, and browser bridge design.
- [`../features/auth-and-access.md`](../features/auth-and-access.md) — sessions, capabilities, MFA, and step-up authentication.
- `server/ai/mcp/registry.ts` — capability-filtered MCP tool catalogue.
- `server/ai/mcp/editorBridge.ts` — live Site and Content workspace relay.
- `server/ai/mcp/e2e.test.ts` — authenticated wire and capability-filtering coverage.
