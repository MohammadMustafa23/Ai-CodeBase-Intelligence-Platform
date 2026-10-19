import {
  findUserByEmail,
  createUser,
  updateUser,
} from "../Db_query/userQuery.js";

export async function findOrCreateUser({
  displayName,
  email,
  avatarUrl = null,
}) {
  const existingUser = await findUserByEmail(email);

  if (!existingUser) {
    const newUser = await createUser({
      displayName,
      email,
      avatarUrl,
    });

    return {
      user: newUser,
      created: true,
    };
  }

  const needsUpdate =
    existingUser.display_name !== displayName ||
    existingUser.avatar_url !== avatarUrl ||
    existingUser.email !== email;

  if (needsUpdate) {
    const updatedUser = await updateUser({
      userId: existingUser.user_id,
      displayName,
      avatarUrl,
      email,
    });

    return {
      user: updatedUser,
      created: false,
    };
  }

  return {
    user: existingUser,
    created: false,
  };
}
