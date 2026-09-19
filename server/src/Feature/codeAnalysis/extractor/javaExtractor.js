function getNodeName(node) {
  const nameNode = node.childForFieldName("name");

  return nameNode ? nameNode.text : null;
}

function getLocation(node) {
  return {
    startLine: node.startPosition.row + 1,
    startColumn: node.startPosition.column + 1,
    endLine: node.endPosition.row + 1,
    endColumn: node.endPosition.column + 1,
  };
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

function createSymbol({ node, symbolName, symbolType }) {
  return {
    symbolName,
    symbolType,
    parentSymbolId: null,
    signature: getSignature(node),
    ...getLocation(node),
  };
}

function extractImport(node, references) {
  const text = node.text
    .replace(/^import\s+/i, "")
    .replace(/;\s*$/, "")
    .trim();

  if (!text) {
    return;
  }

  const isStatic = text.startsWith("static ");

  const importPath = isStatic ? text.slice("static ".length).trim() : text;

  const isWildcard = importPath.endsWith(".*");

  references.push({
    referenceType: "import",
    name: isWildcard ? null : importPath.split(".").pop(),
    sourcePath: importPath,
    referenceKind: isStatic ? "static" : isWildcard ? "wildcard" : "single",
  });
}

function extractClassLike(node, symbols, symbolType) {
  const symbolName = getNodeName(node);

  if (!symbolName) {
    return;
  }

  symbols.push(
    createSymbol({
      node,
      symbolName,
      symbolType,
    }),
  );
}

function extractMethod(node, symbols) {
  const symbolName = getNodeName(node);

  if (!symbolName) {
    return;
  }

  symbols.push(
    createSymbol({
      node,
      symbolName,
      symbolType: "method",
    }),
  );
}

function extractConstructor(node, symbols) {
  const symbolName = getNodeName(node);

  if (!symbolName) {
    return;
  }

  symbols.push(
    createSymbol({
      node,
      symbolName,
      symbolType: "constructor",
    }),
  );
}

function walkNode(node, symbols, references) {
  switch (node.type) {
    case "import_declaration":
      extractImport(node, references);
      return;

    case "class_declaration":
      extractClassLike(node, symbols, "class");
      break;

    case "interface_declaration":
      extractClassLike(node, symbols, "interface");
      break;

    case "enum_declaration":
      extractClassLike(node, symbols, "enum");
      break;

    case "annotation_type_declaration":
      extractClassLike(node, symbols, "annotation");
      break;

    case "method_declaration":
      extractMethod(node, symbols);
      break;

    case "constructor_declaration":
      extractConstructor(node, symbols);
      break;

    default:
      break;
  }

  for (const child of node.namedChildren) {
    walkNode(child, symbols, references);
  }
}

export function extractJava(tree) {
  const symbols = [];
  const references = [];

  walkNode(tree.rootNode, symbols, references);

  return {
    symbols,
    references,
  };
}
