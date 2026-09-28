const ALLOWED_SCOPES = new Set([
  "REPOSITORY",
  "CONVERSATION",
  "GENERAL",
  "CLARIFICATION",
]);

function validateGuardResult(result) {
  if (!result || typeof result !== "object") {
    throw new TypeError("Guard result must be an object");
  }

  if (typeof result.understood !== "boolean") {
    throw new TypeError("Guard result 'understood' must be boolean");
  }

  if (typeof result.scope !== "string" || !ALLOWED_SCOPES.has(result.scope)) {
    throw new Error(`Invalid guard scope: ${result.scope}`);
  }

  if (!Array.isArray(result.resolvedReferences)) {
    throw new TypeError("resolvedReferences must be an array");
  }

  if (typeof result.needsClarification !== "boolean") {
    throw new TypeError("needsClarification must be boolean");
  }

  for (const reference of result.resolvedReferences) {
    if (!reference || typeof reference !== "object") {
      throw new TypeError("Each resolved reference must be an object");
    }

    if (
      typeof reference.original !== "string" ||
      reference.original.trim().length === 0
    ) {
      throw new TypeError("Reference original must be a non-empty string");
    }

    if (
      typeof reference.resolvedTo !== "string" ||
      reference.resolvedTo.trim().length === 0
    ) {
      throw new TypeError("Reference resolvedTo must be a non-empty string");
    }
  }

  if (!result.understood) {
    if (result.scope !== "CLARIFICATION") {
      throw new Error(
        "An understood=false result must have CLARIFICATION scope",
      );
    }

    if (!result.needsClarification) {
      throw new Error("An understood=false result must require clarification");
    }
  }

  if (result.needsClarification) {
    if (result.scope !== "CLARIFICATION") {
      throw new Error("needsClarification=true requires CLARIFICATION scope");
    }
  }

  if (result.scope === "CLARIFICATION" && !result.needsClarification) {
    throw new Error("CLARIFICATION scope must require clarification");
  }

  if (result.scope !== "CLARIFICATION" && result.needsClarification) {
    throw new Error("Non-CLARIFICATION scope cannot require clarification");
  }

  return result;
}

export { ALLOWED_SCOPES, validateGuardResult };
