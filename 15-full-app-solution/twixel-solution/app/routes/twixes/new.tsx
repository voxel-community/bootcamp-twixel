import { ActionFunction, Form, LoaderFunction, MetaFunction, useTransition } from "remix";
import { useActionData, redirect, json, useCatch, Link } from "remix";

import { db } from "~/utils/db.server";
import { requireUserId, getUserId } from "~/utils/session.server";

import { TwixDisplay } from "~/components/twix";

export const meta: MetaFunction = () => ({
  title: "Nuovo Twix",
  description:
    "Aggiungi un nuovo Twix!",
});

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
        <div className="bg-white shadow border rounded-md p-4">
          <TwixDisplay
            twix={{ title, content }}
            isOwner={true}
            canDelete={false}
          />
        </div>
      );
    }
  }
  
  return (
    <div className="bg-white rounded-md shadow border p-4">
      <p className="opacity-50 font-medium mb-2">Crea il tuo twix</p>
      <Form method="post">
        <div className="mb-4">
          <label className="flex flex-col">
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
              className="shadow border rounded-md w-full px-4 py-2"
            />
          </label>
          {actionData?.fieldErrors?.title ? (
            <p
              className="text-red-500 text-xs font-medium"
              role="alert"
              id="name-error"
            >
              {actionData.fieldErrors.title}
            </p>
          ) : null}
        </div>
        <div className="mb-4">
        <label className="flex flex-col">
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
              className="shadow border rounded-md w-full px-4 py-2"
            />
          </label>
          {actionData?.fieldErrors?.content ? (
            <p
              className="text-red-500 text-xs font-medium"
              role="alert"
              id="content-error"
            >
              {actionData.fieldErrors.content}
            </p>
          ) : null}
        </div>
        <div>
          <button type="submit" className="w-full text-center px-4 py-2 bg-gray-100 font-medium rounded-md hover:bg-gray-200">
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
      <div className="bg-white p-4 border shadow rounded-md">
        <p>Devi prima fare login per creare nuovi Twixel</p>
        <Link className="px-4 py-2 bg-purple-700 text-white font-medium rounded-md inline-block mt-4" to="/login">Login</Link>
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

function validateTwixName(name: string) {
  throw new Error("Function not implemented.");
}
