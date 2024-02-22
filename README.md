# Aninix Figma Binding

A small utility package that helps you easily convert any Figma nodes to Aninix snapshots.

‼️ This is an experimental repository, so if you have any questions, feel free to open a new issue. We will be happy to answer and help.

## Installation

```bash
npm i -D @aninix-inc/figma-binding
# or
bun add -D @aninix-inc/figma-binding
# or
yarn add -D @aninix-inc/figma-binding
# or
pnpm add -D @aninix-inc/figma-binding
```

## Usage Example

A quick example of how to get the necessary data from a node and pass it to the server for rendering.

```ts
// code.ts
import * as aninix from '@aninix-inc/figma-binding'

const token = 'put your aninix token here'

// Get current selected node inside of the figma
const node = figma.currentPage.selection[0]

// Returns AninixSnapshot object which can be send to our API
const snapshot = aninix.bind(node).getSnapshot()

// This API endpoint does not work at the moment and will be available as soon as we have a new API release.
// Probably in March 2024.
fetch('https://apipi.aninix.com/renders', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
        // This tells Aninix to use existing project as a base for rendering
        projectId: snapshot.id,
        // And this tells to use snapshot as override.
        // Thus latest design would be used
        snapshot,
    }),
})
    .then(console.log)
    .catch(console.error)
```

Unfortunately, it is not safe to store tokens in the Figma plugin code. If an attacker gets access to this token, he can create a large number of rendering jobs. Therefore, we recommend using `proxy` and hosting the solution on your backend. This way, security and full access control will be in your hands.

> TBD proxy solution

## How Aninix Stores project information on the Figma nodes

Aninix works with [shared plugin data](https://www.figma.com/plugin-docs/api/node-properties/#getsharedplugindata) in Figma API to store public data such as: `project id`

This way your plugin can interact with the data from Aninix.

This data can be accessed by any plugin. So use carefully, if you delete the data, the link will be lost and you will have to create it again. For example, **DO NOT** call: `setSharedPluginData(ANINIX_WORKSPACE_KEY, ANINIX_PROJECT_KEY, '')`.

## More info

> TBD links to our public API docs

## Contribution

> TBD doc

## TODO

-   [ ] add tests with Figma mocks
