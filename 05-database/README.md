## Database (TODO use MongoDB)

### Setup MongoDB
For this blog, we will be using Prisma with experimental features for connecting to a MongoDB database to store our twixes

Most real-world applications require some form of data persistence. In our case, we want to save our twixes to a database so people can read at our twixes and even submit their own (coming soon in the authentication section!).

### Set up Prisma

The prisma team has built [a VSCode extension](https://marketplace.visualstudio.com/items?itemName=Prisma.prisma) you might find quite helpful when working on the prisma schema.

In this tutorial we're going to use [MongoDB](https://www.mongodb.com/) database. Essentially, it's a database and best of all it's supported by [Prisma](https://www.prisma.io), our favorite database ORM! It's a great place to start if you're not sure what database to use.

There are two packages that we need to get started:

- `prisma` for interact with our database and schema during development
- `@prisma/client` for making queries to our database during runtime.

💿 Install the prisma packages:

```sh
npm install --save-dev prisma
npm install @prisma/client
```

💿 Let's invoke the Prisma command line interface (CLI)
```sh
npx prisma
```


💿 Now we can initialize prisma which will create our Prisma folder

```sh
npx prisma init
```

That gives us this output:

```
✔ Your Prisma schema was created at prisma/schema.prisma
  You can now open it in your favorite editor.

warn You already have a .gitignore. Don't forget to exclude .env to not commit any secret.

Next steps:
1. Set the DATABASE_URL in the .env file to point to your existing database. If your database has no tables yet, read https://pris.ly/d/getting-started
2. Set the provider of the datasource block in schema.prisma to match your database: postgresql, mysql, sqlite, sqlserver or mongodb (Preview).
3. Run prisma db pull to turn your database schema into a Prisma schema.
4. Run prisma generate to generate the Prisma Client. You can then start querying your database.

More information in our documentation:
https://pris.ly/d/getting-started
```

## MongoDB:
We are going to use the Free Shared DB, it's free, no credit card required to start, and you get leverage the power of cloud database. This section assumes you have never used MongoDB before, if you are already familiar with Mongo or have a Cluster setup, you can skip ahead to the next section 😎

1. Go to https://account.mongodb.com/account/register?tck=docs_atlas and create an account (puoi usare il Sign di Google o creare un account)
2. Choose the Free Shared account
3. Choose any cluster, I'm choosing GCP / Belgium (europe-west1) for my deployment, and create the cluster.
4. In the Security QuickStart, create a Username and Password authentication. Save this information as we will need it soon. I'm going to create remix_user with a secure password. Be sure to click Create User.
For IP Access List, we are going to put in 0.0.0.0 as the IP to ensure that our database get's up and running quickly for testing. You will want to restrict this for production apps.
6. You should now be redirected to your Database Deployments showing Cluster0.
7. Click Connect button vicino Cluster 0
8. Click Connect your application
9. Copy the connection string provided.
10. In your Remix app, look for the `.env` file in the root folder. This is a local environment file that we will store your mongo URL secret in since it contains username and password to your database. Open this up and you will see that Prisma already put some information in there.
11. Let's update the `DATABASE_URL` to be our new MongoDB server address. ``` DATABASE_URL="mongodb+srv://remix_user:supersecretpassword@cluster0.cvvbu.mongodb.net/MyFirstDatabase"```


## SETUP Prisma

Now that we've got prisma initialized, we can start modeling our app data. Because this isn't a prisma tutorial, I'll just hand you that and you can read more about the prisma scheme from [their docs](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference):

```prisma filename=prisma/schema.prisma lines=[13-19]
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["mongoDb"]
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

model User {
  id       String @id @default(auto()) @map("_id") @db.ObjectId
  createdAt    DateTime @db.Date @default(now())
  updatedAt    DateTime @db.Date @default(now())
  username     String   @unique
  passwordHash String
  jokes        Joke[]
}

model Joke {
  id       String @id @default(auto()) @map("_id") @db.ObjectId
  jokesterId String @db.ObjectId
  jokester   User     @relation(fields: [jokesterId], references: [id])
  createdAt  DateTime @db.Date @default(now())
  updatedAt  DateTime @db.Date @default(now())
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
Datasource "db"

🚀  Your database is now in sync with your schema. Done in 194ms

✔ Generated Prisma Client (3.10.0 | library) to ./node_modules/@prisma/client in 167ms
```

This command did a few things. It pushed all the necessary changes to our database to match the schema we provided. Finally it generated Prisma's TypeScript types so we'll get stellar autocomplete and type checking as we use it's API for interacting with our database.

### Connect to the database

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