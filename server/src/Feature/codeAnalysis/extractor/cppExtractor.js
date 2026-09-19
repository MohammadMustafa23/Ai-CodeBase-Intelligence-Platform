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

function getNodeName(node) {
  const nameNode = node.childForFieldName("name");

  if (nameNode) {
    return nameNode.text;
  }

  return null;
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

function extractInclude(node, references) {
  const text = node.text.trim();

  // #include <iostream>
  // #include "utils/helper.h"

  const match = text.match(/^#include\s*[<"]([^>"]+)[>"]/);

  if (!match) {
    return;
  }

  const sourcePath = match[1];

  const referenceKind = text.includes("<") ? "system" : "local";

  references.push({
    referenceType: "import",
    name: sourcePath.split("/").pop(),
    sourcePath,
    referenceKind,
  });
}

function extractClass(node, symbols) {
  const name = getNodeName(node);

  if (!name) {
    return;
  }

  symbols.push(createSymbol(node, name, "class"));
}

function extractStruct(node, symbols) {
  const name = getNodeName(node);

  if (!name) {
    return;
  }

  symbols.push(createSymbol(node, name, "struct"));
}

function extractEnum(node, symbols) {
  const name = getNodeName(node);

  if (!name) {
    return;
  }

  symbols.push(createSymbol(node, name, "enum"));
}

function extractFunction(node, symbols) {
  const declarator = node.childForFieldName("declarator");

  let name = null;

  if (declarator) {
    const identifier =
      declarator.childForFieldName("declarator") ||
      declarator.childForFieldName("name");

    if (identifier) {
      name = identifier.text;
    } else {
      name = declarator.text;
    }
  }

  if (!name) {
    return;
  }

  symbols.push(createSymbol(node, name, "function"));
}

function extractFieldDeclaration(node, symbols) {
  const declarator = node.namedChildren.find(
    (child) => child.type === "field_declaration",
  );

  if (!declarator) {
    return;
  }

  const nameNode = declarator.childForFieldName("declarator");

  if (!nameNode) {
    return;
  }

  symbols.push(createSymbol(node, nameNode.text, "field"));
}

function walkNode(node, symbols, references) {
  switch (node.type) {
    case "preproc_include":
      extractInclude(node, references);
      return;

    case "class_specifier":
      extractClass(node, symbols);
      break;

    case "struct_specifier":
      extractStruct(node, symbols);
      break;

    case "enum_specifier":
      extractEnum(node, symbols);
      break;

    case "function_definition":
      extractFunction(node, symbols);
      break;

    default:
      break;
  }

  for (const child of node.namedChildren) {
    walkNode(child, symbols, references);
  }
}

export function extractCpp(tree) {
  const symbols = [];
  const references = [];

  walkNode(tree.rootNode, symbols, references);

  return {
    symbols,
    references,
  };
}
