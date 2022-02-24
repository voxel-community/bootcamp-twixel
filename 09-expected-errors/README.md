## Expected errors

Sometimes users do things we can anticipate. I'm not talking about validation necessarily. I'm talking about things like whether the user's authenticated (status `401`) or authorized (status `403`) to do what they're trying to do. Or maybe they're looking for something that isn't there (status `404`).

It might help to think of the unexpected errors as 500-level errors ([server errors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#server_error_responses)) and the expected errors as 400-level errors ([client errors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#client_error_responses)).

For client error responses, Remix offers something similar to Error Boundaries. It's called [`Catch Boundaries`](../api/conventions#catchboundary) and it works almost exactly the same. In this case, when your server code detects a problem, it'll throw a [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) object. Remix then catches that thrown response and renders your `CatchBoundary`. Just like the `useLoaderData` hook to get data from the `loader` and the `useActionData` hook to get data from the `action`, the `CatchBoundary` gets its data from the `useCatch` hook. This will return the `Response` that was thrown.

One last thing, this isn't for form validations and stuff. We already discussed that earlier with `useActionData`. This is just for situations where the user did something that means we can't reasonably render our default component so we want to render something else instead.

<docs-info>`ErrorBoundary` and `CatchBoundary` allow our default exports to represent the "happy path" and not worry about errors. If the default component is rendered, then we can assume all is right with the world.</docs-info>

With that understanding, we're going to add a `CatchBoundary` component to the following routes:

- `app/root.tsx` - Just as a last resort fallback.
- `app/routes/jokes/$jokeId.tsx` - When a user tries to access a joke that doesn't exist (404).
- `app/routes/jokes/new.tsx` - When a user tries to go to this page without being authenticated (401). Right now they'll just get redirected to the login if they try to submit it without authenticating. That would be super annoying to spend time writing a joke only to get redirected. Rather than inexplicably redirecting them, we could render a message that says they need to authenticate first.
- `app/routes/jokes/index.tsx` - If there are no jokes in the database then a random joke is 404-not found. (simulate this by deleting the `prisma/dev.db` and running `npx prisma db push`. Don't forget to run `npx prisma db seed` afterwards to get your seed data back.)

💿 Let's add these CatchBoundaries to the routes.

<details>

<summary>app/root.tsx</summary>

```tsx filename=app/root.tsx lines=[2,57-71]
import type { LinksFunction } from "remix";
import { Links, LiveReload, Outlet, useCatch } from "remix";

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

```tsx filename=app/routes/jokes/$jokeId.tsx lines=[5,20-24,41-52]
import type { LoaderFunction } from "remix";
import {
  Link,
  useLoaderData,
  useCatch,
  useParams,
} from "remix";
import type { Joke } from "@prisma/client";

import { db } from "~/utils/db.server";

type LoaderData = { joke: Joke };

export const loader: LoaderFunction = async ({
  params,
}) => {
  const joke = await db.joke.findUnique({
    where: { id: params.jokeId },
  });
  if (!joke) {
    throw new Response("What a joke! Not found.", {
      status: 404,
    });
  }
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

export function CatchBoundary() {
  const caught = useCatch();
  const params = useParams();
  if (caught.status === 404) {
    return (
      <div className="error-container">
        Huh? What the heck is "{params.jokeId}"?
      </div>
    );
  }
  throw new Error(`Unhandled error: ${caught.status}`);
}

export function ErrorBoundary() {
  const { jokeId } = useParams();
  return (
    <div className="error-container">{`There was an error loading joke by the id ${jokeId}. Sorry.`}</div>
  );
}
```

</details>

<details>

<summary>app/routes/jokes/index.tsx</summary>

```tsx filename=app/routes/jokes/index.tsx lines=[2,16-20,39-52]
import type { LoaderFunction } from "remix";
import { useLoaderData, Link, useCatch } from "remix";
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
  if (!randomJoke) {
    throw new Response("No random joke found", {
      status: 404,
    });
  }
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

export function CatchBoundary() {
  const caught = useCatch();

  if (caught.status === 404) {
    return (
      <div className="error-container">
        There are no jokes to display.
      </div>
    );
  }
  throw new Error(
    `Unexpected caught response with status: ${caught.status}`
  );
}

export function ErrorBoundary() {
  return (
    <div className="error-container">
      I did a whoopsies.
    </div>
  );
}
```

</details>

<details>

<summary>app/routes/jokes/new.tsx</summary>

```tsx filename=app/routes/jokes/new.tsx lines=[6,16-24,156-167]
import type { ActionFunction, LoaderFunction } from "remix";
import {
  useActionData,
  redirect,
  json,
  useCatch,
  Link,
} from "remix";

import { db } from "~/utils/db.server";
import {
  requireUserId,
  getUserId,
} from "~/utils/session.server";

export const loader: LoaderFunction = async ({
  request,
}) => {
  const userId = await getUserId(request);
  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return {};
};

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

export function CatchBoundary() {
  const caught = useCatch();

  if (caught.status === 401) {
    return (
      <div className="error-container">
        <p>You must be logged in to create a joke.</p>
        <Link to="/login">Login</Link>
      </div>
    );
  }
}

export function ErrorBoundary() {
  return (
    <div className="error-container">
      Something unexpected went wrong. Sorry about that.
    </div>
  );
}
```

</details>

Here's what I've got with that:

![App 400 Bad Request](/jokes-tutorial/img/app-400.png)

![A 404 on the joke page](/jokes-tutorial/img/joke-404.png)

![A 404 on the random joke page](/jokes-tutorial/img/jokes-404.png)

![A 401 on the new joke page](/jokes-tutorial/img/new-joke-401.png)

Awesome! We're ready to handle errors and it didn't complicate our happy path one bit! 🎉

Oh, and don't you love how just like with the `ErrorBoundary`, it's all contextual? So the rest of the app continues to function just as well. Another point for user experience 💪

You know what, while we're adding catch boundaries. Why don't we improve the `app/routes/jokes/$jokeId.tsx` route a bit by allowing users to delete the joke if they own it. If they don't, we can give them a 401 error in the catch boundary.

One thing to keep in mind with `delete` is that HTML forms only support `method="get"` and `method="post"`. They don't support `method="delete"`. So to make sure our form will work with and without JavaScript, it's a good idea to do something like this:

```tsx
<form method="post">
  <input type="hidden" name="_method" value="delete" />
  <button type="submit">Delete</button>
</form>
```

And then the `action` can determine whether the intention is to delete based on the `request.formData().get('_method')`.

💿 Add a delete capability to `app/routes/jokes/$jokeId.tsx` route.

<details>

<summary>app/routes/jokes/$jokeId.tsx</summary>

```tsx filename=app/routes/jokes/$jokeId.tsx lines=[2,7,12,31-61,71-80,89-95,103-109]
import type { Joke } from "@prisma/client";
import type { ActionFunction, LoaderFunction } from "remix";
import {
  Link,
  useLoaderData,
  useCatch,
  redirect,
  useParams,
} from "remix";

import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";

type LoaderData = { joke: Joke };

export const loader: LoaderFunction = async ({
  params,
}) => {
  const joke = await db.joke.findUnique({
    where: { id: params.jokeId },
  });
  if (!joke) {
    throw new Response("What a joke! Not found.", {
      status: 404,
    });
  }
  const data: LoaderData = { joke };
  return data;
};

export const action: ActionFunction = async ({
  request,
  params,
}) => {
  const form = await request.formData();
  if (form.get("_method") !== "delete") {
    throw new Response(
      `The _method ${form.get("_method")} is not supported`,
      { status: 400 }
    );
  }
  const userId = await requireUserId(request);
  const joke = await db.joke.findUnique({
    where: { id: params.jokeId },
  });
  if (!joke) {
    throw new Response("Can't delete what does not exist", {
      status: 404,
    });
  }
  if (joke.jokesterId !== userId) {
    throw new Response(
      "Pssh, nice try. That's not your joke",
      {
        status: 401,
      }
    );
  }
  await db.joke.delete({ where: { id: params.jokeId } });
  return redirect("/jokes");
};

export default function JokeRoute() {
  const data = useLoaderData<LoaderData>();

  return (
    <div>
      <p>Here's your hilarious joke:</p>
      <p>{data.joke.content}</p>
      <Link to=".">{data.joke.name} Permalink</Link>
      <form method="post">
        <input
          type="hidden"
          name="_method"
          value="delete"
        />
        <button type="submit" className="button">
          Delete
        </button>
      </form>
    </div>
  );
}

export function CatchBoundary() {
  const caught = useCatch();
  const params = useParams();
  switch (caught.status) {
    case 400: {
      return (
        <div className="error-container">
          What you're trying to do is not allowed.
        </div>
      );
    }
    case 404: {
      return (
        <div className="error-container">
          Huh? What the heck is {params.jokeId}?
        </div>
      );
    }
    case 401: {
      return (
        <div className="error-container">
          Sorry, but {params.jokeId} is not your joke.
        </div>
      );
    }
    default: {
      throw new Error(`Unhandled error: ${caught.status}`);
    }
  }
}

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);
  const { jokeId } = useParams();
  return (
    <div className="error-container">{`There was an error loading joke by the id ${jokeId}. Sorry.`}</div>
  );
}
```

</details>

Now that people will get a proper error message if they try to delete a joke that is not theirs, maybe we could also simply hide the delete button if the user doesn't own the joke.

<details>

<summary>app/routes/jokes/$jokeId.tsx</summary>

```tsx filename=app/routes/jokes/$jokeId.tsx lines=[13,17,23,34,79-90]
import type { Joke } from "@prisma/client";
import type { ActionFunction, LoaderFunction } from "remix";
import {
  Link,
  useLoaderData,
  useCatch,
  redirect,
  useParams,
} from "remix";

import { db } from "~/utils/db.server";
import {
  getUserId,
  requireUserId,
} from "~/utils/session.server";

type LoaderData = { joke: Joke; isOwner: boolean };

export const loader: LoaderFunction = async ({
  request,
  params,
}) => {
  const userId = await getUserId(request);
  const joke = await db.joke.findUnique({
    where: { id: params.jokeId },
  });
  if (!joke) {
    throw new Response("What a joke! Not found.", {
      status: 404,
    });
  }
  const data: LoaderData = {
    joke,
    isOwner: userId === joke.jokesterId,
  };
  return data;
};

export const action: ActionFunction = async ({
  request,
  params,
}) => {
  const form = await request.formData();
  if (form.get("_method") !== "delete") {
    throw new Response(
      `The _method ${form.get("_method")} is not supported`,
      { status: 400 }
    );
  }
  const userId = await requireUserId(request);
  const joke = await db.joke.findUnique({
    where: { id: params.jokeId },
  });
  if (!joke) {
    throw new Response("Can't delete what does not exist", {
      status: 404,
    });
  }
  if (joke.jokesterId !== userId) {
    throw new Response(
      "Pssh, nice try. That's not your joke",
      {
        status: 401,
      }
    );
  }
  await db.joke.delete({ where: { id: params.jokeId } });
  return redirect("/jokes");
};

export default function JokeRoute() {
  const data = useLoaderData<LoaderData>();

  return (
    <div>
      <p>Here's your hilarious joke:</p>
      <p>{data.joke.content}</p>
      <Link to=".">{data.joke.name} Permalink</Link>
      {data.isOwner ? (
        <form method="post">
          <input
            type="hidden"
            name="_method"
            value="delete"
          />
          <button type="submit" className="button">
            Delete
          </button>
        </form>
      ) : null}
    </div>
  );
}

export function CatchBoundary() {
  const caught = useCatch();
  const params = useParams();
  switch (caught.status) {
    case 400: {
      return (
        <div className="error-container">
          What you're trying to do is not allowed.
        </div>
      );
    }
    case 404: {
      return (
        <div className="error-container">
          Huh? What the heck is {params.jokeId}?
        </div>
      );
    }
    case 401: {
      return (
        <div className="error-container">
          Sorry, but {params.jokeId} is not your joke.
        </div>
      );
    }
    default: {
      throw new Error(`Unhandled error: ${caught.status}`);
    }
  }
}

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);

  const { jokeId } = useParams();
  return (
    <div className="error-container">{`There was an error loading joke by the id ${jokeId}. Sorry.`}</div>
  );
}
```

</details>