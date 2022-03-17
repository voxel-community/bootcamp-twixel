import type { LoaderFunction, MetaFunction } from "remix";
import { useLoaderData, Link, useCatch } from "remix";
import type { Twix } from "@prisma/client";

import { db } from "~/utils/db.server";

export const meta: MetaFunction = () => ({
  title: "Twixes",
  description:
    "Il Twitter di Voxel!",
});

type LoaderData = { randomTwix: Twix };

export const loader: LoaderFunction = async () => {
  const count = await db.twix.count();
  const randomRowNumber = Math.floor(Math.random() * count);
  const [randomTwix] = await db.twix.findMany({
    take: 1,
    skip: randomRowNumber,
  });
  if (!randomTwix) {
    throw new Response("No random twix found", {
      status: 404,
    });
  }
  const data: LoaderData = { randomTwix };
  return data;
};

export default function TwixesIndexRoute() {
  const data = useLoaderData<LoaderData>();

  return (
    <div className="bg-white shadow border rounded-md p-4">
      <p className="opacity-50 font-medium mb-2">Here's a random twix:</p>
      <p className="text-xl lg:text-2xl">{data.randomTwix.content}</p>
      <Link to={data.randomTwix.id} className="my-4 border-t border-b py-4 block underline">
        "{data.randomTwix.title}" Permalink
      </Link>
    </div>
  );
}

export function CatchBoundary() {
  const caught = useCatch();

  if (caught.status === 404) {
    return (
      <div className="error-container">
        There are no twixes to display.
      </div>
    );
  }
  throw new Error(
    `Risposta inaspettata dal server con status: ${caught.status}`
  );
}

export function ErrorBoundary() {
  return (
    <div className="error-container">
      Ooops! C'è stato un problema
    </div>
  );
}