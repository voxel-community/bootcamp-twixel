## Mutations

We've got ourselves a `/jokes/new` route, but that form doesn't do anything yet. Let's wire it up! As a reminder here's what that code should look like right now (the `method="post"` is important so make sure yours has it):

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

Not much there. Just a form. What if I told you that you could make that form work with a single export to the route module? Well you can! It's the [`action`](../api/conventions#action) function export! Read up on that a bit.

Here's the prisma code you'll need:

```tsx
const joke = await db.joke.create({
  data: { name, content },
});
```

💿 Create an `action` in `app/routes/jokes/new.tsx`.

<details>

<summary>app/routes/jokes/new.tsx</summary>

```tsx filename=app/routes/jokes/new.tsx lines=[1-2,4,6-25]
import type { ActionFunction } from "remix";
import { redirect } from "remix";

import { db } from "~/utils/db.server";

export const action: ActionFunction = async ({
  request,
}) => {
  const form = await request.formData();
  const name = form.get("name");
  const content = form.get("content");
  // we do this type check to be extra sure and to make TypeScript happy
  // we'll explore validation next!
  if (
    typeof name !== "string" ||
    typeof content !== "string"
  ) {
    throw new Error(`Form not submitted correctly.`);
  }

  const fields = { name, content };

  const joke = await db.joke.create({ data: fields });
  return redirect(`/jokes/${joke.id}`);
};

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

If you've got that working, you should be able to create new jokes and be redirected to the new joke's page.

<docs-info>

The `redirect` utility is a simple utility in Remix for creating a [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) object that has the right headers/status codes to redirect the user.

</docs-info>

![Create new joke form filled out](/jokes-tutorial/img/creating-new-joke.png)

![Newly created joke displayed](/jokes-tutorial/img/new-joke-created.png)

Hooray! How cool is that? No `useEffect` or `useAnything` hooks. Just a form, and an async function to process the submission. Pretty cool. You can definitely still do all that stuff if you wanted to, but why would you? This is really nice.

Another thing you'll notice is that when we were redirected to the joke's new page, it was there! But we didn't have to think about updating the cache at all. Remix handles invalidating the cache for us automatically. You don't have to think about it. _That_ is cool 😎

Why don't we add some validation? We could definitely do the typical React validation approach. Wiring up `useState` with `onChange` handlers and such. And sometimes that's nice to get some real-time validation as the user's typing. But even if you do all that work, you're still going to want to do validation on the server.

Before I set you off on this one, there's one more thing you need to know about route module `action` functions. The return value is expected to be the same as the `loader` function: A response, or (as a convenience) a serializable JavaScript object. Normally you want to `redirect` when the action is successful to avoid the annoying "confirm resubmission" dialog you might have seen on some websites.

<!-- TODO: add a page about why `redirect`ing is better for successful actions and link it here. -->

But if there's an error, you can return an object with the error messages and then the component can get those values from [`useActionData`](../api/remix#useactiondata) and display them to the user.

💿 Go ahead and validate that the `name` and `content` fields are long enough. I'd say the name should be at least 2 characters long and the content should be at least 10 characters long. Do this validation server-side.

<details>

<summary>app/routes/jokes/new.tsx</summary>

```tsx filename=app/routes/jokes/new.tsx lines=[2,6-10,12-16,18-28,30-31,43-45,48-51,53-55,62,73,75-83,86-94,100,102-110,113-121]
import type { ActionFunction } from "remix";
import { useActionData, redirect, json } from "remix";

import { db } from "~/utils/db.server";

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

  const joke = await db.joke.create({ data: fields });
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

Great! You should now have a form that validates the fields on the server and displays those errors on the client:

![New joke form with validation errors](/jokes-tutorial/img/new-joke-form-with-errors.png)

Why don't you pop open my code example for a second. I want to show you a few things about the way I'm doing this.

First I want you to notice that I've added an `ActionData` type so we could get some type safety. Keep in mind that `useActionData` can return `undefined` if the action hasn't been called yet, so we've got a bit of defensive programming going on there.

You may also notice that I return the fields as well. This is so that the form can be re-rendered with the values from the server in the event that JavaScript fails to load for some reason. That's what the `defaultValue` stuff is all about as well.

The `badRequest` helper function is important because it gives us typechecking that ensures our return value is of type `ActionData`, while still returning the accurate HTTP status, [`400 Bad Request`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400), to the client. If we just return the `ActionData` value, that would result in a `200 OK` response, which isn't suitable since the form submission had errors.

Another thing I want to call out is how all of this is just so nice and declarative. You don't have to think about state at all here. Your action gets some data, you process it and return a value. The component consumes the action data and renders based on that value. No managing state here. No thinking about race conditions. Nothing.

Oh, and if you _do_ want to have client-side validation (for while the user is typing), you can simply call the `validateJokeContent` and `validateJokeName` functions that the action is using. You can _actually_ seamlessly share code between the client and server! Now _that_ is cool!