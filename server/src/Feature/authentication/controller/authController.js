import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { google } from "googleapis";

import {
  findUserByEmail,
  createUser,
  updateUser,
  findUserById,
} from "../Db_query/userQuery.js";

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,

  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GITHUB_CALLBACK_URL,

  FRONTEND_URL = "http://localhost:5173",

  JWT_SECRET,
  JWT_EXPIRES_IN = "7d",
} = process.env;

const AUTH_COOKIE_NAME = "codebase_token";

const GOOGLE_STATE_COOKIE = "google_oauth_state";
const GITHUB_STATE_COOKIE = "github_oauth_state";

const googleOAuthClient = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
);

function generateState() {
  return crypto.randomBytes(32).toString("hex");
}

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

function stateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
    path: "/",
  };
}

function authCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

// ==================================================
// GOOGLE LOGIN
// ==================================================

export function googleLoginController(req, res) {
  try {
    const state = generateState();

    res.cookie(GOOGLE_STATE_COOKIE, state, stateCookieOptions());

    const authUrl = googleOAuthClient.generateAuthUrl({
      access_type: "online",
      scope: ["openid", "email", "profile"],
      state,
      prompt: "select_account",
    });

    return res.status(200).json({
      success: true,
      data: {
        authUrl,
      },
    });
  } catch (error) {
    console.error("Google Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to start Google authentication.",
    });
  }
}

// ==================================================
// GOOGLE CALLBACK
// ==================================================

export async function googleCallbackController(req, res) {
  try {
    const { code, state } = req.query;

    const savedState = req.cookies[GOOGLE_STATE_COOKIE];

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Google authorization code is missing.",
      });
    }

    if (!state || !savedState || state !== savedState) {
      return res.status(400).json({
        success: false,
        message: "Invalid Google authentication state.",
      });
    }

    res.clearCookie(GOOGLE_STATE_COOKIE, stateCookieOptions());

    const { tokens } = await googleOAuthClient.getToken(code);

    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.email) {
      return res.status(400).json({
        success: false,
        message: "Google email is unavailable.",
      });
    }

    let user = await findUserByEmail(payload.email);

    if (!user) {
      user = await createUser({
        displayName: payload.name || "Google User",
        email: payload.email,
        avatarUrl: payload.picture || null,
      });
    } else {
      user = await updateUser({
        userId: user.user_id,
        displayName: payload.name || user.display_name,
        email: payload.email,
        avatarUrl: payload.picture || user.avatar_url,
      });
    }

    const token = generateToken(user.user_id);

    res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());

    // ✅ CHANGED:
    // Set cookie and send user to frontend dashboard.
    return res.redirect(`${FRONTEND_URL}/dashboard`);
  } catch (error) {
    console.error("Google Authentication Error:", error);

    return res.status(500).json({
      success: false,
      message: "Google authentication failed.",
    });
  }
}

// ==================================================
// GITHUB LOGIN
// ==================================================

export function githubLoginController(req, res) {
  try {
    const state = generateState();

    res.cookie(GITHUB_STATE_COOKIE, state, stateCookieOptions());

    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: GITHUB_CALLBACK_URL,
      scope: "read:user user:email",
      state,
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

    return res.status(200).json({
      success: true,
      data: {
        authUrl,
      },
    });
  } catch (error) {
    console.error("GitHub Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to start GitHub authentication.",
    });
  }
}

// ==================================================
// GITHUB CALLBACK
// ==================================================

export async function githubCallbackController(req, res) {
  try {
    const { code, state } = req.query;

    const savedState = req.cookies[GITHUB_STATE_COOKIE];

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "GitHub authorization code is missing.",
      });
    }

    if (!state || !savedState || state !== savedState) {
      return res.status(400).json({
        success: false,
        message: "Invalid GitHub authentication state.",
      });
    }

    res.clearCookie(GITHUB_STATE_COOKIE, stateCookieOptions());

    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,

          client_secret: GITHUB_CLIENT_SECRET,

          code,

          redirect_uri: GITHUB_CALLBACK_URL,
        }),
      },
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error("GitHub access token was not returned.");
    }

    const accessToken = tokenData.access_token;

    const githubResponse = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",

        Authorization: `Bearer ${accessToken}`,

        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!githubResponse.ok) {
      throw new Error("Unable to fetch GitHub user.");
    }

    const githubUser = await githubResponse.json();

    let email = githubUser.email || null;

    if (!email) {
      const emailResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Accept: "application/vnd.github+json",

          Authorization: `Bearer ${accessToken}`,

          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      if (!emailResponse.ok) {
        throw new Error("Unable to fetch GitHub email.");
      }

      const emails = await emailResponse.json();

      const verifiedEmail = emails.find(
        (item) => item.primary === true && item.verified === true,
      );

      email = verifiedEmail?.email || null;
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "A verified GitHub email is required.",
      });
    }

    let user = await findUserByEmail(email);

    if (!user) {
      user = await createUser({
        displayName: githubUser.name || githubUser.login || "GitHub User",

        email,

        avatarUrl: githubUser.avatar_url || null,
      });
    } else {
      user = await updateUser({
        userId: user.user_id,

        displayName: githubUser.name || githubUser.login || user.display_name,

        email,

        avatarUrl: githubUser.avatar_url || user.avatar_url,
      });
    }

    const token = generateToken(user.user_id);

    res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());

    // ✅ CHANGED:
    // Set cookie and send user to frontend dashboard.
    return res.redirect(`${FRONTEND_URL}/dashboard`);
  } catch (error) {
    console.error("GitHub Authentication Error:", error);

    return res.status(500).json({
      success: false,
      message: "GitHub authentication failed.",
    });
  }
}

// ==================================================
// CURRENT USER
// ==================================================

export async function getCurrentUserController(req, res) {
  try {
    const user = await findUserById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Get Current User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch current user.",
    });
  }
}

// ==================================================
// LOGOUT
// ==================================================

export function logoutController(req, res) {
  try {
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    console.error("Logout Error:", error);

    return res.status(500).json({
      success: false,
      message: "Logout failed.",
    });
  }
}
