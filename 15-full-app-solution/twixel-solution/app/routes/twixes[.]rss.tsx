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