const ROUTES = Object.freeze({
  REPOSITORY: "REPOSITORY",
  CONVERSATION: "CONVERSATION",
  GENERAL: "GENERAL",
  CLARIFICATION: "CLARIFICATION",
});

function routeGuardResult(guardResult) {
  if (!guardResult || typeof guardResult !== "object") {
    throw new TypeError("guardResult must be an object");
  }

  switch (guardResult.scope) {
    case ROUTES.REPOSITORY:
      return {
        route: ROUTES.REPOSITORY,
        action: "RETRIEVE",
      };

    case ROUTES.CONVERSATION:
      return {
        route: ROUTES.CONVERSATION,
        action: "DIRECT_RESPONSE",
      };

    case ROUTES.GENERAL:
      return {
        route: ROUTES.GENERAL,
        action: "OUT_OF_SCOPE",
      };

    case ROUTES.CLARIFICATION:
      return {
        route: ROUTES.CLARIFICATION,
        action: "CLARIFICATION",
      };

    default:
      throw new Error(`Unsupported guard scope: ${guardResult.scope}`);
  }
}

export { ROUTES, routeGuardResult };
