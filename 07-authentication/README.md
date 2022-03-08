## Autenticazione

È arrivato il momento che stavamo aspettando! Adesso aggiugerai l'autenticazione alla tua applicazione! Grazie all'autenticazione riuscirai ad associare ogni twix all'utente che l'ha creato!

Un'ottima cosa da sapere per questa sezione sono i [cookies HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies) e come funzionano sul web.

Ci sono tanti modi per aggiungere l'autenticazione ad un'app, ad esempio puoi utilizzare dei servizi come ad esempio [Auth0](https://auth0.com/). Oggi però realizzerai la tua autenticazione da zero, non preoccuparti non è così spaventoso come può sembrare.

### Prepara il database

Iniziamo andando ad aggiornare il file `prisma/schema.prisma` file nel seguente modo:

```prisma filename=prisma/schema.prisma lines=[13-20,24-25]
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
  twixes        Twix[]
}

model Twix {
  id       String @id @default(auto()) @map("_id") @db.ObjectId
  twixesterId String @db.ObjectId
  twixester   User     @relation(fields: [twixesterId], references: [id])
  createdAt  DateTime @db.Date @default(now())
  updatedAt  DateTime @db.Date @default(now())
  title       String
  content    String
}
```

Adesso che abbiamo aggiornato lo schema puoi eseguire il seguente comando:

```sh
npx prisma db push
```

Questo comando ti darà questo output:

```sh
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db"

🚀  Your database is now in sync with your schema. Done in 194ms

✔ Generated Prisma Client (3.10.0 | library) to ./node_modules/@prisma/client in 167ms
```

With this change, we're going to start experiencing some TypeScript errors in our project because you can no longer create a `twix` without a `twixsterId` value.

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
    getTwixes().map((twix) => {
      const data = { twixsterId: kody.id, ...twix };
      return db.twix.create({ data });
    })
  );
}

seed();

function getTwixes() {
  // shout-out to https://icanhazdadtwix.com/

  return [
    {
      title: "Road worker",
      content: `I never wanted to believe that my Dad was stealing from his job as a road worker. But when I got home, all the signs were there.`,
    },
    {
      title: "Frisbee",
      content: `I was wondering why the frisbee was getting bigger, then it hit me.`,
    },
    {
      title: "Trees",
      content: `Why do trees seem suspicious on sunny days? Dunno, they're just a bit shady.`,
    },
    {
      title: "Skeletons",
      content: `Why don't skeletons ride roller coasters? They don't have the stomach for it.`,
    },
    {
      title: "Hippos",
      content: `Why don't you find hippopotamuses hiding in trees? They're really good at it.`,
    },
    {
      title: "Dinner",
      content: `What did one plate say to the other plate? Dinner is on me!`,
    },
    {
      title: "Elevator",
      content: `My first time using an elevator was an uplifting experience. The second time let me down.`,
    },
  ];
}
```

💿 Ottimo, ora avvia di nuovo il comando:

```sh
npx prisma db push
```

Questo comando ti darà questo output:

```sh
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db"

🚀  Your database is now in sync with your schema. Done in 194ms

✔ Generated Prisma Client (3.10.0 | library) to ./node_modules/@prisma/client in 167ms
```

Ottimo! Ora il database è pronto.

### Rivediamo il flow di autenticazione

La nostra autenticazione sarà tradizionale, con username e password. Useremo la libreria [`bcryptjs`](https://npm.im/bcryptjs) per "mascherare" (in inglese _to hash_) le nostre password in modo tale che sia abbastanza difficile scoprire la password ed entrare nell'account.

💿  Ora procedi e installa la libreria con il seguente comando:

```sh
npm install bcryptjs
```

💿 La libreria `bcryptjs` has delle definizione TypeScript presenti in DefinitelyTyped, installiamo anche quelle così il nostro editor non si lamenterà:

```sh
npm install --save-dev @types/bcryptjs
```

Qui puoi vedere un diagramma di come funzionerà l'autenticazione che implementerai:

![TODO ricreare un diagramma di autenticazione](/assets/)

Ti lasciamo qui di seguito un piccolo riassunto di come funzionerà la nostra autenticazione:

- Alla pagina `/login`
  - L'utente inserisce le proprie credenziali
  - I dati vengono validati
    - Se i dati non sono corretti viene mostrati all'utente un messaggio di errore
- Se l'utente si sta registrando
  - Va controllato che non esistano utenti con lo stesso username
    - Se lo username è già utilizzato viene mostrati all'utente un messaggio di errore.
  - Viene fatto un hash della password
  - Viene creato un nuovo utente
- Se l'utente è già registrato e sta accedendo
  - Controllare che esista l'utente con quello username
    - Se l'utente non esiste viene mostrato un messaggio di errore.
  - Controllare che l'hashing delle password corrisponde
    - Se gli hash delle password non corrispondono, viene mostrato un messaggio di errore
- Viene creata una nuova sessione
- L'utente viene riderizionato alla pagina `/twixes` con un header `Set-Cookie`.

### Costruisci il form di login

Ottimo, ora che abbiamo parlato di un' po di concetti teorici, iniziamo a scrivere un po' di codice con Remix!

💿 Crea una pagina `/login` creando un file `app/routes/login.tsx`.

<details>

<summary>app/routes/login.tsx</summary>

```tsx filename=app/routes/login.tsx
import type { LinksFunction } from "remix";
import { Link, useSearchParams } from "remix";

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
            <Link to="/twixes">Twixes</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
