## Optimistic UI

Now that we have JavaScript on the page, we can benefit from _progressive enhancement_ and make our site _even better_ with JavaScript by adding some _optimistic UI_ to our app.

Even though our app is quite fast (especially locally 😅), some users may have a poor connection to our app. This means that they're going to submit their jokes, but then they'll have to wait for a while before they see anything. We could add a loading spinner somewhere, but it'd be a much better user experience to be optimistic about the success of the request and render what the user would see.

We have a pretty in depth [guide on Optimistic UI](../guides/optimistic-ui), so go give that a read

💿 Add Optimistic UI to the `app/routes/jokes/new.tsx` route.

Note, you'll probably want to create a new file in `app/components/` called `joke.tsx` so you can reuse that UI in both routes.

<details>

<summary>app/components/joke.tsx</summary>

```tsx filename=app/components/joke.tsx
import { Link, Form } from "remix";
import type { Joke } from "@prisma/client";

export function JokeDisplay({
  joke,
  isOwner,
  canDelete = true,
}: {
  joke: Pick<Joke, "content" | "name">;
  isOwner: boolean;
  canDelete?: boolean;
}) {
  return (
    <div>
      <p>Here's your hilarious joke:</p>
      <p>{joke.content}</p>
      <Link to=".">{joke.name} Permalink</Link>
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

<summary>app/routes/jokes/$jokeId.tsx</summary>

```tsx filename=app/routes/jokes/$jokeId.tsx lines=[19,97]
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
import type { Joke } from "@prisma/client";

import { db } from "~/utils/db.server";
import {
  getUserId,
  requireUserId,
} from "~/utils/session.server";
import { JokeDisplay } from "~/components/joke";

export const meta: MetaFunction = ({
  data,
}: {
  data: LoaderData | undefined;
}) => {
  if (!data) {
    return {
      title: "No joke",
      description: "No joke found",
    };
  }
  return {
    title: `"${data.joke.name}" joke`,
    description: `Enjoy the "${data.joke.name}" joke and much more`,
  };
};

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
    <JokeDisplay joke={data.joke} isOwner={data.isOwner} />
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

<details>

<summary>app/routes/jokes/new.tsx</summary>

```tsx filename=app/routes/jokes/new.tsx lines=[9,12,89-109]
import type { ActionFunction, LoaderFunction } from "remix";
import {
  useActionData,
  redirect,
  json,
  useCatch,
  Link,
  Form,
  useTransition,
} from "remix";

import { JokeDisplay } from "~/components/joke";
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
  const transition = useTransition();

  if (transition.submission) {
    const name = transition.submission.formData.get("name");
    const content =
      transition.submission.formData.get("content");
    if (
      typeof name === "string" &&
      typeof content === "string" &&
      !validateJokeContent(content) &&
      !validateJokeName(name)
    ) {
      return (
        <JokeDisplay
          joke={{ name, content }}
          isOwner={true}
          canDelete={false}
        />
      );
    }
  }

  return (
    <div>
      <p>Add your own hilarious joke</p>
      <Form method="post">
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
      </Form>
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

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);

  return (
    <div className="error-container">
      Something unexpected went wrong. Sorry about that.
    </div>
  );
}
```

</details>

One thing I like about my example is that it can use the _exact_ same validation functions that the server uses! So if what they submitted will fail server-side validation, we don't even bother rendering the optimistic UI because we know it would fail.

That said, this declarative optimistic UI approach is fantastic because we don't have to worry about error recovery. If the request fails, then our component will be re-rendered, it will no longer be a submission and everything will work as it did before. Nice!

Here's a demonstration of what that experience looks like:

<video src="/jokes-tutorial/img/optimistic-ui.mp4" controls muted loop autoplay></video>