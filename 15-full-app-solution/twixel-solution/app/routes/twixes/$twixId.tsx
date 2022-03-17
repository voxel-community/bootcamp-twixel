import type { Twix } from "@prisma/client";
import { ActionFunction, Form, LoaderFunction, MetaFunction } from "remix";
import {
  Link,
  useLoaderData,
  useCatch,
  redirect,
  useParams,
} from "remix";

import { db } from "~/utils/db.server";
import { getUserId, requireUserId } from "~/utils/session.server";
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

type LoaderData = { twix: Twix, isOwner: boolean };

export const loader: LoaderFunction = async ({
  params,
  request
}) => {
  const userId = await getUserId(request);
  const twix = await db.twix.findUnique({
    where: { id: params.twixId },
  });
  if (!twix) {
    throw new Response("Ma che twix! Non ho trovato niente.", {
      status: 404,
    });
  }
  const data: LoaderData = { twix, isOwner: userId === twix.twixesterId, };
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
    throw new Response("Non puoi eliminare ciò che non esiste", {
      status: 404,
    });
  }
  if (twix.twixesterId !== userId) {
    throw new Response(
      "Bel tentativo! Ma non quello non è un tuo twix",
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
    <div className="bg-white shadow border rounded-md p-4">
      <TwixDisplay twix={data.twix} isOwner={data.isOwner} />
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
          Quello che stai provando a fare non è permesso.
        </div>
      );
    }
    case 404: {
      return (
        <div className="error-container">
          Huh? Che cosa sarebbe un {params.twixId}?
        </div>
      );
    }
    case 401: {
      return (
        <div className="error-container">
          Ci dispiace, ma {params.twixId} non è un tuo Twix.
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
    <div className="error-container">{`C'è stato un errore nel caricare il twix con l'id ${twixId}. Ci dispiace.`}</div>
  );
}