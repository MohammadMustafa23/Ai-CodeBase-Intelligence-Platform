import { google } from "googleapis";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } =
  process.env;

if (!GOOGLE_CLIENT_ID) {
  throw new Error("GOOGLE_CLIENT_ID is not configured.");
}

if (!GOOGLE_CLIENT_SECRET) {
  throw new Error("GOOGLE_CLIENT_SECRET is not configured.");
}

if (!GOOGLE_CALLBACK_URL) {
  throw new Error("GOOGLE_CALLBACK_URL is not configured.");
}

const googleOAuthClient = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
);

const GOOGLE_SCOPES = ["openid", "email", "profile"];

export function getGoogleAuthorizationUrl(state) {
  return googleOAuthClient.generateAuthUrl({
    access_type: "online",
    scope: GOOGLE_SCOPES,
    state,
    prompt: "select_account",
  });
}

export async function getGoogleUserFromCode(code) {
  if (!code) {
    throw new Error("Google authorization code is required.");
  }

  const { tokens } = await googleOAuthClient.getToken(code);

  if (!tokens.id_token) {
    throw new Error("Google ID token was not returned.");
  }

  const ticket = await googleOAuthClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload) {
    throw new Error("Unable to read Google user information.");
  }

  if (!payload.sub) {
    throw new Error("Google user ID is missing.");
  }

  if (!payload.email) {
    throw new Error("Google email is missing.");
  }

  if (payload.email_verified !== true) {
    throw new Error("Google email is not verified.");
  }

  return {
    providerId: payload.sub,
    email: payload.email,
    displayName: payload.name || null,
    avatarUrl: payload.picture || null,
  };
}