```

</details>

Dovresti avere il seguente output:

![A login form with a login/register radio button and username/password fields and a submit button](/assets/)

Puoi notare che abbiamo usato `useSearchParams` per prendere il valore del parametro `redirectTo` e l'abbiamo messo in un input nascosto. In questo modo la nostra `action` saprà a quale pagina redirezionare l'utente. Questo sarà per noi molto utile quando nelle prossime sezioni ridirezionare l'utente alla pagina di login.

Ottimo, adesso che abbiamo la struttura della schermata procediamo con l'aggiugere un po' di interazioni. Le seguenti operazioni saranno molto simili a quello che è stato fatto per la pagina `/twixes/new`.

💿 Implementa la validazione con una `action` nel file `app/routes/login.tsx`

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

function validateUsername(username: unknown) {
  if (typeof username !== "string" || username.length < 3) {
    return `Usernames deve essere di almeno 3 caratteri`;
  }
}

function validatePassword(password: unknown) {
  if (typeof password !== "string" || password.length < 6) {
    return `Passwords deve essere di almeno 6 caratteri`;
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
      // login to get the user
      // if there's no user, return the fields and a formError
      // if there is a user, create their session and redirect to /twixes
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
      // create their session and redirect to /twixes
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
            <Link to="/twixes">Twixes</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
```

</details>

Ora dovresti avere una cosa simile a questo: 

![Login form with errors](/assets/)

Bene! Adesso le cose si fanno più interessanti. Iniziamo con la parte legata al `login`. Abbiamo aggiunto in precedenza nel file di seed lo username "kody" e la password (hashed) è "twixrox". Ora vogliamo implementare la giusta quantità di logica in modo da fare login con solo queste credenziali. Metteremo questa logica in un nuovo file chiamato `app/utils/session.server.ts`.

Questo è il riassunto della logica che ci serve nel file:

- Esporta una funzione chiamata `login` che accetta `username` e `password` come parametri
- Interroga prisma per sapere se esiste quell'utente con quello `username`
- Se non c'è un utente, ritorna `null`
- Utilizza `bcrypt.compare` per comparare la `password` inserita dall'utente con la `passwordHash` dell'utente
- Se le password non corrispondono, ritorna `null`
- Se le password corrispondono, allora ritorna l'utente

💿 Crea un file `app/utils/session.server.ts` e implementiamo i requisiti dei punti appena scritti:

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

Ottimo con questo adesso possiamo ritornare al nostro file `app/routes/login.tsx` e aggiornarlo con la funzione che hai appena creato:

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
      // if there is a user, create their session and redirect to /twixes
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

Per controllare abbiamo aggiunto un `console.log` al file `app/routes/login.tsx` dopo la chiamata `login` in modo da vedere le risposte nel terminale.

> Ricorda che `actions` e `loaders` vengono avviate sul server, quindi i `console.log` non li vedrai nella console del browser, ma li vedrai nel terminale dove hai avviato il server

💿 Ora prova a fare login con username "kody" e password "twixrox" e controlla il terminale. Dovresti vedere una cosa simile a questa:

