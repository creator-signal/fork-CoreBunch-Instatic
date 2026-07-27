# Plain Text component

`base.plain-text` is the first focused end-to-end reference for the governed
Component Library authoring model.

---

## TL;DR

- Authors insert **Plain Text** from **Add to canvas → Components → Typography**.
- The persisted node is `base.text` with
  `catalogueInstance.entryId = "base.plain-text"`.
- Component Properties exposes only **Text** and **Semantic element**.
- Double-click edits the same text on the canvas; Components Properties edits
  the governed fields.
- Literal markup is escaped. Authored newlines become `<br>` in both canvas and
  published output.
- Visual typography belongs to classes, independently of the semantic element.
- The optional `integrations/component-showcase/` starter installs six
  representative pages.

## Author properties

| Field | Control | What it does |
|---|---|---|
| `text` | Text area | Stores literal authored copy. HTML is not interpreted; hard newlines publish as line breaks. |
| `tag` | Select | Chooses the semantic HTML element. It changes document meaning, not the typography design. |

The paragraph preset stores `tag: "p"` and is stamped as
`catalogueInstance.presetId = "paragraph"`. Structural authors can inspect
safe HTML attributes and implementation details in HTML view; those are not
part of the component-only contract.

The generated catalogue reference at
[Component Library specification](component-library-specification.md#plain-text)
is the executable field specification and must remain in sync with the entry
definition.

## Sample pages

The optional starter contains:

| Route | Acceptance focus |
|---|---|
| `/` | Catalogue identity, insertion and complete workflow overview |
| `/samples/properties` | Text and Semantic element controls |
| `/samples/semantics` | Paragraph, small, strong, emphasis, span, div, figure caption and bare text |
| `/samples/composition` | Independently selectable text inside layout containers |
| `/samples/content-safety` | Escaping, special characters and hard line breaks |
| `/samples/accessibility` | Reading order, plain language and semantic guidance |

Every non-body node in the starter has valid Component Library metadata. The
layout wrappers use governed Section or Container entries, while every visible
copy sample uses Plain Text. This prevents the Components projection from
falling back to **Component Block**.

## Isolated Docker acceptance

The Docker image contains the starter at
`/app/starter-plugins/component-showcase.plugin.zip`. Bootstrap only a clean
Compose project because an existing site is deliberately never reset.

Set a unique project name and use `HOST_PORT=0`; Docker reserves an available
ephemeral host port atomically:

```powershell
$showcaseProject = "instatic-text-$([guid]::NewGuid().ToString('N').Substring(0, 8))"
$env:HOST_PORT = "0"
$env:INSTATIC_IMAGE = "instatic:text-showcase"
$env:INSTATIC_BOOTSTRAP_SITE_NAME = "Plain Text Showcase"
$env:INSTATIC_BOOTSTRAP_OWNER_EMAIL = "owner@example.test"
$env:INSTATIC_BOOTSTRAP_OWNER_PASSWORD = "<choose-a-local-test-password>"
$env:INSTATIC_BOOTSTRAP_PLUGIN_PACKAGE = "/app/starter-plugins/component-showcase.plugin.zip"

docker compose -p $showcaseProject -f compose.prod.yml -f compose.build.yml up -d --build
docker compose -p $showcaseProject -f compose.prod.yml port app 3001
```

Open the returned `127.0.0.1:<port>` address. Sign in, open the Site workspace,
switch Layers to Components, select a text sample and edit both properties.
Then add a new Plain Text item from **Add to canvas → Components → Typography**,
save and publish it.

Remove the isolated project and its disposable volumes after testing:

```powershell
docker compose -p $showcaseProject -f compose.prod.yml -f compose.build.yml down -v
```

## Gates

`src/__tests__/plugins/componentShowcasePack.test.ts` checks routes, valid page
trees, governed metadata, semantic samples and class references.
`src/__tests__/panels/componentPropertiesView.test.tsx` checks that both Plain
Text fields mutate the backing node. Module and publisher tests continue to
cover escaping, hard line breaks, HTML attributes and canvas/publish parity.

## Related

- [Component Library](component-library.md)
- [Component Library specification](component-library-specification.md)
- [Modules](modules.md)
- [Publisher](publisher.md)
