import { tool } from "@langchain/core/tools";

import { invokeRetrievalModel } from "../model/retrievalModel.js";
import { buildRetrievalPrompt } from "../model/retrievalPrompt.js";

import {
  postgresToolSchema,
  pineconeToolSchema,
  neo4jToolSchema,
  sourceReaderToolSchema,
} from "../tools/retrievalToolSchemas.js";

import { searchPostgresTool } from "../tools/postgresTool.js";
import { searchPineconeTool } from "../tools/pineconeTool.js";
import { searchNeo4jTool } from "../tools/neo4jTool.js";
import { readSourceFile } from "../tools/sourceReaderTool.js";

const MAX_TOOL_CALLS = 4;

const boundModels = new WeakMap();

function getValidatedModel(model) {
  console.log("[PHASE 8] Validating Retrieval LLM");

  if (!model || typeof model.invoke !== "function") {
    throw new TypeError(
      "A valid Retrieval LLM model with invoke() is required",
    );
  }

  if (typeof model.bindTools !== "function") {
    throw new TypeError(
      "The Retrieval LLM model does not support native tool calling.",
    );
  }

  console.log("[PHASE 8] Retrieval LLM validation successful");

  return model;
}

function createRetrievalTools({ repositoryId }) {
  if (!repositoryId) {
    throw new TypeError("repositoryId is required");
  }

  console.log(
    `[PHASE 8] Creating retrieval tools for repository: ${repositoryId}`,
  );

  const postgresTool = tool(
    async (input) => {
      console.log("[PHASE 8] Executing POSTGRESQL tool");

      return searchPostgresTool({
        repositoryId,
        ...input,
      });
    },
    {
      name: "POSTGRESQL",
      description:
        "Retrieve exact repository metadata from PostgreSQL. Use this for files, symbols, and code chunks. Do not generate SQL.",
      schema: postgresToolSchema,
    },
  );

  const pineconeTool = tool(
    async (input) => {
      console.log("[PHASE 8] Executing PINECONE tool");

      return searchPineconeTool({
        repositoryId,
        ...input,
      });
    },
    {
      name: "PINECONE",
      description:
        "Search repository code semantically by meaning. Use this when the question requires conceptually related code.",
      schema: pineconeToolSchema,
    },
  );

  const neo4jTool = tool(
    async (input) => {
      console.log("[PHASE 8] Executing NEO4J tool");

      return searchNeo4jTool({
        repositoryId,
        ...input,
      });
    },
    {
      name: "NEO4J",
      description:
        "Retrieve repository relationships such as imports, importers, file connections, and symbol relationships. Do not generate Cypher.",
      schema: neo4jToolSchema,
    },
  );

  const sourceReaderTool = tool(
    async (input) => {
      console.log("[PHASE 8] Executing SOURCE_READER tool");

      return readSourceFile({
        repositoryId,
        ...input,
      });
    },
    {
      name: "SOURCE_READER",
      description:
        "Read actual source code from the repository filesystem. Use this when the requested information requires understanding the implementation.",
      schema: sourceReaderToolSchema,
    },
  );

  console.log(
    "[PHASE 8] Retrieval tools ready: POSTGRESQL, PINECONE, NEO4J, SOURCE_READER",
  );

  return {
    tools: [postgresTool, pineconeTool, neo4jTool, sourceReaderTool],

    byName: {
      POSTGRESQL: postgresTool,
      PINECONE: pineconeTool,
      NEO4J: neo4jTool,
      SOURCE_READER: sourceReaderTool,
    },
  };
}

function getRetrievalRuntime({ model, repositoryId }) {
  const retrievalModel = getValidatedModel(model);

  let repositoryRuntimes = boundModels.get(retrievalModel);

  if (!repositoryRuntimes) {
    repositoryRuntimes = new Map();

    boundModels.set(retrievalModel, repositoryRuntimes);

    console.log("[PHASE 8] Created model runtime cache");
  }

  let runtime = repositoryRuntimes.get(repositoryId);

  if (!runtime) {
    const retrievalTools = createRetrievalTools({
      repositoryId,
    });

    const boundModel = retrievalModel.bindTools(retrievalTools.tools);

    runtime = {
      boundModel,
      tools: retrievalTools,
    };

    repositoryRuntimes.set(repositoryId, runtime);

    console.log("[PHASE 8] Retrieval model bound with tools");
  } else {
    console.log("[PHASE 8] Reusing cached retrieval runtime");
  }

  return runtime;
}

function getToolCalls(response) {
  if (!response || !Array.isArray(response.tool_calls)) {
    return [];
  }

  return response.tool_calls;
}

function createToolCallKey(toolCall) {
  return `${toolCall.name}:${JSON.stringify(toolCall.args ?? {})}`;
}

function getUniqueToolCalls(toolCalls) {
  const uniqueCalls = [];
  const seen = new Set();

  for (const toolCall of toolCalls) {
    const key = createToolCallKey(toolCall);

    if (seen.has(key)) {
      console.log(
        `[PHASE 8] Duplicate planner tool call skipped: ${toolCall.name}`,
      );

      continue;
    }

    seen.add(key);
    uniqueCalls.push(toolCall);
  }

  return uniqueCalls;
}

