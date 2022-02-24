## Authentication

It's the moment we've all been waiting for! We're going to add authentication to our little application. The reason we want to add authentication is so jokes can be associated to the users who created them.

One thing that would be good to understand for this section is how [HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies) work on the web.

We're going to handroll our own authentication from scratch. Don't worry, I promise it's not as scary as it sounds.

### Preparing the database

<docs-warning>Remember, if your database gets messed up, you can always delete the `prisma/dev.db` file and run `npx prisma db push` again.</docs-warning>

Let's start by showing you our updated `prisma/schema.prisma` file. 💿 Go ahead and update your `prisma/schema.prisma` file to look like this:

```prisma filename=prisma/schema.prisma lines=[13-20,24-25]
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  username     String   @unique
  passwordHash String
  jokes        Joke[]
}

model Joke {
  id         String   @id @default(uuid())
  jokesterId String
  jokester   User     @relation(fields: [jokesterId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  name       String
  content    String
}
```

With that updated, let's go ahead and reset our database to this schema:

💿 Run this:

```sh
npx prisma db push
```

It will prompt you to reset the database, hit "y" to confirm.

That will give you this output:

```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": SQLite database "dev.db" at "file:./dev.db"


⚠️ We found changes that cannot be executed:

  • Added the required column `jokesterId` to the `Joke` table without a default value. There are 9 rows in this table, it is not possible to execute this step.


✔ To apply this change we need to reset the database, do you want to continue? All data will be lost. … yes
The SQLite database "dev.db" from "file:./dev.db" was successfully reset.

🚀  Your database is now in sync with your schema. Done in 1.56s

✔ Generated Prisma Client (3.5.0) to ./node_modules/@prisma/
client in 34ms
```

With this change, we're going to start experiencing some TypeScript errors in our project because you can no longer create a `joke` without a `jokesterId` value.

💿 Let's start by fixing our `prisma/seed.ts` file.

```ts filename=prisma/seed.ts lines=[5-12,15-16]
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function seed() {
  const kody = await db.user.create({
    data: {
      username: "kody",
      // this is a hashed version of "twixrox"
      passwordHash:
        "$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1u",
    },
  });
  await Promise.all(
    getJokes().map((joke) => {
      const data = { jokesterId: kody.id, ...joke };
      return db.joke.create({ data });
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

💿 Great, now run the seed again:

```sh
npx prisma db seed
```

And that outputs:

```
Environment variables loaded from .env
Running seed command `node --require esbuild-register prisma/seed.ts` ...

🌱  The seed command has been executed.
```

Great! Our database is now ready to go.

### Auth Flow Overview

So our authentication will be of the traditional username/password variety. We'll be using [`bcryptjs`](https://npm.im/bcryptjs) to hash our passwords so nobody will be able to reasonably brute-force their way into an account.

💿 Go ahead and get that installed right now so we don't forget:

```sh
npm install bcryptjs
```

💿 The `bcryptjs` library has TypeScript definitions in DefinitelyTyped, so let's install those as well:

```sh
npm install --save-dev @types/bcryptjs
```

Let me give you a quick diagram of the flow of things:

![Excalidraw Authentication diagram](/jokes-tutorial/img/auth-flow.png)

Here's that written out:

- On the `/login` route.
- User submits login form.
- Form data is validated.
  - If the form data is invalid, return the form with the errors.
- Login type is "register"
  - Check whether the username is available
    - If the username is not available, return the form with an error.
  - Hash the password
  - Create a new user
- Login type is "login"
  - Check whether the user exists
    - If the user doesn't exist, return the form with an error.
  - Check whether the password hash matches
    - If the password hash doesn't match, return the form with an error.
- Create a new session
- Redirect to the `/jokes` route with the `Set-Cookie` header.

### Build the login form

Alright, enough high-level stuff. Let's start writing some Remix code!

We're going to create a login page, and I've got some CSS for you to use on that page:

<details>

<summary>💿 Copy this CSS into `app/styles/login.css`</summary>

```css
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
  padding: 1rem;
  background-color: hsl(0, 0%, 100%);
  border-radius: 5px;
  box-shadow: 0 0.2rem 1rem rgba(0, 0, 0, 0.5);
  width: 400px;
  max-width: 100%;
}

@media print, (min-width: 640px) {
  .content {
    padding: 2rem;
    border-radius: 8px;
  }
}

h1 {
  margin-top: 0;
}

fieldset {
  display: flex;
  justify-content: center;
}

