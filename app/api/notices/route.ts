import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

// NO MORE IMPORT FROM bus.ts - removed SSE broadcasting

// HeadsUp Notice Type (NO notice_text, NO notice_by)
type Notice = {
  id: string;
  type: string;
  category: string;
  company: string;
  notice_time: string; // e.g., "11-10-2025 13:07"
};

type Payload = {
  scraped_at: string;
  total_notices?: number;
  notices: Notice[];
};

const DATA_PATH = path.join(process.cwd(), "data", "notices.json");
const API_KEY = process.env.HEADSUP_PUSH_KEY || "";

export async function GET() {
  try {
    const buf = await fs.readFile(DATA_PATH); // read raw bytes
    let txt = buf.toString("utf8");

    // If a BOM slipped in, remove it
    if (txt.charCodeAt(0) === 0xfeff) {
      txt = txt.slice(1);
    }
    // If there are many NULs, it was likely UTF-16LE; fallback decode:
    if (txt.includes("\u0000")) {
      txt = buf.toString("utf16le");
      if (txt.charCodeAt(0) === 0xfeff) txt = txt.slice(1);
    }

    const json = JSON.parse(txt);
    return NextResponse.json(json, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      {
        scraped_at: null,
        notices: [],
        total_notices: 0,
        error: String(e?.message || e),
      },
      { status: 200 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const key = req.headers.get("x-api-key");
    if (!API_KEY || key !== API_KEY) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Payload;

    if (!body || !Array.isArray(body.notices)) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }

    // HeadsUp: Ensure notices don't contain notice_text or notice_by
    const cleanedNotices = body.notices.map((notice) => ({
      id: notice.id,
      type: notice.type,
      category: notice.category,
      company: notice.company,
      notice_time: notice.notice_time,
      // notice_text: EXCLUDED
      // notice_by: EXCLUDED
    }));

    // normalize optional
    const normalized: Payload = {
      scraped_at: body.scraped_at ?? new Date().toISOString(),
      notices: cleanedNotices,
      total_notices: body.total_notices ?? cleanedNotices.length,
    };

    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(normalized, null, 2), "utf8");

    // REMOVED: broadcastUpdate() - no longer using SSE
    // Clients will get updates via polling instead

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
// import { NextResponse } from "next/server";
// import path from "path";
// import { promises as fs } from "fs";

// import { broadcastUpdate } from "./bus";

// // HeadsUp Notice Type (NO notice_text, NO notice_by)
// type Notice = {
//   id: string;
//   type: string;
//   category: string;
//   company: string;
//   notice_time: string; // e.g., "11-10-2025 13:07"
// };

// type Payload = {
//   scraped_at: string;
//   total_notices?: number;
//   notices: Notice[];
// };

// const DATA_PATH = path.join(process.cwd(), "data", "notices.json");
// const API_KEY = process.env.HEADSUP_PUSH_KEY || "";

// export async function GET() {
//   try {
//     const buf = await fs.readFile(DATA_PATH); // read raw bytes
//     let txt = buf.toString("utf8");

//     // If a BOM slipped in, remove it
//     if (txt.charCodeAt(0) === 0xfeff) {
//       txt = txt.slice(1);
//     }
//     // If there are many NULs, it was likely UTF-16LE; fallback decode:
//     if (txt.includes("\u0000")) {
//       txt = buf.toString("utf16le");
//       if (txt.charCodeAt(0) === 0xfeff) txt = txt.slice(1);
//     }

//     const json = JSON.parse(txt);
//     return NextResponse.json(json, { status: 200 });
//   } catch (e: any) {
//     return NextResponse.json(
//       {
//         scraped_at: null,
//         notices: [],
//         total_notices: 0,
//         error: String(e?.message || e),
//       },
//       { status: 200 }
//     );
//   }
// }

// export async function POST(req: Request) {
//   try {
//     const key = req.headers.get("x-api-key");
//     if (!API_KEY || key !== API_KEY) {
//       return NextResponse.json({ error: "unauthorized" }, { status: 401 });
//     }

//     const body = (await req.json()) as Payload;

//     if (!body || !Array.isArray(body.notices)) {
//       return NextResponse.json({ error: "invalid payload" }, { status: 400 });
//     }

//     // HeadsUp: Ensure notices don't contain notice_text or notice_by
//     const cleanedNotices = body.notices.map((notice) => ({
//       id: notice.id,
//       type: notice.type,
//       category: notice.category,
//       company: notice.company,
//       notice_time: notice.notice_time,
//       // notice_text: EXCLUDED
//       // notice_by: EXCLUDED
//     }));

//     // normalize optional
//     const normalized: Payload = {
//       scraped_at: body.scraped_at ?? new Date().toISOString(),
//       notices: cleanedNotices,
//       total_notices: body.total_notices ?? cleanedNotices.length,
//     };

//     await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
//     await fs.writeFile(DATA_PATH, JSON.stringify(normalized, null, 2), "utf8");

//     // Broadcast to all connected SSE clients that data updated
//     broadcastUpdate();

//     return NextResponse.json({ ok: true }, { status: 200 });
//   } catch (e: any) {
//     return NextResponse.json(
//       { error: String(e?.message || e) },
//       { status: 500 }
//     );
//   }
// }