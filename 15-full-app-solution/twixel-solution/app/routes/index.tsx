import type { LinksFunction, MetaFunction } from "remix";
import { Link } from "remix";

export const meta: MetaFunction = () => ({
  title: "Twixes",
  description:
    "Il Twitter di Voxel!",
});

export default function Index() {
  return (
    <div className="w-screen h-screen bg-purple-100 flex flex-col items-center justify-center p-4">
      <div className="p-8 w-full max-w-sm">
        <h1 className="text-center text-5xl lg:text-7xl font-bold text-purple-700 mb-2">
          Twixel
        </h1>
        <nav className="w-full">
          <ul className="flex items-center justify-center">
            <li className="mr-4 rounded-full bg-white px-1 shadow border">
              <Link to="twixes">Read Twixes</Link>
            </li>
            <li className="rounded-full bg-white px-1 shadow border">
              <Link to="twixes.rss" reloadDocument>Feed RSS</Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}