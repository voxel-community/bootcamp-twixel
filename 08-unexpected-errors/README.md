## Unexpected errors

I'm sorry, but there's no way you'll be able to avoid errors at some point. Servers fall over, co-workers use `// @ts-ignore`, and so on. So we need to just embrace the possibility of unexpected errors and deal with them.

Luckily, error handling in Remix is stellar. You may have used React's [Error Boundary feature](https://reactjs.org/docs/error-boundaries.html#gatsby-focus-wrapper). With Remix, your route modules can export an [`ErrorBoundary` component](../api/conventions#errorboundary) and it will be used. But it's even cooler because it works on the server too! Not only that, but it'll handle errors in `loader`s and `action`s too! Wowza! So let's get to it!

We're going to add four Error Boundaries in our app. One in each of the child routes in `app/routes/jokes/*` in case there's an error reading or processing stuff with the jokes, and one in `app/root.tsx` to handle errors for everything else.

<docs-info>The `app/root.tsx` ErrorBoundary is a bit more complicated</docs-info>

Remember that the `app/root.tsx` module is responsible for rendering our `<html>` element. When the `ErrorBoundary` is rendered, it's rendered _in place_ of the default export. That means the `app/root.tsx` module should render the `<html>` element along with the `<Link />` elements, etc.

💿 Add a simple ErrorBoundary to each of those files.

<details>

<summary>app/root.tsx</summary>

```tsx filename=app/root.tsx lines=[57-67]
import type { LinksFunction } from "remix";
import { Links, LiveReload, Outlet } from "remix";

import globalStylesUrl from "./styles/global.css";
import globalMediumStylesUrl from "./styles/global-medium.css";
import globalLargeStylesUrl from "./styles/global-large.css";

export const links: LinksFunction = () => {
  return [
    {
      rel: "stylesheet",
      href: globalStylesUrl,
    },
    {
      rel: "stylesheet",
      href: globalMediumStylesUrl,
      media: "print, (min-width: 640px)",
    },
    {
      rel: "stylesheet",
      href: globalLargeStylesUrl,
      media: "screen and (min-width: 1024px)",
    },
  ];
};

function Document({
  children,
  title = `Remix: So great, it's funny!`,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>{title}</title>
        <Links />
      </head>
      <body>
        {children}
        <LiveReload />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <Document>
      <Outlet />
    </Document>
  );
}

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <Document title="Uh-oh!">
      <div className="error-container">
        <h1>App Error</h1>
        <pre>{error.message}</pre>
      </div>
    </Document>
  );
}
```

</details>

<details>

<summary>app/routes/jokes/$jokeId.tsx</summary>

```tsx filename=app/routes/jokes/$jokeId.tsx nocopy
// ...

import { Link, useLoaderData, useParams } from "remix";

// ...

export function ErrorBoundary() {
  const { jokeId } = useParams();
  return (
    <div className="error-container">{`There was an error loading joke by the id ${jokeId}. Sorry.`}</div>
  );
}
```

</details>

<details>

<summary>app/routes/jokes/new.tsx</summary>

```tsx filename=app/routes/jokes/new.tsx nocopy
// ...

export function ErrorBoundary() {
  return (
    <div className="error-container">
      Something unexpected went wrong. Sorry about that.
    </div>
  );
}
```

</details>

<details>

<summary>app/routes/jokes/index.tsx</summary>

```tsx filename=app/routes/jokes/index.tsx nocopy
// ...

export function ErrorBoundary() {
  return (
    <div className="error-container">
      I did a whoopsies.
    </div>
  );
}
```

</details>

Ok great, with those in place, let's check what happens when there's an error. Go ahead and just add this to the default component, loader, or action of each of the routes. Here's what I get:

![App error](/jokes-tutorial/img/app-level-error.png)

![Joke Page Error](/jokes-tutorial/img/joke-id-error.png)

![Joke Index Page Error](/jokes-tutorial/img/jokes-index-error.png)

![New Joke Page Error](/jokes-tutorial/img/new-joke-error.png)

What I love about this is that in the case of the children routes, the only unusable part of the app is the part that actually broke. The rest of the app is completely interactive. There's another point for the user's experience!