## Resource Routes

Sometimes we want our routes to render something other than an HTML document. For example, maybe you have an endpoint that generates your social image for a blog post, or the image for a product, or the CSV data for a report, or an RSS feed, or sitemap, or maybe you want to implement API routes for your mobile app, or anything else.

This is what [Resource Routes](../guides/resource-routes) are for. I think it'd be cool to have an RSS feed of all our twixes. I think it would make sense to be at the URL `/twixes.rss`. For that to work, you'll need to escape the `.` because that character has special meaning in Remix route filenames. Learn more about [escaping special characters here](../api/conventions#escaping-special-characters).

<docs-info>Believe it or not, you've actually already made one of these. Check out your logout route! No UI necessary because it's just there to handle mutations and redirect lost souls.</docs-info>

For this one, you'll probably want to at least peek at the example unless you want to go read up on the RSS spec 😅.

💿 Make a `/twixes.rss` route.

<details>

<summary>app/routes/twixes[.]rss.tsx</summary>

```tsx filename=app/routes/twixes[.]rss.tsx
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
  const twixes = await db.twix.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { twixester: { select: { username: true } } },
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
  const twixesUrl = `${domain}/twixes`;

  const rssString = `
    <rss xmlns:blogChannel="${twixesUrl}" version="2.0">
      <channel>
        <title>Remix Twixes</title>
        <link>${twixesUrl}</link>
        <description>Some funny twixes</description>
        <language>en-us</language>
        <generator>Kody the Koala</generator>
        <ttl>40</ttl>
        ${twixes
          .map((twix) =>
            `
            <item>
              <title><![CDATA[${escapeCdata(
                twix.title
              )}]]></title>
              <description><![CDATA[A funny twix called ${escapeHtml(
                twix.title
              )}]]></description>
              <author><![CDATA[${escapeCdata(
                twix.twixester.username
              )}]]></author>
              <pubDate>${twix.createdAt.toUTCString()}</pubDate>
              <link>${twixesUrl}/${twix.id}</link>
              <guid>${twixesUrl}/${twix.id}</guid>
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

![XML document for RSS feed](/twixes-tutorial/img/twixes-rss-feed.png)

Wahoo! You can seriously do anything you can imagine with this API. You could even make a JSON API for a native version of your app if you wanted to. Lots of power here.

💿 Feel free to throw a link to that RSS feed on `app/routes/index.tsx` and `app/routes/twixes.tsx` pages. Note that if you use `<Link />` you'll want to use the `reloadDocument` prop because you can't do a client-side transition to a URL that's not technically part of the React app.