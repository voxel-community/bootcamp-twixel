import type { User } from "@prisma/client";
import { Form, LinksFunction, LoaderFunction } from "remix";
import { Link, Outlet, useLoaderData } from "remix";

import { db } from "~/utils/db.server";
import { getUser } from "~/utils/session.server";

type LoaderData = {
  user: Awaited<ReturnType<typeof getUser>>;
  twixListItems: Array<{ id: string; title: string }>;
};

export const loader: LoaderFunction = async ({
  request,
}) => {
  const twixListItems = await db.twix.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true },
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
    <div className="w-screen min-h-screen bg-purple-100">
      <header className="bg-white p-4">
        <div className="flex items-center justify-between mx-auto max-w-screen-2xl">
          <h1 className="home-link">
            <Link
              to="/"
              title="Remix Twixes"
              aria-label="Remix Twixes"
            >
              <span className="text-2xl font-bold text-purple-700">Twixel</span>
            </Link>
          </h1>
          {data.user ? (
            <div className="flex items-center">
              <span>{`Hi ${data.user.username}`}</span>
              <Form action="/logout" method="post">
                <button type="submit" className="underline font-medium ml-2 pl-2 border-l">
                  Logout
                </button>
              </Form>
            </div>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </header>
      <main className="max-w-screen-xl h-full mx-auto mt-8">
        <div className="lg:flex">
          <div className="w-full lg:w-1/2 flex-none px-4">
            <Link className="bg-white hover:bg-gray-100 text-purple-700 rounded-md px-4 py-2 w-full block text-center border shadow" to=".">Get a random twix</Link>
            <p className="my-4">Here are a few more twixes to check out:</p>
            <ul>
              {data.twixListItems.map((twix) => (
                <li key={twix.id}>
                  <Link prefetch="intent" to={twix.id} className="block mb-4 bg-white w-full rounded-md p-4 shadow border hover:bg-gray-100">
                    {twix.title}
                  </Link>
                </li>
              ))}
            </ul>
            <Link to="new" className="bg-purple-700 text-white rounded-md px-4 py-2 w-full block text-center">
              Add your own
            </Link>
          </div>
          <div className="lg:ml-2 flex-1 p-4 lg:p-0">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
