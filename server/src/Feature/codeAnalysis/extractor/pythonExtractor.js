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
  if (!node.text) {
    return null;
  }

  const firstLine = node.text
    .split(/\r?\n/)
    .find((line) => line.trim().length > 0);

  return firstLine ? firstLine.trim() : null;
}

function createSymbol({ node, symbolName, symbolType }) {
  const location = getLocation(node);

  return {
    symbolName,
    symbolType,
    parentSymbolId: null,
    signature: getSignature(node),
    ...location,
  };
}

function extractFunction(node, symbols, insideClass = false) {
  const symbolName = getNodeName(node);

  if (!symbolName) {
    return;
  }

  symbols.push(
    createSymbol({
      node,
      symbolName,
      symbolType: insideClass ? "method" : "function",
    }),
  );

  // Functions can contain nested functions/classes.
  for (const child of node.namedChildren) {
    walkNode(child, symbols, true, insideClass);
  }
}

function extractClass(node, symbols) {
  const symbolName = getNodeName(node);

  if (symbolName) {
    symbols.push(
      createSymbol({
        node,
        symbolName,
        symbolType: "class",
      }),
    );
  }

  // Process the class body so methods/classes inside it are discovered.
  for (const child of node.namedChildren) {
    walkNode(child, symbols, false, true);
  }
}

function extractDecoratedDefinition(node, symbols, insideClass) {
  for (const child of node.namedChildren) {
    if (
      child.type === "function_definition" ||
      child.type === "class_definition"
    ) {
      walkNode(child, symbols, false, insideClass);
      return;
    }
  }
}

function extractImport(node, references) {
  for (const child of node.namedChildren) {
    if (child.type === "dotted_name") {
      references.push({
        referenceType: "import",
        name: child.text,
        sourcePath: child.text,
        referenceKind: "single",
      });

      continue;
    }

    if (child.type === "aliased_import") {
      const importedName = child.childForFieldName("name");
      const alias = child.childForFieldName("alias");

      references.push({
        referenceType: "import",
        name: importedName?.text || null,
        sourcePath: importedName?.text || null,
        referenceKind: alias ? "aliased" : "single",
      });
    }
  }
}

function extractFromImport(node, references) {
  const moduleNode = node.childForFieldName("module_name");
  const sourcePath = moduleNode?.text || null;

  for (const child of node.namedChildren) {
    if (child === moduleNode) {
      continue;
    }

    if (child.type === "dotted_name") {
      references.push({
        referenceType: "import",
        name: child.text,
        sourcePath,
        referenceKind: "named",
      });

      continue;
    }

    if (child.type === "aliased_import") {
      const importedName = child.childForFieldName("name");
      const alias = child.childForFieldName("alias");

      references.push({
        referenceType: "import",
        name: importedName?.text || null,
        sourcePath,
        referenceKind: alias ? "aliased" : "named",
      });

      continue;
    }

    if (child.type === "wildcard_import") {
      references.push({
        referenceType: "import",
        name: null,
        sourcePath,
        referenceKind: "wildcard",
      });
    }
  }
}

function walkNode(node, symbols, insideFunction = false, insideClass = false) {
  switch (node.type) {
    case "function_definition":
      extractFunction(node, symbols, insideClass && !insideFunction);
      return;

    case "class_definition":
      extractClass(node, symbols);
      return;

    case "decorated_definition":
      extractDecoratedDefinition(node, symbols, insideClass && !insideFunction);
      return;

    default:
      break;
  }

  for (const child of node.namedChildren) {
    if (child.type === "import_statement") {
      continue;
    }

    if (child.type === "import_from_statement") {
      continue;
    }

    walkNode(
      child,
      symbols,
      insideFunction || node.type === "function_definition",
      insideClass,
    );
  }
}

export function extractPython(tree) {
  const symbols = [];
  const references = [];

  function walk(node, insideFunction = false, insideClass = false) {
    if (node.type === "import_statement") {
      extractImport(node, references);
      return;
    }

    if (node.type === "import_from_statement") {
      extractFromImport(node, references);
      return;
    }

    if (node.type === "function_definition") {
      extractFunction(node, symbols, insideClass && !insideFunction);
      return;
    }

    if (node.type === "class_definition") {
      extractClass(node, symbols);
      return;
    }

    if (node.type === "decorated_definition") {
      extractDecoratedDefinition(node, symbols, insideClass && !insideFunction);
      return;
    }

    for (const child of node.namedChildren) {
      walk(
        child,
        insideFunction || node.type === "function_definition",
        insideClass,
      );
    }
  }

  walk(tree.rootNode);

  return {
    symbols,
    references,
  };
}
