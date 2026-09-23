import { Pinecone } from "@pinecone-database/pinecone";

const apiKey = process.env.PINECONE_API_KEY;
const indexName = process.env.PINECONE_INDEX_NAME;

if (!apiKey) {
  throw new Error("Missing PINECONE_API_KEY.");
}

if (!indexName) {
  throw new Error("Missing PINECONE_INDEX_NAME.");
}

const pinecone = new Pinecone({
  apiKey,
});

export const pineconeIndex = pinecone.index(indexName);
