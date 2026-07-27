# Provider Adapters

Provider adapters are the policy boundary between governed catalogue entries
and external embed, form-embed, map, hosted-media or CAPTCHA services.

`src/core/provider-adapters` owns the TypeBox metadata schema, definition
validation, registry, health and resolution policy. Component Library entries
refer only to namespaced adapter IDs through `requirements.providerAdapters`;
credentials and provider settings never enter catalogue definitions.

## Contract

Each adapter declares:

- a namespaced ID, semantic version and supported capability kinds;
- public and secret configuration fields;
- an HTTPS origin allow-list;
- a consent category;
- iframe sandbox, referrer and permissions policy when it returns an iframe;
- safe fallback text and a resolver that returns a typed render plan.

Installed adapters default to `unavailable` until the host marks them healthy.
Health maps directly to Component Library dependency health. A degraded
adapter may still resolve with a public message; an unavailable adapter cannot.

Resolution rejects unknown configuration, secret values stored on a component,
invalid field types, unsupported kinds, non-HTTPS URLs, URLs outside the
adapter allow-list, missing iframe policy and runtime plans that expose a
declared secret.

## Editor and consent boundary

`editorPreview()` is always inert. It returns provider identity, capability
kind, consent category and health, but never renders or requests provider
content. Renderers consume a validated plan and must delay non-essential
provider loading until the matching consent category is granted.

The registry is not a credential store. Secret configuration is resolved by
the host or adapter at execution time and must never be serialized into a page
node, catalogue entry, editor preview or public runtime plan.
