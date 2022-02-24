## Resource Routes

Sometimes we want our routes to render something other than an HTML document. For example, maybe you have an endpoint that generates your social image for a blog post, or the image for a product, or the CSV data for a report, or an RSS feed, or sitemap, or maybe you want to implement API routes for your mobile app, or anything else.

This is what [Resource Routes](../guides/resource-routes) are for. I think it'd be cool to have an RSS feed of all our jokes. I think it would make sense to be at the URL `/jokes.rss`. For that to work, you'll need to escape the `.` because that character has special meaning in Remix route filenames. Learn more about [escaping special characters here](../api/conventions#escaping-special-characters).

<docs-info>Believe it or not, you've actually already made one of these. Check out your logout route! No UI necessary because it's just there to handle mutations and redirect lost souls.</docs-info>

For this one, you'll probably want to at least peek at the example unless you want to go read up on the RSS spec 😅.

💿 Make a `/jokes.rss` route.

<details>

<summary>app/routes/jokes[.]rss.tsx</summary>

```tsx filename=app/routes/jokes[.]rss.tsx
import type { LoaderFunction } from "remix";

import { db } from "~/utils/db.server";

function escapeCdata(s: string) {
  return s.replace(/\]\]>/g, "]]]]><![CDATA[>");
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const loader: LoaderFunction = async ({
  request,
}) => {
  const jokes = await db.joke.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { jokester: { select: { username: true } } },
  });

  const host =
    request.headers.get("X-Forwarded-Host") ??
    request.headers.get("host");
  if (!host) {
    throw new Error("Could not determine domain URL.");
  }
  const protocol = host.includes("localhost")
    ? "http"
    : "https";
  const domain = `${protocol}://${host}`;
  const jokesUrl = `${domain}/jokes`;

  const rssString = `
    <rss xmlns:blogChannel="${jokesUrl}" version="2.0">
      <channel>
        <title>Remix Jokes</title>
        <link>${jokesUrl}</link>
        <description>Some funny jokes</description>
        <language>en-us</language>
        <generator>Kody the Koala</generator>
        <ttl>40</ttl>
        ${jokes
          .map((joke) =>
            `
            <item>
              <title><![CDATA[${escapeCdata(
                joke.name
              )}]]></title>
              <description><![CDATA[A funny joke called ${escapeHtml(
                joke.name
              )}]]></description>
              <author><![CDATA[${escapeCdata(
                joke.jokester.username
              )}]]></author>
              <pubDate>${joke.createdAt.toUTCString()}</pubDate>
              <link>${jokesUrl}/${joke.id}</link>
              <guid>${jokesUrl}/${joke.id}</guid>
            </item>
          `.trim()
          )
          .join("\n")}
      </channel>
    </rss>
  `.trim();

  return new Response(rssString, {
    headers: {
      "Cache-Control": `public, max-age=${
        60 * 10
      }, s-maxage=${60 * 60 * 24}`,
      "Content-Type": "application/xml",
      "Content-Length": String(
        Buffer.byteLength(rssString)
      ),
    },
  });
};
```

</details>

![XML document for RSS feed](/jokes-tutorial/img/jokes-rss-feed.png)

Wahoo! You can seriously do anything you can imagine with this API. You could even make a JSON API for a native version of your app if you wanted to. Lots of power here.

💿 Feel free to throw a link to that RSS feed on `app/routes/index.tsx` and `app/routes/jokes.tsx` pages. Note that if you use `<Link />` you'll want to use the `reloadDocument` prop because you can't do a client-side transition to a URL that's not technically part of the React app.