## Routes

The first thing we want to do is get our routing structure set up. Here are all the routes our app is going to have:

```
/
/jokes
/jokes/:jokeId
/jokes/new
/login
```

You can programmatically create routes via the [`remix.config.js`](../api/conventions#remixconfigjs), but the more common way to create the routes is through the file system. This is called "file-based routing."

Each file we put in the `app/routes` directory is called a ["Route Module"](../api/conventions#route-module-api) and by following [the route filename convention](../api/conventions#route-filenames), we can create the routing URL structure we're looking for. Remix uses [React Router](https://reactrouter.com/) under the hood to handle this routing.

💿 Let's start with the index route (`/`). To do that, create a file at `app/routes/index.tsx` and `export default` a component from that route module. For now, you can have it just say "Hello Index Route" or something.

<details>

<summary>app/routes/index.tsx</summary>

```tsx filename=app/routes/index.tsx
export default function IndexRoute() {
  return <div>Hello Index Route</div>;
}
```

</details>

React Router supports "nested routing" which means we have parent-child relationships in our routes. The `app/routes/index.tsx` is a child of the `app/root.tsx` route. In nested routing, parents are responsible for laying out their children.

💿 Update the `app/root.tsx` to position children. You'll do this with the `<Outlet />` component from `remix`:

<details>

<summary>app/root.tsx</summary>

```tsx filename=app/root.tsx lines=[1,11]
import { LiveReload, Outlet } from "remix";

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>Remix: So great, it's funny!</title>
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

<docs-info>Remember to have the dev server running with `npm run dev`</docs-info>

That will watch your filesystem for changes, rebuild the site, and thanks to the `<LiveReload />` component your browser will refresh.

💿 Go ahead and open up the site again and you should be presented with the greeting from the index route.

![A greeting from the index route](/jokes-tutorial/img/index-route-greeting.png)

Great! Next let's handle the `/jokes` route.

💿 Create a new route at `app/routes/jokes.tsx` (keep in mind that this will be a parent route, so you'll want to use `<Outlet />` again).

<details>

<summary>app/routes/jokes.tsx</summary>

```tsx filename=app/routes/jokes.tsx
import { Outlet } from "remix";

export default function JokesRoute() {
  return (
    <div>
      <h1>J🤪KES</h1>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
```

</details>

You should be presented with that component when you go to [`/jokes`](http://localhost:3000/jokes). Now, in that `<Outlet />` we want to render out some random jokes in the "index route".

💿 Create a route at `app/routes/jokes/index.tsx`

<details>

<summary>app/routes/jokes/index.tsx</summary>

```tsx filename=app/routes/jokes/index.tsx
export default function JokesIndexRoute() {
  return (
    <div>
      <p>Here's a random joke:</p>
      <p>
        I was wondering why the frisbee was getting bigger,
        then it hit me.
      </p>
    </div>
  );
}
```

</details>

Now if you refresh [`/jokes`](http://localhost:3000/jokes), you'll get the content in the `app/routes/jokes.tsx` as well as the `app/routes/jokes/index.tsx`. Here's what mine looks like:

![A random joke on the jokes page: "I was wondering why the frisbee was getting bigger, then it hit me"](/jokes-tutorial/img/random-joke.png)

And notice that each of those route modules is only concerned with their part of the URL. Neat right!? Nested routing is pretty nice, and we're only just getting started. Let's keep going.

💿 Next, let's handle the `/jokes/new` route. I'll bet you can figure out how to do that 😄. Remember we're going to allow people to create jokes on this page, so you'll want to render a `form` with `name` and `content` fields.

<details>

<summary>app/routes/jokes/new.tsx</summary>

```tsx filename=app/routes/jokes/new.tsx
export default function NewJokeRoute() {
  return (
    <div>
      <p>Add your own hilarious joke</p>
      <form method="post">
        <div>
          <label>
            Name: <input type="text" name="name" />
          </label>
        </div>
        <div>
          <label>
            Content: <textarea name="content" />
          </label>
        </div>
        <div>
          <button type="submit" className="button">
            Add
          </button>
        </div>
      </form>
    </div>
  );
}
```

</details>

Great, so now going to [`/jokes/new`](http://localhost:3000/jokes/new) should display your form:

![A new joke form](/jokes-tutorial/img/new-joke.png)

### Parameterized Routes

Soon we'll add a database that stores our jokes by an ID, so let's add one more route that's a little more unique, a parameterized route:

`/jokes/:jokeId`

Here the parameter `$jokeId` can be anything, and we can lookup that part of the URL up in the database to display the right joke. To make a parameterized route, we use the `$` character in the filename. ([Read more about the convention here](../api/conventions#route-filenames)).

💿 Create a new route at `app/routes/jokes/$jokeId.tsx`. Don't worry too much about what it displays for now (we don't have a database set up yet!):

<details>

<summary>app/routes/jokes/$jokeId.tsx</summary>

```tsx filename=app/routes/jokes/$jokeId.tsx
export default function JokeRoute() {
  return (
    <div>
      <p>Here's your hilarious joke:</p>
      <p>
        Why don't you find hippopotamuses hiding in trees?
        They're really good at it.
      </p>
    </div>
  );
}
```

</details>

Great, so now going to [`/jokes/anything-you-want`](http://localhost:3000/jokes/hippos) should display what you just created (in addition to the parent routes):

![A new joke form](/jokes-tutorial/img/param-route.png)

Great! We've got our primary routes all set up!