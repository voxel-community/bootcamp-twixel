## Database (TODO use MongoDB)

Most real-world applications require some form of data persistence. In our case, we want to save our jokes to a database so people can laugh at our hilarity and even submit their own (coming soon in the authentication section!).

You can use any persistence solution you like with Remix; [Firebase](https://firebase.google.com/), [Supabase](https://supabase.com/), [Airtable](https://www.airtable.com/), [Hasura](https://hasura.io/), [Google Spreadsheets](https://www.google.com/sheets/about/), [Cloudflare Workers KV](https://www.cloudflare.com/products/workers-kv/), [Fauna](https://fauna.com/features), a custom [PostgreSQL](https://www.postgresql.org/), or even your backend team's REST/GraphQL APIs. Seriously. Whatever you want.

### Set up Prisma

<docs-info>The prisma team has built [a VSCode extension](https://marketplace.visualstudio.com/items?itemName=Prisma.prisma) you might find quite helpful when working on the prisma schema.</docs-info>

In this tutorial we're going to use our own [SQLite](https://sqlite.org/index.html) database. Essentially, it's a database that lives in a file on your computer, is surprisingly capable, and best of all it's supported by [Prisma](https://www.prisma.io), our favorite database ORM! It's a great place to start if you're not sure what database to use.

There are two packages that we need to get started:

- `prisma` for interact with our database and schema during development
- `@prisma/client` for making queries to our database during runtime.

💿 Install the prisma packages:

```sh
npm install --save-dev prisma
npm install @prisma/client
```

💿 Now we can initialize prisma with sqlite:

```sh
npx prisma init --datasource-provider sqlite
```

That gives us this output:

```
✔ Your Prisma schema was created at prisma/schema.prisma
  You can now open it in your favorite editor.

warn You already have a .gitignore. Don't forget to exclude .env to not commit any secret.

Next steps:
1. Set the DATABASE_URL in the .env file to point to your existing database. If your database has no tables yet, read https://pris.ly/d/getting-started
2. Run prisma db pull to turn your database schema into a Prisma schema.
3. Run prisma generate to generate the Prisma Client. You can then start querying your database.

More information in our documentation:
https://pris.ly/d/getting-started
```

Now that we've got prisma initialized, we can start modeling our app data. Because this isn't a prisma tutorial, I'll just hand you that and you can read more about the prisma scheme from [their docs](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference):

```prisma filename=prisma/schema.prisma lines=[13-19]
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Joke {
  id         String   @id @default(uuid())
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  name       String
  content    String
}
```

💿 With that in place, run this:

```sh
npx prisma db push
```

This command will give you this output:

```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": SQLite database "dev.db" at "file:./dev.db"

🚀  Your database is now in sync with your schema. Done in 194ms

✔ Generated Prisma Client (3.5.0) to ./node_modules/
@prisma/client in 26ms
```

This command did a few things. For one, it created our database file in `prisma/dev.db`. Then it pushed all the necessary changes to our database to match the schema we provided. Finally it generated Prisma's TypeScript types so we'll get stellar autocomplete and type checking as we use it's API for interacting with our database.

💿 Let's add that `prisma/dev.db` to our `.gitignore` so we don't accidentally commit it to our repository. We'll also want to add the `.env` file to the `.gitignore` as mentioned in the prisma output so we don't commit our secrets!

```sh filename=.gitignore lines=[7-8]
node_modules

/.cache
/build
/public/build

/prisma/dev.db
.env
```

<docs-warning>If your database gets messed up, you can always delete the `prisma/dev.db` file and run `npx prisma db push` again.</docs-warning>

Next, we're going to write a little file that will "seed" our database with test data. Again, this isn't really remix-specific stuff, so I'll just give this to you (don't worry, we'll get back to remix soon):

💿 Copy this into a new file called `prisma/seed.ts`

```ts filename=prisma/seed.ts
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function seed() {
  await Promise.all(
    getJokes().map((joke) => {
      return db.joke.create({ data: joke });
    })
  );
}

seed();

function getJokes() {
  // shout-out to https://icanhazdadjoke.com/

  return [
    {
      name: "Road worker",
      content: `I never wanted to believe that my Dad was stealing from his job as a road worker. But when I got home, all the signs were there.`,
    },
    {
      name: "Frisbee",
      content: `I was wondering why the frisbee was getting bigger, then it hit me.`,
    },
    {
      name: "Trees",
      content: `Why do trees seem suspicious on sunny days? Dunno, they're just a bit shady.`,
    },
    {
      name: "Skeletons",
      content: `Why don't skeletons ride roller coasters? They don't have the stomach for it.`,
    },
    {
      name: "Hippos",
      content: `Why don't you find hippopotamuses hiding in trees? They're really good at it.`,
    },
    {
      name: "Dinner",
      content: `What did one plate say to the other plate? Dinner is on me!`,
    },
    {
      name: "Elevator",
      content: `My first time using an elevator was an uplifting experience. The second time let me down.`,
    },
  ];
}
```

Feel free to add your own jokes if you like.

Now we just need to run this file. We wrote it in TypeScript to get type safety (this is much more useful as our app and data models grow in complexity). So we'll need a way to run it.

💿 Install `esbuild-register` as a dev dependency:

```sh
npm install --save-dev esbuild-register
```

💿 And now we can run our `seed.ts` file with that:

```sh
node --require esbuild-register prisma/seed.ts
```

Now our database has those jokes in it. No joke!

But I don't want to have to remember to run that script any time I reset the database. Luckily, we don't have to!

💿 Add this to your `package.json`:

```json nocopy
// ...
  "prisma": {
    "seed": "node --require esbuild-register prisma/seed.ts"
  },
  "scripts": {
// ...
```

Now, whenever we reset the database, prisma will call our seeding file as well.

### Connect to the database

Ok, one last thing we need to do is connect to the database in our app. We do this at the top of our `prisma/seed.ts` file:

```ts nocopy
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
```

This works just fine, but the problem is, during development, we don't want to close down and completely restart our server every time we make a server-side change. So `@remix-run/serve` actually rebuilds our code and requires it brand new. The problem here is that every time we make a code change, we'll make a new connection to the database and eventually run out of connections! This is such a common problem with database-accessing apps that Prisma has a warning for it:

> Warning: 10 Prisma Clients are already running

So we've got a little bit of extra work to do to avoid this development time problem.

Note that this isn't a remix-only problem. Any time you have "live reload" of server code, you're going to have to either disconnect and reconnect to databases (which can be slow) or do the workaround I'm about to show you.

💿 Copy this into a new file called `app/utils/db.server.ts`

```ts filename=app/utils/db.server.ts
import { PrismaClient } from "@prisma/client";

let db: PrismaClient;

declare global {
  var __db: PrismaClient | undefined;
}

// this is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
if (process.env.NODE_ENV === "production") {
  db = new PrismaClient();
  db.$connect();
} else {
  if (!global.__db) {
    global.__db = new PrismaClient();
    global.__db.$connect();
  }
  db = global.__db;
}

export { db };
```

I'll leave analysis of this code as an exercise for the reader because again, this has nothing to do with Remix directly.

The one thing that I will call out is the file name convention. The `.server` part of the filename informs Remix that this code should never end up in the browser. This is optional, because Remix does a good job of ensuring server code doesn't end up in the client. But sometimes some server-only dependencies are difficult to treeshake, so adding the `.server` to the filename is a hint to the compiler to not worry about this module or its imports when bundling for the browser. The `.server` acts as a sort of boundary for the compiler.

### Read from the database in a Remix loader

Ok, ready to get back to writing Remix code? Me too!

Our goal is to put a list of jokes on the `/jokes` route so we can have a list of links to jokes people can choose from. In Remix, each route module is responsible for getting its own data. So if we want data on the `/jokes` route, then we'll be updating the `app/routes/jokes.tsx` file.

To _load_ data in a Remix route module, you use a [`loader`](../api/conventions#loader). This is simply an `async` function you export that returns a response, and is accessed on the component through the [`useLoaderData`](../api/remix#useloaderdata) hook. Here's a quick example:

```tsx nocopy
// this is just an example. No need to copy/paste this 😄
import type { LoaderFunction } from "remix";
import type { User } from "@prisma/client";

import { db } from "~/utils/db.server";

type LoaderData = { users: Array<User> };
export let loader: LoaderFunction = async () => {
  const data: LoaderData = {
    users: await db.user.findMany(),
  };
  return data;
};

export default function Users() {
  const data = useLoaderData<LoaderData>();
  return (
    <ul>
      {data.users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

Does that give you a good idea of what to do here? If not, you can take a look at my solution in the `<details>` below 😄

<docs-info>

Remix and the `tsconfig.json` you get from the starter template are configured to allow imports from the `app/` directory via `~` as demonstrated above so you don't have `../../` all over the place.

</docs-info>

💿 Update the `app/routes/jokes.tsx` route module to load jokes from our database and render a list of links to the jokes.

<details>

<summary>app/routes/jokes.tsx</summary>

```tsx filename=app/routes/jokes.tsx lines=[1-2,4,11-13,15-20,23,47-51]
import type { LinksFunction, LoaderFunction } from "remix";
import { Link, Outlet, useLoaderData } from "remix";

import { db } from "~/utils/db.server";
import stylesUrl from "~/styles/jokes.css";

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

type LoaderData = {
  jokeListItems: Array<{ id: string; name: string }>;
};

export const loader: LoaderFunction = async () => {
  const data: LoaderData = {
    jokeListItems: await db.joke.findMany(),
  };
  return data;
};

export default function JokesRoute() {
  const data = useLoaderData<LoaderData>();

  return (
    <div className="jokes-layout">
      <header className="jokes-header">
        <div className="container">
          <h1 className="home-link">
            <Link
              to="/"
              title="Remix Jokes"
              aria-label="Remix Jokes"
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
              {data.jokeListItems.map((joke) => (
                <li key={joke.id}>
                  <Link to={joke.id}>{joke.name}</Link>
                </li>
              ))}
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

And here's what we have with that now:

![List of links to jokes](/jokes-tutorial/img/jokes-loaded.png)

### Data overfetching

I want to call out something specific in my solution. Here's my loader:

```tsx lines=[8-10]
type LoaderData = {
  jokeListItems: Array<{ id: string; name: string }>;
};

export const loader: LoaderFunction = async () => {
  const data: LoaderData = {
    jokeListItems: await db.joke.findMany({
      take: 5,
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
  };
  return data;
};
```

Notice that all I need for this page is the joke `id` and `name`. I don't need to bother getting the `content`. I'm also limiting to a total of 5 items and ordering by creation date so we get the latest jokes. So with `prisma`, I can change my query to be exactly what I need and avoid sending too much data to the client! That makes my app faster and more responsive for my users.

And to make it even cooler, you don't necessarily need prisma or direct database access to do this. You've got a graphql backend you're hitting? Sweet, use your regular graphql stuff in your loader. It's even better than doing it on the client because you don't need to worry about shipping a [huge graphql client](https://bundlephobia.com/package/graphql@16.0.1) to the client. Keep that on your server and filter down to what you want.

Oh, you've just got REST endpoints you hit? That's fine too! You can easily filter out the extra data before sending it off in your loader. Because it all happens on the server, you can save your user's download size easily without having to convince your backend engineers to change their entire API. Neat!

### Network Type Safety

In our code we're using the `useLoaderData`'s type generic and specifying our `LoaderData` so we can get nice auto-complete, but it's not _really_ getting us type safety because the `loader` and the `useLoaderData` are running in completely different environments. Remix ensures we get what the server sent, but who really knows? Maybe in a fit of rage, your co-worker set up your server to automatically remove references to dogs (they prefer cats).

So the only way to really be 100% positive that your data is correct, you should use [assertion functions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions) on the `data` you get back from `useLoaderData`. That's outside the scope of this tutorial, but we're fans of [zod](https://npm.im/zod) which can aid in this.

### Wrap up database queries

Before we get to the `/jokes/:jokeId` route, here's a quick example of how you can access params (like `:jokeId`) in your loader.

```tsx nocopy
export const loader: LoaderFunction = async ({
  params,
}) => {
  console.log(params); // <-- {jokeId: "123"}
};
```

And here's how you get the joke from prisma:

```tsx nocopy
const joke = await db.joke.findUnique({
  where: { id: jokeId },
});
```

<docs-warning>Remember, when we're referencing the URL route, it's `/jokes/:jokeId`, and when we talk about the file system it's `/app/routes/jokes/$jokeId.tsx`.</docs-warning>

💿 Great! Now you know everything you need to continue and connect the `/jokes/:jokeId` route in `app/routes/jokes/$jokeId.tsx`.

<details>

<summary>app/routes/jokes/$jokeId.tsx</summary>

```tsx filename=app/routes/jokes/$jokeId.tsx lines=[3,5,7,9-18,21]
import type { LoaderFunction } from "remix";
import { Link, useLoaderData } from "remix";
import type { Joke } from "@prisma/client";

import { db } from "~/utils/db.server";

type LoaderData = { joke: Joke };

export const loader: LoaderFunction = async ({
  params,
}) => {
  const joke = await db.joke.findUnique({
    where: { id: params.jokeId },
  });
  if (!joke) throw new Error("Joke not found");
  const data: LoaderData = { joke };
  return data;
};

export default function JokeRoute() {
  const data = useLoaderData<LoaderData>();

  return (
    <div>
      <p>Here's your hilarious joke:</p>
      <p>{data.joke.content}</p>
      <Link to=".">{data.joke.name} Permalink</Link>
    </div>
  );
}
```

</details>

With that you should be able to go to [`/jokes`](http://localhost:3000/jokes) and click on a link to get the joke:

![Jokes page showing a unique joke](/jokes-tutorial/img/joke-page.png)

We'll handle the case where someone tries to access a joke that doesn't exist in the database in the next section.

Next, let's handle the `/jokes` index route in `app/routes/jokes/index.tsx` that shows a random joke.

Here's how you get a random joke from prisma:

```tsx
const count = await db.joke.count();
const randomRowNumber = Math.floor(Math.random() * count);
const [randomJoke] = await db.joke.findMany({
  take: 1,
  skip: randomRowNumber,
});
```

💿 You should be able to get the loader working from there.

<details>

<summary>app/routes/jokes/index.tsx</summary>

```tsx filename=app/routes/jokes/index.tsx lines=[3,5,7,9-18,21]
import type { LoaderFunction } from "remix";
import { useLoaderData, Link } from "remix";
import type { Joke } from "@prisma/client";

import { db } from "~/utils/db.server";

type LoaderData = { randomJoke: Joke };

export const loader: LoaderFunction = async () => {
  const count = await db.joke.count();
  const randomRowNumber = Math.floor(Math.random() * count);
  const [randomJoke] = await db.joke.findMany({
    take: 1,
    skip: randomRowNumber,
  });
  const data: LoaderData = { randomJoke };
  return data;
};

export default function JokesIndexRoute() {
  const data = useLoaderData<LoaderData>();

  return (
    <div>
      <p>Here's a random joke:</p>
      <p>{data.randomJoke.content}</p>
      <Link to={data.randomJoke.id}>
        "{data.randomJoke.name}" Permalink
      </Link>
    </div>
  );
}
```

</details>

With that your [`/jokes`](http://localhost:3000/jokes) route should display a list of links to jokes as well as a random joke:

![Jokes page showing a random joke](/jokes-tutorial/img/random-joke-loaded.png)