async function executeToolCall({ tool, toolCall }) {
  const toolName = toolCall.name;

  console.log(`[PHASE 8] Tool requested: ${toolName}`);

  console.log(`[PHASE 8] Tool call ID: ${toolCall.id ?? "none"}`);

  console.log(`[PHASE 8] Tool args: ${JSON.stringify(toolCall.args ?? {})}`);

  const startedAt = Date.now();

  try {
    const result = await tool.invoke(toolCall.args ?? {});

    const duration = Date.now() - startedAt;

    const resultCount = Array.isArray(result) ? result.length : result ? 1 : 0;

    console.log(`[PHASE 8] Tool completed: ${toolName}`);

    console.log(`[PHASE 8] Tool duration: ${duration}ms`);

    console.log(`[PHASE 8] Tool result count: ${resultCount}`);

    return {
      tool: toolName,
      toolCallId: toolCall.id ?? null,
      success: true,
      result,
    };
  } catch (error) {
    const duration = Date.now() - startedAt;

    console.error(`[PHASE 8] Tool failed: ${toolName}`);

    console.error(`[PHASE 8] Tool duration: ${duration}ms`);

    console.error(`[PHASE 8] Tool error: ${error.message}`);

    return {
      tool: toolName,
      toolCallId: toolCall.id ?? null,
      success: false,
      result: null,
      error: error.message,
    };
  }
}

async function executeToolCalls({ repositoryId, toolCalls, retrievalTools }) {
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
    console.log("[PHASE 8] No retrieval tools requested");

    return [];
  }

  if (!retrievalTools) {
    throw new TypeError("retrievalTools is required");
  }

  if (toolCalls.length > MAX_TOOL_CALLS) {
    throw new Error(
      `Retrieval planner requested ${toolCalls.length} tools. Maximum allowed is ${MAX_TOOL_CALLS}.`,
    );
  }

  console.log(
    `[PHASE 8] Executing ${toolCalls.length} retrieval tool(s) in parallel`,
  );

  const tasks = toolCalls.map((toolCall) => {
    const selectedTool = retrievalTools.byName[toolCall.name];

    if (!selectedTool) {
      console.error(`[PHASE 8] Unknown retrieval tool: ${toolCall.name}`);

      return Promise.resolve({
        tool: toolCall.name,
        toolCallId: toolCall.id ?? null,
        success: false,
        result: null,
        error: `Unknown retrieval tool: ${toolCall.name}`,
      });
    }

    return executeToolCall({
      tool: selectedTool,
      toolCall,
    });
  });

  const results = await Promise.all(tasks);

  console.log(
    `[PHASE 8] Parallel retrieval completed: ${results.length} result(s)`,
  );

  return results;
}

async function runRetrieval({ model, repositoryId, question, context = null }) {
  console.log("\n========================================");

  console.log("[PHASE 8] Retrieval started");

  console.log("========================================");

  if (!repositoryId) {
    throw new TypeError("repositoryId is required");
  }

  if (typeof question !== "string" || question.trim().length === 0) {
    throw new TypeError("question must be a non-empty string");
  }

  console.log(`[PHASE 8] Repository ID: ${repositoryId}`);

  console.log(`[PHASE 8] Question: ${question.trim()}`);

  const runtime = getRetrievalRuntime({
    model,
    repositoryId,
  });

  const plannerPrompt = buildRetrievalPrompt({
    repositoryId,
    question: question.trim(),
    context,
    toolResults: [],
  });

  console.log("[PHASE 8] Retrieval planner prompt created");

  console.log("[PHASE 8] Calling Retrieval Planner LLM");

  const startedAt = Date.now();

  const response = await invokeRetrievalModel({
    model: runtime.boundModel,
    input: [
      {
        role: "user",
        content: plannerPrompt,
      },
    ],
  });

  const duration = Date.now() - startedAt;

  console.log(`[PHASE 8] Retrieval Planner LLM responded in ${duration}ms`);

  const toolCalls = getToolCalls(response);

  console.log(`[PHASE 8] Planner requested ${toolCalls.length} tool(s)`);

  if (toolCalls.length === 0) {
    console.log("[PHASE 8] Planner requested no retrieval tools");

    return {
      status: "DONE",
      toolCalls: [],
      results: [],
    };
  }

  const uniqueToolCalls = getUniqueToolCalls(toolCalls);

  console.log(`[PHASE 8] Unique retrieval tools: ${uniqueToolCalls.length}`);

  console.log(
    `[PHASE 8] Requested tools: ${uniqueToolCalls
      .map((toolCall) => toolCall.name)
      .join(", ")}`,
  );

  const results = await executeToolCalls({
    repositoryId,
    toolCalls: uniqueToolCalls,
    retrievalTools: runtime.tools,
  });

  console.log(`[PHASE 8] Raw retrieval results collected: ${results.length}`);

  console.log("[PHASE 8] Retrieval completed");

  console.log("========================================\n");

  return {
    status: "DONE",
    toolCalls: uniqueToolCalls,
    results,
  };
}

export { runRetrieval, executeToolCalls };
