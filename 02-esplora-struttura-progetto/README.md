## Explore the project structure

Here's the tree structure. Hopefully what you've got looks a bit like this:

```
remix-jokes
├── README.md
├── app
│   ├── entry.client.tsx
│   ├── entry.server.tsx
│   ├── root.tsx
│   └── routes
│       └── index.tsx
├── package-lock.json
├── package.json
├── public
│   └── favicon.ico
├── remix.config.js
├── remix.env.d.ts
└── tsconfig.json
```

Let's talk briefly about a few of these files:

- `app/` - This is where all your Remix app code goes
- `app/entry.client.tsx` - This is the first bit of your JavaScript that will run when the app loads in the browser. We use this file to [hydrate](https://reactjs.org/docs/react-dom.html#hydrate) our React components.
- `app/entry.server.tsx` - This is the first bit of your JavaScript that will run when a request hits your server. Remix handles loading all the necessary data and you're responsible for sending back the response. We'll use this file to render our React app to a string/stream and send that as our response to the client.
- `app/root.tsx` - This is where we put the root component for our application. You render the `<html>` element here.
- `app/routes/` - This is where all your "route modules" will go. Remix uses the files in this directory to create the URL routes for your app based on the name of the files.
- `public/` - This is where your static assets go (images/fonts/etc)
- `remix.config.js` - Remix has a handful of configuration options you can set in this file.

💿 Let's go ahead and run the build:

```sh
npm run build
```

That should output something like this:

```
Building Remix app in production mode...
Built in 132ms
```

Now you should also have a `.cache/` directory (something used internally by Remix), a `build/` directory, and a `public/build` directory. The `build/` directory is our server-side code. The `public/build/` holds all our client-side code. These three directories are listed in your `.gitignore` file so you don't commit the generated files to source control.

💿 Let's run the built app now:

```sh
npm start
```

This will start the server and output this:

```
Remix App Server started at http://localhost:3000
```

Open up that URL and you should be presented with a minimal page pointing to some docs.

💿 Now stop the server and delete all this stuff:

- `app/routes`
- `app/styles`

We're going to trim this down the bare bones and introduce things incrementally.

💿 Replace the contents of `app/root.tsx` with this:

```tsx filename=app/root.tsx
import { LiveReload } from "remix";

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>Remix: So great, it's funny!</title>
      </head>
      <body>
        Hello world
        <LiveReload />
      </body>
    </html>
  );
}
```

<docs-info>

The `<LiveReload />` component is useful during development to auto-refresh our browser whenever we make a change. Because our build server is so fast, the reload will often happen before you even notice ⚡

</docs-info>

Your `app/` directory should now look like this:

```
app
├── entry.client.tsx
├── entry.server.tsx
└── root.tsx
```

💿 With that set up, go ahead and start the dev server up with this command:

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and the app should greet the world:

![Bare bones hello world app](/jokes-tutorial/img/bare-bones.png)

Great, now we're ready to start adding stuff back.