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
      <p className="opacity-50 font-medium mb-2">Here's your hilarious twix:</p>
      <p className="text-xl lg:text-2xl">{twix.content}</p>
      <Link to="." className="my-4 border-t border-b py-4 block underline">{twix.title} Permalink</Link>
      {isOwner ? (
        <Form method="post">
          <input
            type="hidden"
            name="_method"
            value="delete"
          />
          <button
            type="submit"
            className="bg-gray-100 rounded-md px-4 py-2"
            disabled={!canDelete}
          >
            Delete
          </button>
        </Form>
      ) : null}
    </div>
  );
}