```sh
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

> [TODO DA VERIFICARE SE FUNZIONA] If you're having trouble, run `npx prisma studio` to see the database in the browser. It's possible you don't have any data because you forgot to run `npx prisma db seed` (like I did when I was writing this 😅).

Wow! Ora abbiamo l'utente! Ora possiamo mettere l'id dell'utente nella sessione. Apri il file `app/utils/session.server.ts`. Remix è costruito in un modo astratto tale da permetterci di gestire diversi meccanismi di gestione delle sessioni. [here are the docs](../api/remix#sessions)). Noi useremo la funzione [`createCookieSessionStorage`](../api/remix#createcookiesessionstorage) dato che è la più semplice e la più scalabile.

💿 Scrivi una funzione `createUserSession` nel file `app/utils/session.server.ts` che accetta un ID utente e una pagina a cui ridirezionare l'utente:

- Crea una nuova sessione (usando la funzione `getSession` del cookie storage)
- Setta il campo `userId` nella sessione
- Ridireziona l'utente secondo le impostazioni date nell'header `Set-Cookie` header (usando la funzione `commitSession` del cookie storage function)

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

Vogliamo farti notare la variabile d'ambiente `SESSION_SECRET` che stiamo usando. Il valore dell'opzione `secrets` non lo vogliamo visibile all'interno del codice perché potrebbe venir utilizzato malevoli. Quindi andremo a leggere il valore dal nostro environment, questo significa che quello che devi fare è settare la variabile `SESSION_SECRET` nel tuo file `.env`. Prisma carica i dati del file automaticamente.

💿 Carichiamo nel file .env file la variabile `SESSION_SECRET` (con qualsiasi valore tu voglia).

Adesso apri la [Network tab](https://developer.chrome.com/docs/devtools/network/reference/), naviga alla pagina [`/login`](http://localhost:3000/login) e inserisci `kody` and `twixrox` come password. Ora controlla gli header della risposta. dovrebbe essere simile a questo:

![DevTools Network tab showing a "Set-Cookie" header on the POST response](/twixes-tutorial/img/network-tab-set-cookie.png)

E se controlli la parte relativa ai cookie nella [Application tab](https://developer.chrome.com/docs/devtools/storage/cookies/) allora vedrai che anche i cookie sono settati.

![DevTools Application tab showing ](/twixes-tutorial/img/application-tab-cookies.png)

And now every request the browser makes to our server will include that cookie (we don't have to do anything on the client, [this is how cookies work](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)):

![Request headers showing the Cookie](/twixes-tutorial/img/cookie-header-on-request.png)

So we can now check whether the user is authenticated on the server by reading that header to get the `userId` we had set into it. To test this out, let's fix the `/twixes/new` route by adding the `twixsterId` field to `db.twix.create` call.

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

💿 Now update `app/routes/twixes/new.tsx` to use that function to get the userId and pass it to the `db.twix.create` call.

<details>

<summary>app/routes/twixes/new.tsx</summary>

```tsx filename=app/routes/twixes/new.tsx lines=[5,37,60]
import type { ActionFunction } from "remix";
import { useActionData, redirect, json } from "remix";

import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";

function validateJokeContent(content: string) {
  if (content.length < 10) {
    return `That twix is too short`;
  }
}

function validateJokeName(name: string) {
  if (name.length < 3) {
    return `That twix's name is too short`;
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

  const twix = await db.twix.create({
    data: { ...fields, twixsterId: userId },
  });
  return redirect(`/twixes/${twix.id}`);
};

export default function NewJokeRoute() {
  const actionData = useActionData<ActionData>();

  return (
    <div>
      <p>Add your own hilarious twix</p>
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

Super! So now if a user attempts to create a new twix, they'll be redirected to the login page because a `userId` is required to create a new twix.

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

💿 Great, now we're going to update the `app/routes/twixes.tsx` route so we can display a login link if the user isn't logged in. If they are logged in then we'll display their username and a logout form. I'm also going to clean up the UI a bit to match the class names we've got as well, so feel free to copy/paste the example when you're ready.

<details>

<summary>app/routes/twixes.tsx</summary>

```tsx filename=app/routes/twixes.tsx lines=[6,14,30,52-63]
import type { User } from "@prisma/client";
import type { LinksFunction, LoaderFunction } from "remix";
import { Link, Outlet, useLoaderData } from "remix";

import { db } from "~/utils/db.server";
import { getUser } from "~/utils/session.server";
import stylesUrl from "~/styles/twixes.css";

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

type LoaderData = {
  user: Awaited<ReturnType<typeof getUser>>;
  twixListItems: Array<{ id: string; name: string }>;
};

export const loader: LoaderFunction = async ({
  request,
}) => {
  const twixListItems = await db.twix.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });
  const user = await getUser(request);

  const data: LoaderData = {
    twixListItems,
    user,
  };
  return data;
};

export default function TwixesRoute() {
  const data = useLoaderData<LoaderData>();

  return (
    <div className="twixes-layout">
      <header className="twixes-header">
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
      <main className="twixes-main">
        <div className="container">
          <div className="twixes-list">
            <Link to=".">Get a random twix</Link>
            <p>Here are a few more twixes to check out:</p>
            <ul>
              {data.twixListItems.map((twix) => (
                <li key={twix.id}>
                  <Link to={twix.id}>{twix.name}</Link>
                </li>
              ))}
            </ul>
            <Link to="new" className="button">
              Add your own
            </Link>
          </div>
          <div className="twixes-outlet">
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

Notice that the `to` prop is set to "new" without any `/`. This is the benefit of nested routing. You don't have to construct the entire URL. It can be relative. This is the same thing for the `<Link to=".">Get a random twix</Link>` link which will effectively tell Remix to reload the data for the current route.

Terrific, now our app looks like this:

![Twixes page nice and designed](/twixes-tutorial/img/random-twix-designed.png)

![New Joke form designed](/twixes-tutorial/img/new-twix-designed.png)

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

Phew, there we go. Now users can register for a new account!