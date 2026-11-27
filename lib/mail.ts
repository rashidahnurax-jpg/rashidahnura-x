const FROM = process.env.NURAX_MAIL_FROM;
const KEY = process.env.NURAX_MAIL_API_KEY;
const ENDPOINT = process.env.NURAX_MAIL_API_URL ?? "https://api.resend.com/emails";

export interface CodeDelivery {
  delivered: boolean;
  demoCode: string | null;
  unavailable: boolean;
}

function mailConfigured(): boolean {
  return Boolean(FROM && KEY);
}

export async function deliverOneTimeCode(input: {
  email: string;
  code: string;
  galleryTitle: string;
  studioName: string;
}): Promise<CodeDelivery> {
  const dev = process.env.NODE_ENV !== "production";
  if (!mailConfigured()) {
    if (dev) return { delivered: false, demoCode: input.code, unavailable: false };
    return { delivered: false, demoCode: null, unavailable: true };
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [input.email],
        subject: `Your NURA-X code for ${input.galleryTitle}`,
        text: `${input.code} is your one-time code for "${input.galleryTitle}", shared by ${input.studioName}. It expires in ten minutes. If you didn't request it, ignore this email.`,
        html: `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px;background:#FFFDD0;color:#0b2f2a">
          <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8a6a1f;margin:0 0 16px">NURA-X STUDIO</p>
          <h1 style="font-size:26px;margin:0 0 8px">Your one-time code</h1>
          <p style="font-size:14px;line-height:1.6;color:#3c4a45">${input.studioName} shared “${input.galleryTitle}” with you.</p>
          <p style="font-family:monospace;font-size:34px;letter-spacing:10px;margin:24px 0;color:#0b2f2a">${input.code}</p>
          <p style="font-size:12px;color:#5c6a65">The code expires in ten minutes. If you didn't request it, ignore this email.</p>
        </div>`,
      }),
    });
    if (!res.ok) return { delivered: false, demoCode: null, unavailable: false };
    return { delivered: true, demoCode: null, unavailable: false };
  } catch {
    return { delivered: false, demoCode: null, unavailable: false };
  }
}
