## SEO con Meta tags

| Capitolo precedente  | Capitolo successivo     |
| :--------------- | ---------------: |
| [◀︎ 08-expected-errors](../08-expected-errors)| [10-resource-routes ▶︎](../10-resource-routes) |


I Meta tag sono utili per il SEO (_Search Engine Optimization_ - il processo di rendere i siti ottimizzati per i motori di ricerca) e i social media. La parte un po' tricky è che spesso i dati che servono sono contenutinei componenti che richiedono o utilizzano il dato.

Per questo motivo Remix ha sviluppato un export [`meta`](../api/conventions#meta) che andremo ad aggiungere ai seguenti file: 

- `app/routes/index.tsx`
- `app/routes/login.tsx`
- `app/routes/twixes/$twixId.tsx`

Ma prima di iniziare ricorda che i tag devono essere renderizzati nella parte `<head>` di un `<html>`. Per fare questo Remix ci fornosce un componente [`<Meta />`](../api/remix#meta-links-scripts).

💿 Aggiungi il comeponente `<Meta />` al file `app/root.tsx` e aggiungi l'export `meta` nelle pagine che abbiamo elencato sopra. Il componente `<Meta />` ha bisogno di essere posizionato sopra al tag `<title>`.

<details>

<summary>app/root.tsx</summary>

```tsx filename=app/root.tsx lines=[1,7,33-45,58]
import type { LinksFunction, MetaFunction } from "remix";
import {
  Links,
  LiveReload,
  Outlet,
  useCatch,
  Meta,
} from "remix";

export const meta: MetaFunction = () => {
  const description = `Il mio primo sito in Remix fatto durante il Voxel Bootcamp! @voxelcommunity`;
  return {
    description,
    keywords: "Remix,twixes",
    "twitter:image": "https://remix-twixes.lol/social.png",
    "twitter:card": "summary_large_image",
    "twitter:creator": "@remix_run",
    "twitter:site": "@remix_run",
    "twitter:title": "Remix Twixes",
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

<summary>app/routes/index.tsx</summary>

```tsx filename=app/routes/index.tsx lines=[1,10-14]
import type { LinksFunction, MetaFunction } from "remix";
import { Link } from "remix";

import stylesUrl from "~/styles/index.css";

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export const meta: MetaFunction = () => ({
  title: "Remix: So great, it's funny!",
  description:
    "Remix twixes app. Learn Remix and laugh at the same time!",
});

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
              <Link to="twixes">Read Twixes</Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
```

</details>

<details>

<summary>app/routes/login.tsx</summary>

```tsx filename=app/routes/login.tsx lines=[4,25-31]
import type {
  ActionFunction,
  LinksFunction,
  MetaFunction,
} from "remix";
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

export const meta: MetaFunction = () => {
  return {
    title: "Remix Twixes | Login",
    description:
      "Login to submit your own twixes to Remix Twixes!",
  };
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
  const redirectTo = form.get("redirectTo") || "/twixes";
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
            <Link to="/twixes">Twixes</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
```

</details>

<details>

<summary>app/routes/twixes/$twixId.tsx</summary>

```tsx filename=app/routes/twixes/$twixId.tsx lines=[4,21-36]
import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "remix";
import {
  Link,
  useLoaderData,
  useCatch,
  redirect,
  useParams,
} from "remix";
import type { Twix } from "@prisma/client";

import { db } from "~/utils/db.server";
import {
  getUserId,
  requireUserId,
} from "~/utils/session.server";

export const meta: MetaFunction = ({
  data,
}: {
  data: LoaderData | undefined;
}) => {
  if (!data) {
    return {
      title: "No twix",
      description: "No twix found",
    };
  }
  return {
    title: `"${data.twix.title}" twix`,
    description: `Enjoy the "${data.twix.title}" twix and much more`,
  };
};

type LoaderData = { twix: Twix; isOwner: boolean };

export const loader: LoaderFunction = async ({
  request,
  params,
}) => {
  const userId = await getUserId(request);
  const twix = await db.twix.findUnique({
    where: { id: params.twixId },
  });
  if (!twix) {
    throw new Response("What a twix! Not found.", {
      status: 404,
    });
  }
  const data: LoaderData = {
    twix,
    isOwner: userId === twix.twixesterId,
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
  const twix = await db.twix.findUnique({
    where: { id: params.twixId },
  });
  if (!twix) {
    throw new Response("Can't delete what does not exist", {
      status: 404,
    });
  }
  if (twix.twixesterId !== userId) {
    throw new Response(
      "Pssh, nice try. That's not your twix",
      {
        status: 401,
      }
    );
  }
  await db.twix.delete({ where: { id: params.twixId } });
  return redirect("/twixes");
};

export default function TwixRoute() {
  const data = useLoaderData<LoaderData>();

  return (
    <div>
      <p>Here's your hilarious twix:</p>
      <p>{data.twix.content}</p>
      <Link to=".">{data.twix.title} Permalink</Link>
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
          Huh? What the heck is {params.twixId}?
        </div>
      );
    }
    case 401: {
      return (
        <div className="error-container">
          Sorry, but {params.twixId} is not your twix.
        </div>
      );
    }
    default: {
      throw new Error(`Unhandled error: ${caught.status}`);
    }
  }
}

export function ErrorBoundary() {
  const { twixId } = useParams();
  return (
    <div className="error-container">{`There was an error loading twix by the id ${twixId}. Sorry.`}</div>
  );
}
```

</details>

Benissimo! Ora i motori di ricerca e i social apprezzeranno il sito ottimizzato!

| Capitolo precedente  | Capitolo successivo     |
| :--------------- | ---------------: |
| [◀︎ 08-expected-errors](../08-expected-errors)| [10-resource-routes ▶︎](../10-resource-routes) |