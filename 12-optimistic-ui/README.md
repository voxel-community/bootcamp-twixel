## UI ottimistica

| Capitolo precedente  | Capitolo successivo     |
| :--------------- | ---------------: |
| [◀︎ 11-javascript](../11-javascript)| [13-deployment ▶︎](../13-deployment) |


Ora che abbiamo JavaScript sulla pagina, possiamo beneficiare del _miglioramento progressivo_ e rendere il nostro sito _ancora migliore_ con JavaScript aggiungendo un po' di _UI ottimistica_ alla nostra app.

Anche se la nostra app è abbastanza veloce (soprattutto in locale 😅), alcuni utenti potrebbero avere una connessione lenta. Ciò significa che pubblicheranno i loro twixes, ma poi dovranno aspettare un po' prima di vedere qualcosa. Potremmo aggiungere uno spinner di caricamento da qualche parte, ma sarebbe un'esperienza utente molto migliore se fossimo ottimisti sul successo della richiesta e mostrare ciò che l'utente vedrebbe.


C'è questa [guida sull'optimistic UI](https://remix.run/docs/en/v1.3.0-pre.1/guides/optimistic-ui) piuttosto approfondita, se vuoi darci una letta, nel frattempo procediamo a creare una versione base.

💿 Aggiungiamo l'optimistic UI alla route `app/routes/twixes/new.tsx`.

Nota, probabilmente vorrai creare un nuovo file in `app/components/` chiamato `twix.tsx` in modo da poter riutilizzare quella UI in entrambe le route.

<details>

<summary>app/components/twix.tsx</summary>

```tsx filename=app/components/twix.tsx
import { Link, Form } from "remix";
import type { Twix } from "@prisma/client";

export function TwixDisplay({
  twix,
  isOwner,
  canDelete = true,
}: {
  twix: Pick<Twix, "content" | "title">;
  isOwner: boolean;
  canDelete?: boolean;
}) {
  return (
    <div>
      <p>Here's your hilarious twix:</p>
      <p>{twix.content}</p>
      <Link to=".">{twix.title} Permalink</Link>
      {isOwner ? (
        <Form method="post">
          <input
            type="hidden"
            name="_method"
            value="delete"
          />
          <button
            type="submit"
            className="button"
            disabled={!canDelete}
          >
            Delete
          </button>
        </Form>
      ) : null}
    </div>
  );
}
```

</details>

<details>

<summary>app/routes/twixes/$twixId.tsx</summary>

```tsx filename=app/routes/twixes/$twixId.tsx lines=[19,97]
import type {
  LoaderFunction,
  ActionFunction,
  MetaFunction,
} from "remix";
import {
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
import { TwixDisplay } from "~/components/twix";

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
    <TwixDisplay twix={data.twix} isOwner={data.isOwner} />
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

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);

  const { twixId } = useParams();
  return (
    <div className="error-container">{`There was an error loading twix by the id ${twixId}. Sorry.`}</div>
  );
}
```

</details>

<details>

<summary>app/routes/twixes/new.tsx</summary>

```tsx filename=app/routes/twixes/new.tsx lines=[9,12,89-109]
import { ActionFunction, Form, LoaderFunction, useTransition } from "remix";
import { useActionData, redirect, json, useCatch, Link } from "remix";

import { db } from "~/utils/db.server";
import { requireUserId, getUserId } from "~/utils/session.server";

import { TwixDisplay } from "~/components/twix";


export const loader: LoaderFunction = async ({
  request,
}) => {
  const userId = await getUserId(request);
  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return {};
};

function validateTwixContent(content: string) {
  if (content.length < 10) {
    return `Il twix è troppo corto`;
  }
}

function validateTwixTitle(title: string) {
  if (title.length < 3) {
    return `Il titolo è troppo corto`;
  }
}

type ActionData = {
  formError?: string;
  fieldErrors?: {
    title: string | undefined;
    content: string | undefined;
  };
  fields?: {
    title: string;
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
  const title = form.get("title");
  const content = form.get("content");
  // qui facciamo un piccolo type check per rendere TypeScript felice
  // dopo ci occuperemo della validazione!
  if (
    typeof title !== "string" ||
    typeof content !== "string"
  ) {
    return badRequest({
      formError: `Il form non è stato inviato correttamente`,
    });
  }

  const fieldErrors = {
    title: validateTwixTitle(title),
    content: validateTwixContent(content),
  };
  const fields = { title, content };
  if (Object.values(fieldErrors).some(Boolean)) {
    return badRequest({ fieldErrors, fields });
  }

  const twix = await db.twix.create({
    data: { ...fields, twixesterId: userId },
  });
  return redirect(`/twixes/${twix.id}`);
};

export default function NewTwixRoute() {
  const actionData = useActionData<ActionData>();
  const transition = useTransition();

  if (transition.submission) {
    const title = transition.submission.formData.get("title");
    const content =
      transition.submission.formData.get("content");
    if (
      typeof title === "string" &&
      typeof content === "string" &&
      !validateTwixContent(content) &&
      !validateTwixTitle(title)
    ) {
      return (
          <TwixDisplay
            twix={{ title, content }}
            isOwner={true}
            canDelete={false}
          />
      );
    }
  }
  
  return (
    <div>
      <p>Crea il tuo twix</p>
      <Form method="post">
        <div>
          <label>
            Titolo:{" "}
            <input
              type="text"
              defaultValue={actionData?.fields?.title}
              name="title"
              aria-invalid={
                Boolean(actionData?.fieldErrors?.title) ||
                undefined
              }
              aria-errormessage={
                actionData?.fieldErrors?.title
                  ? "name-error"
                  : undefined
              }
            />
          </label>
          {actionData?.fieldErrors?.title ? (
            <p
              className="form-validation-error"
              role="alert"
              id="title-error"
            >
              {actionData.fieldErrors.title}
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
            Aggiungi
          </button>
        </div>
      </Form>
    </div>
  );
}

export function CatchBoundary() {
  const caught = useCatch();

  if (caught.status === 401) {
    return (
      <div className="error-container">
        <p>Devi prima fare login per creare nuovi Twixel</p>
        <Link to="/login">Login</Link>
      </div>
    );
  }
}

export function ErrorBoundary() {
  return (
    <div className="error-container">
      Qualcosa è andato storto, ci scusiamo.
    </div>
  );
}
```

</details>

Vedi come puoi usare la _stessa_ validazione utlizzata lato server nel client, quindi, se ciò che gli utenti inviano fallisce la convalida lato server, non ci preoccupiamo nemmeno di eseguire il rendering dell'UI ottimistica perché sappiamo che fallirebbe. 

Detto questo, questo approccio dichiarativo della UI ottimistica è fantastico perché non dobbiamo preoccuparci del ripristino degli errori. Se la richiesta non va a buon fine, il nostro componente verrà rirenderizzato al posto giusto - fantastico, no?

Ecco una dimostrazione di come sarebbe quell'esperienza:

<video src="/twixes-tutorial/img/optimistic-ui.mp4" controls muted loop autoplay></video>


| Capitolo precedente  | Capitolo successivo     |
| :--------------- | ---------------: |
| [◀︎ 11-javascript](../11-javascript)| [13-deployment ▶︎](../13-deployment) |