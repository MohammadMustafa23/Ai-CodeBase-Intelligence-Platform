function getNodeLocation(node) {
  return {
    startLine: node.startPosition.row + 1,
    startColumn: node.startPosition.column + 1,
    endLine: node.endPosition.row + 1,
    endColumn: node.endPosition.column + 1,
  };
}

function getNodeName(node) {
  if (!node) {
    return null;
  }

  const nameNode = node.childForFieldName("name");

  if (nameNode) {
    return nameNode.text;
  }

  for (const child of node.namedChildren) {
    if (child.type === "identifier") {
      return child.text;
    }
  }

  return null;
}

function extractFunction(node) {
  const name = getNodeName(node);

  return {
    symbolName: name || "anonymous",
    symbolType: "function",
    signature: node.text.split("{")[0].trim(),
    ...getNodeLocation(node),
  };
}

function extractClass(node) {
  const name = getNodeName(node);

  return {
    symbolName: name || "anonymous",
    symbolType: "class",
    signature: node.text.split("{")[0].trim(),
    ...getNodeLocation(node),
  };
}
function extractImport(node) {
  const sourceNode = node.childForFieldName("source");

  const sourcePath = sourceNode?.text?.replace(/^["']|["']$/g, "") || null;

  const names = [];

  const importClause = node.namedChildren.find(
    (child) => child.type === "import_clause",
  );

  if (importClause) {
    function collectImportNames(currentNode) {
      if (!currentNode) {
        return;
      }

      // import { loginUser, logoutUser } ...
      if (currentNode.type === "import_specifier") {
        const nameNode = currentNode.namedChildren.find(
          (child) => child.type === "identifier",
        );

        const identifiers = currentNode.namedChildren.filter(
          (child) => child.type === "identifier",
        );

        names.push({
          name: identifiers[0]?.text || null,
          alias: identifiers[1]?.text || null,
        });

        return;
      }

      // import * as Utils ...
      if (currentNode.type === "namespace_import") {
        const identifier = currentNode.namedChildren.find(
          (child) => child.type === "identifier",
        );

        names.push({
          name: identifier?.text || null,
          alias: null,
        });

        return;
      }

      // import User from ...
      if (
        currentNode.type === "identifier" &&
        currentNode.parent?.type === "import_clause"
      ) {
        names.push({
          name: currentNode.text,
          alias: null,
        });

        return;
      }

      for (const child of currentNode.namedChildren) {
        collectImportNames(child);
      }
    }

    collectImportNames(importClause);
  }

  return {
    referenceType: "import",

    name: names.length === 1 ? names[0].name : null,

    names,

    sourcePath,

    referenceKind: names.length === 1 ? "single" : "named",

    ...getNodeLocation(node),
  };
}

function extractExport(node) {
  const declaration = node.childForFieldName("declaration");

  // export function loginController() {}
  if (declaration) {
    const name = getNodeName(declaration);

    return {
      referenceType: "export",
      name,
      names: name ? [name] : [],
      sourcePath: null,
      referenceKind:
        declaration.type === "function_declaration"
          ? "function"
          : declaration.type === "class_declaration"
            ? "class"
            : "named",
      ...getNodeLocation(node),
    };
  }

  // export default User;
  const directIdentifier = node.namedChildren.find(
    (child) => child.type === "identifier",
  );

  if (directIdentifier) {
    return {
      referenceType: "export",
      name: directIdentifier.text,
      names: [directIdentifier.text],
      sourcePath: null,
      referenceKind: "default",
      ...getNodeLocation(node),
    };
  }

  // export { loginUser, logoutUser };
  const exportClause = node.namedChildren.find(
    (child) => child.type === "export_clause",
  );

  if (exportClause) {
    const names = [];

    for (const child of exportClause.namedChildren) {
      if (child.type === "export_specifier") {
        const identifiers = child.namedChildren.filter(
          (node) => node.type === "identifier",
        );

        if (identifiers[0]) {
          names.push(identifiers[0].text);
        }
      }
    }

    return {
      referenceType: "export",
      name: names.length === 1 ? names[0] : null,
      names,
      sourcePath: null,
      referenceKind: "named",
      ...getNodeLocation(node),
    };
  }

  return {
    referenceType: "export",
    name: null,
    names: [],
    sourcePath: null,
    referenceKind: "unknown",
    ...getNodeLocation(node),
  };
}

function walkTree(node, result) {
  switch (node.type) {
    case "function_declaration":
      result.symbols.push(extractFunction(node));
      break;

    case "class_declaration":
      result.symbols.push(extractClass(node));
      break;

    case "import_statement":
      result.references.push(extractImport(node));
      break;

    case "export_statement":
      result.references.push(extractExport(node));
      break;

    default:
      break;
  }

  for (const child of node.namedChildren) {
    walkTree(child, result);
  }
}

export function extractJavaScript(tree) {
  const result = {
    symbols: [],
    references: [],
  };

  walkTree(tree.rootNode, result);

  return result;
}
