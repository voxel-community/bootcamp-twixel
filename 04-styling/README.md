## Styling (TODO use Tailwind)

> TODO Use Tailwind classes and explain how to update files created in previous chapter


From the beginning of styling on the web, to get CSS on the page, we've used `<link rel="stylesheet" href="/path-to-file.css" />`. This is how you style your Remix applications as well, but Remix makes it much easier than just throwing `link` tags all over the place. Remix brings the power of its Nested Routing support to CSS and allows you to associate `link`s to routes. When the route is active, the `link` is on the page and the CSS applies. When the route is not active (the user navigates away), the `link` tag is removed and the CSS no longer applies.

You do this by exporting a [`links`](../api/conventions#links) function in your route module. Let's get the homepage styled. You can put your CSS files anywhere you like within the `app` directory. We'll put ours in `app/styles/`.

We'll start off by just styling the home page (the index route `/`).

💿 Create `app/styles/index.css` and stick this CSS in it:

```css
body {
  color: hsl(0, 0%, 100%);
  background-image: radial-gradient(
    circle,
    rgba(152, 11, 238, 1) 0%,
    rgba(118, 15, 181, 1) 35%,
    rgba(58, 13, 85, 1) 100%
  );
}
```

💿 Now update `app/routes/index.tsx` to import that css file. Then add a `links` export (as described in [the documentation](../api/conventions#links)) to add that link to the page.

<details>

<summary>app/routes/index.tsx</summary>

```tsx filename=app/routes/index.tsx lines=[1, 3, 5-7]
import type { LinksFunction } from "remix";

import stylesUrl from "~/styles/index.css";

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export default function IndexRoute() {
  return <div>Hello Index Route</div>;
}
```

</details>

Now if you go to [`/`](http://localhost:3000) you may be a bit disappointed. Our beautiful styles aren't applied! Well, you may recall that in the `app/root.tsx` we're the ones rendering _everything_ about our app. From the `<html>` to the `</html>`. That means if something doesn't show up in there, it's not going to show up at all!

So we need some way to get the `link` exports from all active routes and add `<link />` tags for all of them. Luckily, Remix makes this easy for us by providing a convenience [`<Links />`](../api/remix#link) component.

💿 Go ahead and add the Remix `<Links />` component to `app/root.tsx` within the `<head>`.

<details>

<summary>app/root.tsx</summary>

```tsx filename=app/root.tsx lines=[1,9]
import { Links, LiveReload, Outlet } from "remix";

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>Remix: So great, it's funny!</title>
        <Links />
      </head>
      <body>
        <Outlet />
        <LiveReload />
      </body>
    </html>
  );
}
```

</details>

Great, now check [`/`](http://localhost:3000/) again and it should be nice and styled for you:

![The homepage with a purple gradient background and white text with the words "Hello Index Route"](/twixes-tutorial/img/homepage-styles.png)

Hooray! But I want to call out something important and exciting. You know how the CSS we wrote styles the `body` element? What would you expect to happen on the [`/twixes`](http://localhost:3000/twixes) route? Go ahead and check it out.

![The twixes page with no background gradient](/twixes-tutorial/img/twixes-no-styles.png)

🤯 What is this? Why aren't the CSS rules applied? Did the `body` get removed or something?! Nope. If you open the Elements tab of the dev tools you'll notice that the link tag isn't there at all!

<docs-info>

This means that you don't have to worry about unexpected CSS clashes when you're writing your CSS. You can write whatever you like and so long as you check each route your file is linked on you'll know that you haven't impacted other pages! 🔥

This also means your CSS files can be cached long-term and your CSS is naturally code-split. Performance FTW ⚡

</docs-info>

That's pretty much all there is to it for styling with the tutorial. The rest is just writing the CSS which you're welcome to do if you want, or simply copy the styles from below.

<details>

<summary>💿 Copy this to `app/styles/global.css`</summary>

```css filename=app/styles/global.css
@font-face {
  font-family: "baloo";
  src: url("/fonts/baloo/baloo.woff") format("woff");
  font-weight: normal;
  font-style: normal;
}

:root {
  --hs-links: 48 100%;
  --color-foreground: hsl(0, 0%, 100%);
  --color-background: hsl(278, 73%, 19%);
  --color-links: hsl(var(--hs-links) 50%);
  --color-links-hover: hsl(var(--hs-links) 45%);
  --color-border: hsl(277, 85%, 38%);
  --color-invalid: hsl(356, 100%, 71%);
  --gradient-background: radial-gradient(
    circle,
    rgba(152, 11, 238, 1) 0%,
    rgba(118, 15, 181, 1) 35%,
    rgba(58, 13, 85, 1) 100%
  );
  --font-body: -apple-system, "Segoe UI", Helvetica Neue, Helvetica,
    Roboto, Arial, sans-serif, system-ui, "Apple Color Emoji",
    "Segoe UI Emoji";
  --font-display: baloo, var(--font-body);
}

html {
  box-sizing: border-box;
}

*,
*::before,
*::after {
  box-sizing: inherit;
}

:-moz-focusring {
  outline: auto;
}

:focus {
  outline: var(--color-links) solid 2px;
  outline-offset: 2px;
}

html,
body {
  padding: 0;
  margin: 0;
  color: var(--color-foreground);
  background-color: var(--color-background);
}

[data-light] {
  --color-invalid: hsl(356, 70%, 39%);
  color: var(--color-background);
  background-color: var(--color-foreground);
}

body {
  font-family: var(--font-body);
  line-height: 1.5;
  background-repeat: no-repeat;
  min-height: 100vh;
  min-height: calc(100vh - env(safe-area-inset-bottom));
}

a {
  color: var(--color-links);
  text-decoration: none;
}

a:hover {
  color: var(--color-links-hover);
  text-decoration: underline;
}

hr {
  display: block;
  height: 1px;
  border: 0;
  background-color: var(--color-border);
  margin-top: 2rem;
  margin-bottom: 2rem;
}

h1,
h2,
h3,
h4,
h5,
h6 {
  font-family: var(--font-display);
  margin: 0;
}

h1 {
  font-size: 2.25rem;
  line-height: 2.5rem;
}

h2 {
  font-size: 1.5rem;
  line-height: 2rem;
}

h3 {
  font-size: 1.25rem;
  line-height: 1.75rem;
}

h4 {
  font-size: 1.125rem;
  line-height: 1.75rem;
}

h5,
h6 {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.container {
  --gutter: 16px;
  width: 1024px;
  max-width: calc(100% - var(--gutter) * 2);
  margin-right: auto;
  margin-left: auto;
}

/* buttons */

.button {
  --shadow-color: hsl(var(--hs-links) 30%);
  --shadow-size: 3px;
  -webkit-appearance: none;
  -moz-appearance: none;
  cursor: pointer;
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-links);
  color: var(--color-background);
  font-family: var(--font-display);
  font-weight: bold;
  line-height: 1;
  font-size: 1.125rem;
  margin: 0;
  padding: 0.625em 1em;
  border: 0;
  border-radius: 4px;
  box-shadow: 0 var(--shadow-size) 0 0 var(--shadow-color);
  outline-offset: 2px;
  transform: translateY(0);
  transition: background-color 50ms ease-out, box-shadow
      50ms ease-out,
    transform 100ms cubic-bezier(0.3, 0.6, 0.8, 1.25);
}

.button:hover {
  --raise: 1px;
  color: var(--color-background);
  text-decoration: none;
  box-shadow: 0 calc(var(--shadow-size) + var(--raise)) 0 0 var(
      --shadow-color
    );
  transform: translateY(calc(var(--raise) * -1));
}

.button:active {
  --press: 1px;
  box-shadow: 0 calc(var(--shadow-size) - var(--press)) 0 0 var(
      --shadow-color
    );
  transform: translateY(var(--press));
  background-color: var(--color-links-hover);
}

.button[disabled],
.button[aria-disabled="true"] {
  transform: translateY(0);
  pointer-events: none;
  opacity: 0.7;
}

.button:focus:not(:focus-visible) {
  outline: none;
}

/* forms */

form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

fieldset {
  margin: 0;
  padding: 0;
  border: 0;
}

legend {
  display: block;
  max-width: 100%;
  margin-bottom: 0.5rem;
  color: inherit;
  white-space: normal;
}

[type="text"],
[type="password"],
[type="date"],
[type="datetime"],
[type="datetime-local"],
[type="month"],
[type="week"],
[type="email"],
[type="number"],
[type="search"],
[type="tel"],
[type="time"],
[type="url"],
[type="color"],
textarea {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  display: block;
  display: flex;
  align-items: center;
  width: 100%;
  height: 2.5rem;
  margin: 0;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: hsl(0 0% 100% / 10%);
  background-blend-mode: luminosity;
  box-shadow: none;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: normal;
  line-height: 1.5;
  color: var(--color-foreground);
  transition: box-shadow 200ms, border-color 50ms ease-out,
    background-color 50ms ease-out, color 50ms ease-out;
}

[data-light] [type="text"],
[data-light] [type="password"],
[data-light] [type="date"],
[data-light] [type="datetime"],
[data-light] [type="datetime-local"],
[data-light] [type="month"],
[data-light] [type="week"],
[data-light] [type="email"],
[data-light] [type="number"],
[data-light] [type="search"],
[data-light] [type="tel"],
[data-light] [type="time"],
[data-light] [type="url"],
[data-light] [type="color"],
[data-light] textarea {
  color: var(--color-background);
  background-color: hsl(0 0% 0% / 10%);
}

[type="text"][aria-invalid="true"],
[type="password"][aria-invalid="true"],
[type="date"][aria-invalid="true"],
[type="datetime"][aria-invalid="true"],
[type="datetime-local"][aria-invalid="true"],
[type="month"][aria-invalid="true"],
[type="week"][aria-invalid="true"],
[type="email"][aria-invalid="true"],
[type="number"][aria-invalid="true"],
[type="search"][aria-invalid="true"],
[type="tel"][aria-invalid="true"],
[type="time"][aria-invalid="true"],
[type="url"][aria-invalid="true"],
[type="color"][aria-invalid="true"],
textarea[aria-invalid="true"] {
  border-color: var(--color-invalid);
}

textarea {
  display: block;
  min-height: 50px;
  max-width: 100%;
}

textarea[rows] {
  height: auto;
}

input:disabled,
input[readonly],
textarea:disabled,
textarea[readonly] {
  opacity: 0.7;
  cursor: not-allowed;
}

[type="file"],
[type="checkbox"],
[type="radio"] {
  margin: 0;
}

[type="file"] {
  width: 100%;
}

label {
  margin: 0;
}

[type="checkbox"] + label,
[type="radio"] + label {
  margin-left: 0.5rem;
}

label > [type="checkbox"],
label > [type="radio"] {
  margin-right: 0.5rem;
}

::placeholder {
  color: hsl(0 0% 100% / 65%);
}

.form-validation-error {
  margin: 0;
  margin-top: 0.25em;
  color: var(--color-invalid);
  font-size: 0.8rem;
}

.error-container {
  background-color: hsla(356, 77%, 59%, 0.747);
  border-radius: 0.25rem;
  padding: 0.5rem 1rem;
}
```

</details>

<details>

<summary>💿 Copy this to `app/styles/global-large.css`</summary>

```css filename=app/styles/global-large.css
h1 {
  font-size: 3.75rem;
  line-height: 1;
}

h2 {
  font-size: 1.875rem;
  line-height: 2.25rem;
}

h3 {
  font-size: 1.5rem;
  line-height: 2rem;
}

h4 {
  font-size: 1.25rem;
  line-height: 1.75rem;
}

h5 {
  font-size: 1.125rem;
  line-height: 1.75rem;
}
```

</details>

<details>

<summary>💿 Copy this to `app/styles/global-medium.css`</summary>

```css filename=app/styles/global-medium.css
h1 {
  font-size: 3rem;
  line-height: 1;
}

h2 {
  font-size: 2.25rem;
  line-height: 2.5rem;
}

h3 {
  font-size: 1.25rem;
  line-height: 1.75rem;
}

h4 {
  font-size: 1.125rem;
  line-height: 1.75rem;
}

h5,
h6 {
  font-size: 1rem;
  line-height: 1.5rem;
}

.container {
  --gutter: 40px;
}
```

</details>

<details>

<summary>💿 Copy this to `app/styles/index.css`</summary>

```css filename=app/styles/index.css
/*
 * when the user visits this page, this style will apply, when they leave, it
 * will get unloaded, so don't worry so much about conflicting styles between
 * pages!
 */

body {
  background-image: var(--gradient-background);
}

.container {
  min-height: inherit;
}

.container,
.content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.content {
  padding-top: 3rem;
  padding-bottom: 3rem;
}

h1 {
  margin: 0;
  text-shadow: 0 3px 0 rgba(0, 0, 0, 0.75);
  text-align: center;
  line-height: 0.5;
}

h1 span {
  display: block;
  font-size: 4.5rem;
  line-height: 1;
  text-transform: uppercase;
  text-shadow: 0 0.2em 0.5em rgba(0, 0, 0, 0.5), 0 5px 0
      rgba(0, 0, 0, 0.75);
}

nav ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 1rem;
  font-family: var(--font-display);
  font-size: 1.125rem;
  line-height: 1;
}

nav ul a:hover {
  text-decoration-style: wavy;
  text-decoration-thickness: 1px;
}

@media print, (min-width: 640px) {
  h1 span {
    font-size: 6rem;
  }

  nav ul {
    font-size: 1.25rem;
    gap: 1.5rem;
  }
}

@media screen and (min-width: 1024px) {
  h1 span {
    font-size: 8rem;
  }
}
```

</details>

<details>

<summary>💿 Copy this to `app/styles/jokes.css`</summary>

```css filename=app/styles/jokes.css
.jokes-layout {
  display: flex;
  flex-direction: column;
  min-height: inherit;
}

.jokes-header {
  padding-top: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.jokes-header .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.jokes-header .home-link {
  font-family: var(--font-display);
  font-size: 3rem;
}

.jokes-header .home-link a {
  color: var(--color-foreground);
}

.jokes-header .home-link a:hover {
  text-decoration: none;
}

.jokes-header .logo-medium {
  display: none;
}

.jokes-header a:hover {
  text-decoration-style: wavy;
  text-decoration-thickness: 1px;
}

.jokes-header .user-info {
  display: flex;
  gap: 1rem;
  align-items: center;
  white-space: nowrap;
}

.jokes-main {
  padding-top: 2rem;
  padding-bottom: 2rem;
  flex: 1 1 100%;
}

.jokes-main .container {
  display: flex;
  gap: 1rem;
}

.jokes-list {
  max-width: 12rem;
}

.jokes-outlet {
  flex: 1;
}

.jokes-footer {
  padding-top: 2rem;
  padding-bottom: 1rem;
  border-top: 1px solid var(--color-border);
}

@media print, (min-width: 640px) {
  .jokes-header .logo {
    display: none;
  }

  .jokes-header .logo-medium {
    display: block;
  }

  .jokes-main {
    padding-top: 3rem;
    padding-bottom: 3rem;
  }
}

@media (max-width: 639px) {
  .jokes-main .container {
    flex-direction: column;
  }
}
```

</details>

💿 Also, download <a href="/jokes-tutorial/baloo/baloo.woff" data-noprefetch target="_blank">the font</a> and <a href="/jokes-tutorial/baloo/License.txt" data-noprefetch target="_blank">its license</a> and put them in `public/fonts/baloo`.

💿 While you're downloading assets, you may as well download <a href="/jokes-tutorial/social.png" data-noprefetch target="_blank">the social image</a> and put that at `public/social.png`. You'll need that later.

💿 Add the `links` export to `app/root.tsx` and `app/routes/jokes.tsx` to bring in some CSS to make the page look nice (note: each will have its own CSS file(s)). You can look at the CSS and add some structure to your JSX elements to make things look appealing. I'm going to add some links too.

<docs-info>The `app/root.tsx` will be the one that links to the `global` CSS files. Why do you think the name "global" makes sense for the root route's styles?</docs-info>

The `global-large.css` and `global-medium.css` files are for media query-based CSS.

<docs-info>Did you know that `<link />` tags can use media queries? [Check out the MDN page for `<link />`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link).</docs-info>

<details>

<summary>app/root.tsx</summary>

```tsx filename=app/root.tsx lines=[1,4-6,8-25]
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

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>Remix: So great, it's funny!</title>
        <Links />
      </head>
      <body>
        <Outlet />
        <LiveReload />
      </body>
    </html>
  );
}
```

</details>

<details>

<summary>app/routes/jokes.tsx</summary>

```tsx filename=app/routes/jokes.tsx lines=[1,4,6-8]
import type { LinksFunction } from "remix";
import { Outlet, Link } from "remix";

import stylesUrl from "~/styles/jokes.css";

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export default function TwixesRoute() {
  return (
    <div className="jokes-layout">
      <header className="jokes-header">
        <div className="container">
          <h1 className="home-link">
            <Link
              to="/"
              title="Remix Twixes"
              aria-label="Remix Twixes"
            >
              <span className="logo">🤪</span>
              <span className="logo-medium">J🤪KES</span>
            </Link>
          </h1>
        </div>
      </header>
      <main className="jokes-main">
        <div className="container">
          <div className="jokes-list">
            <Link to=".">Get a random joke</Link>
            <p>Here are a few more jokes to check out:</p>
            <ul>
              <li>
                <Link to="some-joke-id">Hippo</Link>
              </li>
            </ul>
            <Link to="new" className="button">
              Add your own
            </Link>
          </div>
          <div className="jokes-outlet">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
```

</details>

💿 Let's also add a link to the jokes from the homepage and follow some of the class names in the CSS to make the homepage look nice.

<details>

<summary>app/routes/index.tsx</summary>

```tsx filename=app/routes/index.tsx lines=[1,4,6-13]
import type { LinksFunction } from "remix";
import { Link } from "remix";

import stylesUrl from "~/styles/index.css";

export const links: LinksFunction = () => {
  return [
    {
      rel: "stylesheet",
      href: stylesUrl,
    },
  ];
};

export default function Index() {
  return (
    <div className="container">
      <div className="content">
        <h1>
          Remix <span>Twixes!</span>
        </h1>
        <nav>
          <ul>
            <li>
              <Link to="jokes">Read Twixes</Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
```

</details>

As we work through the rest of the tutorial, you may want to check the class names in those CSS files so you can take full advantage of that CSS.

One quick note about CSS. A lot of you folks may be used to using runtime libraries for CSS (like [Styled-Components](https://www.styled-components.com/)). While you can use those with Remix, we'd like to encourage you to look into more traditional approaches to CSS. Many of the problems that led to the creation of these styling solutions aren't really problems in Remix, so you can often go with a simpler styling approach.

That said, many Remix users are very happy with [Tailwind](https://tailwindcss.com/) and we recommend this approach. Basically, if it can give you a URL (or a CSS file which you can import to get a URL), then it's a generally a good approach because Remix can then leverage the browser platform for caching and loading/unloading.