fieldset > :not(:last-child) {
  margin-right: 2rem;
}

.links ul {
  margin-top: 1rem;
  padding: 0;
  list-style: none;
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.links a:hover {
  text-decoration-style: wavy;
  text-decoration-thickness: 1px;
}
```

</details>

💿 Create a `/login` route by adding a `app/routes/login.tsx` file.

<details>

<summary>app/routes/login.tsx</summary>

```tsx filename=app/routes/login.tsx
import type { LinksFunction } from "remix";
import { Link, useSearchParams } from "remix";

import stylesUrl from "../styles/login.css";

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export default function Login() {
  const [searchParams] = useSearchParams();
  return (
    <div className="container">
      <div className="content" data-light="">
        <h1>Login</h1>
        <form method="post">
          <input
            type="hidden"
            name="redirectTo"
            value={
              searchParams.get("redirectTo") ?? undefined
            }
          />
          <fieldset>
            <legend className="sr-only">
              Login or Register?
            </legend>
            <label>
              <input
                type="radio"
                name="loginType"
                value="login"
                defaultChecked
              />{" "}
              Login
            </label>
            <label>
              <input
                type="radio"
                name="loginType"
                value="register"
              />{" "}
              Register
            </label>
          </fieldset>
          <div>
            <label htmlFor="username-input">Username</label>
            <input
              type="text"
              id="username-input"
              name="username"
            />
          </div>
          <div>
            <label htmlFor="password-input">Password</label>
            <input
              id="password-input"
              name="password"
              type="password"
            />
          </div>
          <button type="submit" className="button">
            Submit
          </button>
        </form>
      </div>
      <div className="links">
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/jokes">Jokes</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
```

</details>

This should look something like this:

![A login form with a login/register radio button and username/password fields and a submit button](/jokes-tutorial/img/login-route.png)

Notice in my solution I'm using `useSearchParams` to get the `redirectTo` query parameter and putting that in a hidden input. This way our `action` can know where to redirect the user. This will be useful later when we redirect a user to the login page.

Great, now that we've got the UI looking nice, let's add some logic. This will be very similar to the sort of thing we did in the `/jokes/new` route. Fill in as much as you can (validation and stuff) and we'll just leave comments for the parts of the logic we don't have implemented yet (like _actually_ registering/logging in).

💿 Implement validation with an `action` in `app/routes/login.tsx`

<details>

<summary>app/routes/login.tsx</summary>

```tsx filename=app/routes/login.tsx
import type { ActionFunction, LinksFunction } from "remix";
import {
  useActionData,
  json,
  Link,
  useSearchParams,
} from "remix";

import { db } from "~/utils/db.server";
import stylesUrl from "~/styles/login.css";

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

function validateUsername(username: unknown) {
  if (typeof username !== "string" || username.length < 3) {
    return `Usernames must be at least 3 characters long`;
  }
}

function validatePassword(password: unknown) {
  if (typeof password !== "string" || password.length < 6) {
    return `Passwords must be at least 6 characters long`;
  }
}

type ActionData = {
  formError?: string;
  fieldErrors?: {
    username: string | undefined;
    password: string | undefined;
  };
  fields?: {
    loginType: string;
    username: string;
    password: string;
  };
};

const badRequest = (data: ActionData) =>
  json(data, { status: 400 });

export const action: ActionFunction = async ({
  request,
}) => {
  const form = await request.formData();
  const loginType = form.get("loginType");
  const username = form.get("username");
  const password = form.get("password");
  const redirectTo = form.get("redirectTo") || "/jokes";
  if (
    typeof loginType !== "string" ||
    typeof username !== "string" ||
    typeof password !== "string" ||
    typeof redirectTo !== "string"
  ) {
    return badRequest({
      formError: `Form not submitted correctly.`,
    });
  }

  const fields = { loginType, username, password };
  const fieldErrors = {
    username: validateUsername(username),
    password: validatePassword(password),
  };
  if (Object.values(fieldErrors).some(Boolean))
    return badRequest({ fieldErrors, fields });

  switch (loginType) {
    case "login": {
      // login to get the user
      // if there's no user, return the fields and a formError
      // if there is a user, create their session and redirect to /jokes
      return badRequest({
        fields,
        formError: "Not implemented",
      });
    }
    case "register": {
      const userExists = await db.user.findFirst({
        where: { username },
      });
      if (userExists) {
        return badRequest({
          fields,
          formError: `User with username ${username} already exists`,
        });
      }
      // create the user
      // create their session and redirect to /jokes
      return badRequest({
        fields,
        formError: "Not implemented",
      });
    }
    default: {
      return badRequest({
        fields,
        formError: `Login type invalid`,
      });
    }
  }
};

export default function Login() {
  const actionData = useActionData<ActionData>();
  const [searchParams] = useSearchParams();
  return (
    <div className="container">
      <div className="content" data-light="">
        <h1>Login</h1>
        <form method="post">
          <input
            type="hidden"
            name="redirectTo"
            value={
              searchParams.get("redirectTo") ?? undefined
            }
          />
          <fieldset>
            <legend className="sr-only">
              Login or Register?
            </legend>
            <label>
              <input
                type="radio"
                name="loginType"
                value="login"
                defaultChecked={
                  !actionData?.fields?.loginType ||
                  actionData?.fields?.loginType === "login"
                }
              />{" "}
              Login
            </label>
            <label>
              <input
                type="radio"
                name="loginType"
                value="register"
                defaultChecked={
                  actionData?.fields?.loginType ===
                  "register"
                }
              />{" "}
              Register
            </label>
          </fieldset>
          <div>
            <label htmlFor="username-input">Username</label>
            <input
              type="text"
              id="username-input"
              name="username"
              defaultValue={actionData?.fields?.username}
              aria-invalid={Boolean(
                actionData?.fieldErrors?.username
              )}
              aria-errormessage={
                actionData?.fieldErrors?.username
                  ? "username-error"
                  : undefined
              }
            />
            {actionData?.fieldErrors?.username ? (
              <p
                className="form-validation-error"
                role="alert"
                id="username-error"
              >
                {actionData.fieldErrors.username}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="password-input">Password</label>
            <input
              id="password-input"
              name="password"
              defaultValue={actionData?.fields?.password}
              type="password"
              aria-invalid={
                Boolean(
                  actionData?.fieldErrors?.password
                ) || undefined
              }
              aria-errormessage={
                actionData?.fieldErrors?.password
                  ? "password-error"
                  : undefined
              }
            />
            {actionData?.fieldErrors?.password ? (
              <p
                className="form-validation-error"
                role="alert"
                id="password-error"
              >
                {actionData.fieldErrors.password}
              </p>
            ) : null}
          </div>
          <div id="form-error-message">
            {actionData?.formError ? (
              <p
                className="form-validation-error"
                role="alert"
              >
                {actionData.formError}
              </p>
            ) : null}
          </div>
          <button type="submit" className="button">
            Submit
          </button>
        </form>
      </div>
      <div className="links">
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/jokes">Jokes</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
```

</details>

Once you've got that done, your form should look something like this:

![Login form with errors](/jokes-tutorial/img/login-form-with-errors.png)

Sweet! Now it's time for the juicy stuff. Let's start with the `login` side of things. We seed in a user with the username "kody" and the password (hashed) is "twixrox". So we want to implement enough logic that will allow us to login as that user. We're going to put this logic in a separate file called `app/utils/session.server.ts`.

Here's what we need in that file to get started:

- Export a function called `login` that accepts the `username` and `password`
- Queries prisma for a user with the `username`
- If there is no user, return `null`
- Use `bcrypt.compare` to compare the given `password` to the user's `passwordHash`
- If the passwords don't match, return `null`
- If the passwords match, return the user

💿 Create a file called `app/utils/session.server.ts` and implement the above requirements.

<details>

<summary>app/utils/session.server.ts</summary>

```ts filename=app/utils/session.server.ts
import bcrypt from "bcryptjs";

import { db } from "./db.server";

type LoginForm = {
  username: string;
  password: string;
};

export async function login({
  username,
  password,
}: LoginForm) {
  const user = await db.user.findUnique({
    where: { username },
  });
  if (!user) return null;

  const isCorrectPassword = await bcrypt.compare(
    password,
    user.passwordHash
  );
  if (!isCorrectPassword) return null;

  return { id: user.id, username };
}
```

</details>

Great, with that in place, now we can update `app/routes/login.tsx` to use it:

<details>

<summary>app/routes/login.tsx</summary>

```tsx filename=app/routes/login.tsx lines=[4,15-22] nocopy
// ...

import { db } from "~/utils/db.server";
import { login } from "~/utils/session.server";
import stylesUrl from "~/styles/login.css";

// ...

export const action: ActionFunction = async ({
  request,
}) => {
  // ...
  switch (loginType) {
    case "login": {
      const user = await login({ username, password });
      console.log({ user });
      if (!user) {
        return badRequest({
          fields,
          formError: `Username/Password combination is incorrect`,
        });
      }
      // if there is a user, create their session and redirect to /jokes
      return badRequest({
        fields,
        formError: "Not implemented",
      });
    }
    // ...
  }
};

export default function Login() {
  // ...
}
```

</details>

To check our work, I added a `console.log` to `app/routes/login.tsx` after the `login` call.

<docs-info>Remember, `actions` and `loaders` run on the server, so `console.log` calls you put in those you can't see in the browser console. Those will show up in the terminal window you're running your server in.</docs-info>

💿 With that in place, try to login with the username "kody" and the password "twixrox" and check the terminal output. Here's what I get:

```
{
  user: {
    id: '1dc45f54-4061-4d9e-8a6d-28d6df6a8d7f',
    createdAt: 2021-11-21T00:28:52.560Z,
    updatedAt: 2021-11-21T00:28:52.560Z,
    username: 'kody',
    passwordHash: '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1u'
  }
}
```

<docs-warning>If you're having trouble, run `npx prisma studio` to see the database in the browser. It's possible you don't have any data because you forgot to run `npx prisma db seed` (like I did when I was writing this 😅).</docs-warning>

Wahoo! We got the user! Now we need to put that user's ID into the session. We're going to do this in `app/utils/session.server.ts`. Remix has a built-in abstraction to help us with managing several types of storage mechanisms for sessions ([here are the docs](../api/remix#sessions)). We'll be using [`createCookieSessionStorage`](../api/remix#createcookiesessionstorage) as it's the simplest and scales quite well.

💿 Write a `createUserSession` function in `app/utils/session.server.ts` that accepts a user ID and a route to redirect to. It should do the following:

- creates a new session (via the cookie storage `getSession` function)
- sets the `userId` field on the session
- redirects to the given route setting the `Set-Cookie` header (via the cookie storage `commitSession` function)

Note: If you need a hand, there's a small example of how the whole basic flow goes in [the session docs](../api/remix#sessions). Once you have that, you'll want to use it in `app/routes/login.tsx` to set the session and redirect to the `/jokes` route.

<details>

<summary>app/utils/session.server.ts</summary>

```ts filename=app/utils/session.server.ts lines=[3,30-33,35-48,50-61]
import bcrypt from "bcryptjs";
import {
  createCookieSessionStorage,
  redirect,
} from "remix";

import { db } from "./db.server";

type LoginForm = {
  username: string;
  password: string;
};

export async function login({
  username,
  password,
}: LoginForm) {
  const user = await db.user.findUnique({
    where: { username },
  });
  if (!user) return null;
  const isCorrectPassword = await bcrypt.compare(
    password,
    user.passwordHash
  );
  if (!isCorrectPassword) return null;
  return { id: user.id, username };
}

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

const storage = createCookieSessionStorage({
  cookie: {
    name: "RJ_session",
    // normally you want this to be `secure: true`
    // but that doesn't work on localhost for Safari
    // https://web.dev/when-to-use-local-https/
    secure: process.env.NODE_ENV === "production",
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  },
});

export async function createUserSession(
  userId: string,
  redirectTo: string
) {
  const session = await storage.getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}
```

</details>

<details>

<summary>app/routes/login.tsx</summary>

```tsx filename=app/routes/login.tsx nocopy
// ...

export const action: ActionFunction = async ({
  request,
}) => {
  // ...

  switch (loginType) {
    case "login": {
      const user = await login({ username, password });

      if (!user) {
        return badRequest({
          fields,
          formError: `Username/Password combination is incorrect`,
        });
      }
      return createUserSession(user.id, redirectTo);
    }

    // ...
  }
};

// ...
```

</details>

I want to call out the `SESSION_SECRET` environment variable I'm using really quick. The value of the `secrets` option is not the sort of thing you want in your code because the baddies could use it for their nefarious purposes. So instead we are going to read the value from the environment. This means you'll need to set the environment variable in your `.env` file. Incidentally, prisma loads that file for us automatically so all we need to do is make sure we set that value when we deploy to production (alternatively, during development we could use [dotenv](https://npm.im/dotenv) to load that when our app boots up).

💿 Update .env file with SESSION_SECRET (with any value you like).

With that, pop open your [Network tab](https://developer.chrome.com/docs/devtools/network/reference/), go to [`/login`](http://localhost:3000/login) and enter `kody` and `twixrox` and check the response headers in the network tab. Should look something like this:

![DevTools Network tab showing a "Set-Cookie" header on the POST response](/jokes-tutorial/img/network-tab-set-cookie.png)

And if you check the cookies section of the [Application tab](https://developer.chrome.com/docs/devtools/storage/cookies/) then you should have the cookie set in there as well.

![DevTools Application tab showing ](/jokes-tutorial/img/application-tab-cookies.png)

And now every request the browser makes to our server will include that cookie (we don't have to do anything on the client, [this is how cookies work](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)):

![Request headers showing the Cookie](/jokes-tutorial/img/cookie-header-on-request.png)

So we can now check whether the user is authenticated on the server by reading that header to get the `userId` we had set into it. To test this out, let's fix the `/jokes/new` route by adding the `jokesterId` field to `db.joke.create` call.

<docs-info>Remember to check [the docs](../api/remix#sessions) to learn how to get the session from the request</docs-info>

💿 Update `app/utils/session.server.ts` to get the `userId` from the session. In my solution I create three functions: `getUserSession(request: Request)`, `getUserId(request: Request)` and `requireUserId(request: Request, redirectTo: string)`.

<details>

<summary>app/utils/session.server.ts</summary>

```ts filename=app/utils/session.server.ts lines=[50-52,54-59,61-74]
import bcrypt from "bcryptjs";
import {
  createCookieSessionStorage,
  redirect,
} from "remix";

import { db } from "./db.server";

type LoginForm = {
  username: string;
  password: string;
};

export async function login({
  username,
  password,
}: LoginForm) {
  const user = await db.user.findUnique({
    where: { username },
  });
  if (!user) return null;
  const isCorrectPassword = await bcrypt.compare(
    password,
    user.passwordHash
  );
  if (!isCorrectPassword) return null;
  return { id: user.id, username };
}

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

const storage = createCookieSessionStorage({
  cookie: {
    name: "RJ_session",
    // normally you want this to be `secure: true`
    // but that doesn't work on localhost for Safari
    // https://web.dev/when-to-use-local-https/
    secure: process.env.NODE_ENV === "production",
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  },
});

function getUserSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}

export async function getUserId(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") return null;
  return userId;
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") {
    const searchParams = new URLSearchParams([
      ["redirectTo", redirectTo],
    ]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

export async function createUserSession(
  userId: string,
  redirectTo: string
) {
  const session = await storage.getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}
```

</details>

<docs-info>Did you notice in my example that we're `throw`ing a `Response`?!</docs-info>

In my example, I created a `requireUserId` which will throw a `redirect`. Remember `redirect` is a utility function that returns a [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) object. Remix will catch that thrown response and send it back to the client. It's a great way to "exit early" in abstractions like this so users of our `requireUserId` function can just assume that the return will always give us the `userId` and don't need to worry about what happens if there isn't a `userId` because the response is thrown which stops their code execution!

We'll cover this more in the error handling sections later.

You may also notice that our solution makes use of the `login` route's `redirectTo` feature we had earlier.

💿 Now update `app/routes/jokes/new.tsx` to use that function to get the userId and pass it to the `db.joke.create` call.

<details>

<summary>app/routes/jokes/new.tsx</summary>

```tsx filename=app/routes/jokes/new.tsx lines=[5,37,60]
import type { ActionFunction } from "remix";
import { useActionData, redirect, json } from "remix";

import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";

function validateJokeContent(content: string) {
  if (content.length < 10) {
    return `That joke is too short`;
  }
}

function validateJokeName(name: string) {
  if (name.length < 3) {
    return `That joke's name is too short`;
  }
}

type ActionData = {
  formError?: string;
  fieldErrors?: {
    name: string | undefined;
    content: string | undefined;
  };
  fields?: {
    name: string;
    content: string;
  };
};

const badRequest = (data: ActionData) =>
  json(data, { status: 400 });

export const action: ActionFunction = async ({
  request,
}) => {
  const userId = await requireUserId(request);
  const form = await request.formData();
  const name = form.get("name");
  const content = form.get("content");
  if (
    typeof name !== "string" ||
    typeof content !== "string"
  ) {
    return badRequest({
      formError: `Form not submitted correctly.`,
    });
  }

  const fieldErrors = {
    name: validateJokeName(name),
    content: validateJokeContent(content),
  };
  const fields = { name, content };
  if (Object.values(fieldErrors).some(Boolean)) {
    return badRequest({ fieldErrors, fields });
  }

  const joke = await db.joke.create({
    data: { ...fields, jokesterId: userId },
  });
  return redirect(`/jokes/${joke.id}`);
};

export default function NewJokeRoute() {
  const actionData = useActionData<ActionData>();

  return (
    <div>
      <p>Add your own hilarious joke</p>
      <form method="post">
        <div>
          <label>
            Name:{" "}
            <input
              type="text"
              defaultValue={actionData?.fields?.name}
              name="name"
              aria-invalid={
                Boolean(actionData?.fieldErrors?.name) ||
                undefined
              }
              aria-errormessage={
                actionData?.fieldErrors?.name
                  ? "name-error"
                  : undefined
              }
            />
          </label>
          {actionData?.fieldErrors?.name ? (
            <p
              className="form-validation-error"
              role="alert"
              id="name-error"
            >
              {actionData.fieldErrors.name}
            </p>
          ) : null}
        </div>
        <div>
          <label>
            Content:{" "}
            <textarea
              defaultValue={actionData?.fields?.content}
              name="content"
              aria-invalid={
                Boolean(actionData?.fieldErrors?.content) ||
                undefined
              }
              aria-errormessage={
                actionData?.fieldErrors?.content
                  ? "content-error"
                  : undefined
              }
            />
          </label>
          {actionData?.fieldErrors?.content ? (
            <p
              className="form-validation-error"
              role="alert"
              id="content-error"
            >
              {actionData.fieldErrors.content}
            </p>
          ) : null}
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

Super! So now if a user attempts to create a new joke, they'll be redirected to the login page because a `userId` is required to create a new joke.

### Build Logout Action

We should probably give people the ability to see that they're logged in and a way to log out right? Yeah, I think so. Let's implement that.

💿 Update `app/utils/session.server.ts` to add a `getUser` function that gets the user from prisma and a `logout` function that uses [`destroySession`](../api/remix#using-sessions) to log the user out.

<details>

<summary>app/utils/session.server.ts</summary>

```ts filename=app/utils/session.server.ts lines=[76-91,93-100]
import bcrypt from "bcryptjs";
import {
  createCookieSessionStorage,
  redirect,
} from "remix";

import { db } from "./db.server";

type LoginForm = {
  username: string;
  password: string;
};

export async function login({
  username,
  password,
}: LoginForm) {
  const user = await db.user.findUnique({
    where: { username },
  });
  if (!user) return null;
  const isCorrectPassword = await bcrypt.compare(
    password,
    user.passwordHash
  );
  if (!isCorrectPassword) return null;
  return { id: user.id, username };
}

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

const storage = createCookieSessionStorage({
  cookie: {
    name: "RJ_session",
    // normally you want this to be `secure: true`
    // but that doesn't work on localhost for Safari
    // https://web.dev/when-to-use-local-https/
    secure: process.env.NODE_ENV === "production",
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  },
});

function getUserSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}

export async function getUserId(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") return null;
  return userId;
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") {
    const searchParams = new URLSearchParams([
      ["redirectTo", redirectTo],
    ]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

export async function getUser(request: Request) {
  const userId = await getUserId(request);
  if (typeof userId !== "string") {
    return null;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });
    return user;
  } catch {
    throw logout(request);
  }
}

export async function logout(request: Request) {
  const session = await getUserSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await storage.destroySession(session),
    },
  });
}

export async function createUserSession(
  userId: string,
  redirectTo: string
) {
  const session = await storage.getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}
```

</details>

💿 Great, now we're going to update the `app/routes/jokes.tsx` route so we can display a login link if the user isn't logged in. If they are logged in then we'll display their username and a logout form. I'm also going to clean up the UI a bit to match the class names we've got as well, so feel free to copy/paste the example when you're ready.

<details>

<summary>app/routes/jokes.tsx</summary>

```tsx filename=app/routes/jokes.tsx lines=[6,14,30,52-63]
import type { User } from "@prisma/client";
import type { LinksFunction, LoaderFunction } from "remix";
import { Link, Outlet, useLoaderData } from "remix";

import { db } from "~/utils/db.server";
import { getUser } from "~/utils/session.server";
import stylesUrl from "~/styles/jokes.css";

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

type LoaderData = {
  user: Awaited<ReturnType<typeof getUser>>;
  jokeListItems: Array<{ id: string; name: string }>;
};

export const loader: LoaderFunction = async ({
  request,
}) => {
  const jokeListItems = await db.joke.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });
  const user = await getUser(request);

  const data: LoaderData = {
    jokeListItems,
    user,
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
          {data.user ? (
            <div className="user-info">
              <span>{`Hi ${data.user.username}`}</span>
              <form action="/logout" method="post">
                <button type="submit" className="button">
                  Logout
                </button>
              </form>
            </div>
          ) : (
            <Link to="/login">Login</Link>
          )}
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

<details>

<summary>app/routes/logout.tsx</summary>

```tsx filename=app/routes/logout.tsx
import type { ActionFunction, LoaderFunction } from "remix";
import { redirect } from "remix";

import { logout } from "~/utils/session.server";

export const action: ActionFunction = async ({
  request,
}) => {
  return logout(request);
};

export const loader: LoaderFunction = async () => {
  return redirect("/");
};
```

</details>

Hopefully getting the user in the loader and rendering them in the component was pretty straightforward. There are a few things I want to call out about other parts of my version of the code before we continue.

First, the new `logout` route is just there to make it easy for us to logout. The reason that we're using an action (rather than a loader) is because we want to avoid [CSRF](https://developer.mozilla.org/en-US/docs/Glossary/CSRF) problems by using a POST request rather than a GET request. This is why the logout button is a form and not a link. Additionally, Remix will only re-call our loaders when we perform an `action`, so if we used a `loader` then the cache would not get invalidated. The `loader` is just there in case someone somehow lands on that page, we'll just redirect them back home.

```tsx
<Link to="new" className="button">
  Add your own
</Link>
```

Notice that the `to` prop is set to "new" without any `/`. This is the benefit of nested routing. You don't have to construct the entire URL. It can be relative. This is the same thing for the `<Link to=".">Get a random joke</Link>` link which will effectively tell Remix to reload the data for the current route.

Terrific, now our app looks like this:

![Jokes page nice and designed](/jokes-tutorial/img/random-joke-designed.png)

![New Joke form designed](/jokes-tutorial/img/new-joke-designed.png)

### User Registration

I suppose now would be a good time to add support for user registration! Did you forget like I did? 😅 Well, let's get that bit added before moving on.

Luckily, all we need to do to support this is to update `app/utils/session.server.ts` with a `register` function that's pretty similar to our `login` function. The difference here is that we need to use `bcrypt.hash` to hash the password before we store it in the database. Then update the `register` case in our `app/routes/login.tsx` route to handle the registration.

💿 Update both `app/utils/session.server.ts` and `app/routes/login.tsx` to handle user registration.

<details>

<summary>app/utils/session.server.ts</summary>

```tsx filename=app/utils/session.server.ts lines=[14-23]
import bcrypt from "bcryptjs";
import {
  createCookieSessionStorage,
  redirect,
} from "remix";

import { db } from "./db.server";

type LoginForm = {
  username: string;
  password: string;
};

export async function register({
  username,
  password,
}: LoginForm) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: { username, passwordHash },
  });
  return { id: user.id, username };
}

export async function login({
  username,
  password,
}: LoginForm) {
  const user = await db.user.findUnique({
    where: { username },
  });
  if (!user) return null;
  const isCorrectPassword = await bcrypt.compare(
    password,
    user.passwordHash
  );
  if (!isCorrectPassword) return null;
  return { id: user.id, username };
}

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

const storage = createCookieSessionStorage({
  cookie: {
    name: "RJ_session",
    // normally you want this to be `secure: true`
    // but that doesn't work on localhost for Safari
    // https://web.dev/when-to-use-local-https/
    secure: process.env.NODE_ENV === "production",
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  },
});

function getUserSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}

export async function getUserId(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") return null;
  return userId;
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") {
    const searchParams = new URLSearchParams([
      ["redirectTo", redirectTo],
    ]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

export async function getUser(request: Request) {
  const userId = await getUserId(request);
  if (typeof userId !== "string") {
    return null;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });
    return user;
  } catch {
    throw logout(request);
  }
}

export async function logout(request: Request) {
  const session = await getUserSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await storage.destroySession(session),
    },
  });
}

export async function createUserSession(
  userId: string,
  redirectTo: string
) {
  const session = await storage.getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}
```

</details>

<details>

<summary>app/routes/login.tsx</summary>

```tsx filename=app/routes/login.tsx lines=[13,97-103]
import type { ActionFunction, LinksFunction } from "remix";
import {
  useActionData,
  json,
  useSearchParams,
  Link,
} from "remix";

import { db } from "~/utils/db.server";
import {
  createUserSession,
  login,
  register,
} from "~/utils/session.server";
import stylesUrl from "~/styles/login.css";

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

function validateUsername(username: unknown) {
  if (typeof username !== "string" || username.length < 3) {
    return `Usernames must be at least 3 characters long`;
  }
}

function validatePassword(password: unknown) {
  if (typeof password !== "string" || password.length < 6) {
    return `Passwords must be at least 6 characters long`;
  }
}

type ActionData = {
  formError?: string;
  fieldErrors?: {
    username: string | undefined;
    password: string | undefined;
  };
  fields?: {
    loginType: string;
    username: string;
    password: string;
  };
};

const badRequest = (data: ActionData) =>
  json(data, { status: 400 });

export const action: ActionFunction = async ({
  request,
}) => {
  const form = await request.formData();
  const loginType = form.get("loginType");
  const username = form.get("username");
  const password = form.get("password");
  const redirectTo = form.get("redirectTo") || "/jokes";
  if (
    typeof loginType !== "string" ||
    typeof username !== "string" ||
    typeof password !== "string" ||
    typeof redirectTo !== "string"
  ) {
    return badRequest({
      formError: `Form not submitted correctly.`,
    });
  }

  const fields = { loginType, username, password };
  const fieldErrors = {
    username: validateUsername(username),
    password: validatePassword(password),
  };
  if (Object.values(fieldErrors).some(Boolean))
    return badRequest({ fieldErrors, fields });

  switch (loginType) {
    case "login": {
      const user = await login({ username, password });
      if (!user) {
        return badRequest({
          fields,
          formError: `Username/Password combination is incorrect`,
        });
      }
      return createUserSession(user.id, redirectTo);
    }
    case "register": {
      const userExists = await db.user.findFirst({
        where: { username },
      });
      if (userExists) {
        return badRequest({
          fields,
          formError: `User with username ${username} already exists`,
        });
      }
      const user = await register({ username, password });
      if (!user) {
        return badRequest({
          fields,
          formError: `Something went wrong trying to create a new user.`,
        });
      }
      return createUserSession(user.id, redirectTo);
    }
    default: {
      return badRequest({
        fields,
        formError: `Login type invalid`,
      });
    }
  }
};

export default function Login() {
  const actionData = useActionData<ActionData>();
  const [searchParams] = useSearchParams();
  return (
    <div className="container">
      <div className="content" data-light="">
        <h1>Login</h1>
        <form method="post">
          <input
            type="hidden"
            name="redirectTo"
            value={
              searchParams.get("redirectTo") ?? undefined
            }
          />
          <fieldset>
            <legend className="sr-only">
              Login or Register?
            </legend>
            <label>
              <input
                type="radio"
                name="loginType"
                value="login"
                defaultChecked={
                  !actionData?.fields?.loginType ||
                  actionData?.fields?.loginType === "login"
                }
              />{" "}
              Login
            </label>
            <label>
              <input
                type="radio"
                name="loginType"
                value="register"
                defaultChecked={
                  actionData?.fields?.loginType ===
                  "register"
                }
              />{" "}
              Register
            </label>
          </fieldset>
          <div>
            <label htmlFor="username-input">Username</label>
            <input
              type="text"
              id="username-input"
              name="username"
              defaultValue={actionData?.fields?.username}
              aria-invalid={Boolean(
                actionData?.fieldErrors?.username
              )}
              aria-errormessage={
                actionData?.fieldErrors?.username
                  ? "username-error"
                  : undefined
              }
            />
            {actionData?.fieldErrors?.username ? (
              <p
                className="form-validation-error"
                role="alert"
                id="username-error"
              >
                {actionData.fieldErrors.username}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="password-input">Password</label>
            <input
              id="password-input"
              name="password"
              defaultValue={actionData?.fields?.password}
              type="password"
              aria-invalid={
                Boolean(
                  actionData?.fieldErrors?.password
                ) || undefined
              }
              aria-errormessage={
                actionData?.fieldErrors?.password
                  ? "password-error"
                  : undefined
              }
            />
            {actionData?.fieldErrors?.password ? (
              <p
                className="form-validation-error"
                role="alert"
                id="password-error"
              >
                {actionData.fieldErrors.password}
              </p>
            ) : null}
          </div>
          <div id="form-error-message">
            {actionData?.formError ? (
              <p
                className="form-validation-error"
                role="alert"
              >
                {actionData.formError}
              </p>
            ) : null}
          </div>
          <button type="submit" className="button">
            Submit
          </button>
        </form>
      </div>
      <div className="links">
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/jokes">Jokes</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
```

</details>

Phew, there we go. Now users can register for a new account!