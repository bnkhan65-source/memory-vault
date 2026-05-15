/**
 * Verifies a Firebase ID token using Firebase's REST API.
 * No firebase-admin SDK needed — uses the existing Firebase API key.
 */
export async function verifyFirebaseToken(token: string): Promise<boolean> {
  if (!token) return false;

  try {
    const res = await fetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
