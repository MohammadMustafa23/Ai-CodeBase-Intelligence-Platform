function getLocation(node) {
  return {
    startLine: node.startPosition.row + 1,
    startColumn: node.startPosition.column + 1,
    endLine: node.endPosition.row + 1,
    endColumn: node.endPosition.column + 1,
  };
}

function getNodeName(node) {
  const nameNode = node.childForFieldName("name");

  return nameNode ? nameNode.text : null;
}

function getSignature(node) {
  if (!node?.text) {
    return null;
  }

  const text = node.text.trim();

  const bodyIndex = text.indexOf("{");

  if (bodyIndex !== -1) {
    return text.slice(0, bodyIndex).trim();
  }

  return text;
}

function createSymbol(node, symbolName, symbolType) {
  return {
    symbolName,
    symbolType,
    parentSymbolId: null,
    signature: getSignature(node),
    ...getLocation(node),
  };
}

/* -------------------- IMPORTS -------------------- */

function extractImport(node, references) {
  const sourceNode = node.childForFieldName("source");

  const sourcePath = sourceNode
    ? sourceNode.text.replace(/^['"]|['"]$/g, "")
    : null;

  const importClause = node.namedChildren.find(
    (child) => child.type === "import_clause",
  );

  if (!importClause) {
    references.push({
      referenceType: "import",
      name: null,
      sourcePath,
      referenceKind: "side-effect",
    });

    return;
  }

  for (const child of importClause.namedChildren) {
    // import User from "./User"
    if (child.type === "identifier") {
      references.push({
        referenceType: "import",
        name: child.text,
        sourcePath,
        referenceKind: "default",
      });

      continue;
    }

    // import * as User from "./User"
    if (child.type === "namespace_import") {
      const nameNode = child.namedChildren.find(
        (item) => item.type === "identifier",
      );

      references.push({
        referenceType: "import",
        name: nameNode?.text || null,
        sourcePath,
        referenceKind: "namespace",
      });

      continue;
    }

    // import { User, createUser } from "./User"
    if (child.type === "named_imports") {
      for (const item of child.namedChildren) {
        if (item.type === "import_specifier") {
          const nameNode = item.childForFieldName("name");
          const aliasNode = item.childForFieldName("alias");

          references.push({
            referenceType: "import",
            name: nameNode?.text || null,
            sourcePath,
            referenceKind: aliasNode ? "aliased" : "named",
          });
        }
      }
    }
  }
}

/* -------------------- EXPORTS -------------------- */

function extractExport(node, references) {
  const declaration = node.childForFieldName("declaration");

  if (declaration) {
    const symbolName = getNodeName(declaration);

    if (symbolName) {
      references.push({
        referenceType: "export",
        name: symbolName,
        sourcePath: null,
        referenceKind: "declaration",
      });
    }

    return;
  }

  const exportClause = node.namedChildren.find(
    (child) => child.type === "export_clause",
  );

  if (exportClause) {
    for (const child of exportClause.namedChildren) {
      if (child.type !== "export_specifier") {
        continue;
      }

      const nameNode = child.childForFieldName("name");

      const aliasNode = child.childForFieldName("alias");

      references.push({
        referenceType: "export",
        name: nameNode?.text || null,
        sourcePath: null,
        referenceKind: aliasNode ? "aliased" : "named",
      });
    }

    return;
  }

  // export default Something
  const defaultNode = node.namedChildren.find(
    (child) => child.type === "identifier",
  );

  if (defaultNode) {
    references.push({
      referenceType: "export",
      name: defaultNode.text,
      sourcePath: null,
      referenceKind: "default",
    });
  }
}

/* -------------------- SYMBOLS -------------------- */

function extractFunction(node, symbols) {
  const name = getNodeName(node);

  if (!name) {
    return;
  }

  symbols.push(createSymbol(node, name, "function"));
}

function extractClass(node, symbols) {
  const name = getNodeName(node);

  if (!name) {
    return;
  }

  symbols.push(createSymbol(node, name, "class"));
}

function extractInterface(node, symbols) {
  const name = getNodeName(node);

  if (!name) {
    return;
  }

  symbols.push(createSymbol(node, name, "interface"));
}

function extractEnum(node, symbols) {
  const name = getNodeName(node);

  if (!name) {
    return;
  }

  symbols.push(createSymbol(node, name, "enum"));
}

function extractTypeAlias(node, symbols) {
  const name = getNodeName(node);

  if (!name) {
    return;
  }

  symbols.push(createSymbol(node, name, "type"));
}

function extractMethod(node, symbols) {
  const name = getNodeName(node);

  if (!name) {
    return;
  }

  symbols.push(createSymbol(node, name, "method"));
}

function extractVariableFunction(node, symbols) {
  const nameNode = node.childForFieldName("name");

  const valueNode = node.childForFieldName("value");

  if (!nameNode || !valueNode) {
    return;
  }

  if (valueNode.type === "arrow_function" || valueNode.type === "function") {
    symbols.push(createSymbol(node, nameNode.text, "function"));
  }
}

/* -------------------- TREE WALK -------------------- */

function walkNode(node, symbols, references) {
  switch (node.type) {
    case "import_statement":
      extractImport(node, references);
      return;

    case "export_statement":
      extractExport(node, references);
      break;

    case "function_declaration":
      extractFunction(node, symbols);
      break;

    case "class_declaration":
      extractClass(node, symbols);
      break;

    case "interface_declaration":
      extractInterface(node, symbols);
      break;

    case "enum_declaration":
      extractEnum(node, symbols);
      break;

    case "type_alias_declaration":
      extractTypeAlias(node, symbols);
      break;

    case "method_definition":
      extractMethod(node, symbols);
      break;

    case "variable_declarator":
      extractVariableFunction(node, symbols);
      break;

    default:
      break;
  }

  for (const child of node.namedChildren) {
    walkNode(child, symbols, references);
  }
}

export function extractTypeScript(tree) {
  const symbols = [];
  const references = [];

  walkNode(tree.rootNode, symbols, references);

  return {
    symbols,
    references,
  };
}
