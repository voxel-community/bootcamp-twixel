## JavaScript...

Maybe we should actually include JavaScript on our JavaScript app. 😂

Seriously, pull up your network tab and navigate to our app.

![Network tab indicating no JavaScript is loaded](/jokes-tutorial/img/no-javascript.png)

Did you notice that our app isn't loading any JavaScript before now? 😆 This actually is pretty significant. Our entire app can work without JavaScript on the page at all. This is because Remix leverages the platform so well for us.

Why does it matter that our app works without JavaScript? Is it because we're worried about the 0.002% of users who run around with JS disabled? Not really. It's because not everyone's connected to your app on a lightning-fast connection and sometimes JavaScript takes some time to load or fails to load at all. Making your app functional without JavaScript means that when that happens, your app _still works_ for your users even before the JavaScript finishes loading.

Another point for user experience!

There are reasons to include JavaScript on the page. For example, some common UI experiences can't be accessible without JavaScript (focus management in particular is not great when you have full-page reloads all over the place). And we can make an even nicer user experience with optimistic UI (coming soon) when we have JavaScript on the page. But we thought it'd be cool to show you how far you can get with Remix without JavaScript for your users on poor network connections. 💪

Ok, so let's load JavaScript on this page now 😆

💿 Use Remix's [`<Scripts />` component](../api/remix#meta-links-scripts) component to load all the JavaScript files in `app/root.tsx`.

<details>

<summary>app/root.tsx</summary>

```tsx filename=app/root.tsx lines=[8,65,97]
import type { LinksFunction, MetaFunction } from "remix";
import {
  Links,
  LiveReload,
  Outlet,
  useCatch,
  Meta,
  Scripts,
} from "remix";

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

export const meta: MetaFunction = () => {
  const description = `Learn Remix and laugh at the same time!`;
  return {
    description,
    keywords: "Remix,jokes",
    "twitter:image": "https://remix-jokes.lol/social.png",
    "twitter:card": "summary_large_image",
    "twitter:creator": "@remix_run",
    "twitter:site": "@remix_run",
    "twitter:title": "Remix Jokes",
    "twitter:description": description,
  };
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
        <Meta />
        <title>{title}</title>
        <Links />
      </head>
      <body>
        {children}
        <Scripts />
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

export function CatchBoundary() {
  const caught = useCatch();

  return (
    <Document
      title={`${caught.status} ${caught.statusText}`}
    >
      <div className="error-container">
        <h1>
          {caught.status} {caught.statusText}
        </h1>
      </div>
    </Document>
  );
}

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);

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

![Network tab showing JavaScript loaded](/jokes-tutorial/img/yes-javascript.png)

💿 Another thing we can do now is you can accept the `error` prop in all your `ErrorBoundary` components and `console.error(error);` and you'll get even server-side errors logged in the browser's console. 🤯

![Browser console showing the log of a server-side error](/jokes-tutorial/img/server-side-error-in-browser.png)

### Forms

Remix has its own [`<Form />`](../api/remix#form) component. When JavaScript is not yet loaded, it works the same way as a regular form, but when JavaScript is enabled, it's "progressively enhanced" to make a `fetch` request instead so we don't do a full-page reload.

💿 Find all `<form />` elements and change them to the Remix `<Form />` component.

### Prefetching

If a user focuses or mouses-over a link, it's likely they want to go there. So we can prefetch the page that they're going to. And this is all it takes to enable that for a specific link:

```
<Link prefetch="intent" to="somewhere/neat">Somewhere Neat</Link>
```

💿 Add `prefetch="intent"` to the list of Joke links in `app/routes/jokes.tsx`.