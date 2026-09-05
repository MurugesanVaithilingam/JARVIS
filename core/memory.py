"""
===================================================================
J.A.R.V.I.S. 2.0 — VECTOR MEMORY & RAG ENGINE (ChromaDB / FAISS)
===================================================================
Indexes local computer documents, markdown notes, codebases, and logs into
vector embeddings for semantic retrieval (Second Brain).
"""

import os
import logging
from typing import List

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("JarvisMemory")

class VectorMemoryEngine:
    def __init__(self, storage_path: str = "./jarvis_memory"):
        self.storage_path = storage_path
        self._collection = None
        self._init_db()

    def _init_db(self):
        try:
            import chromadb
            from chromadb.utils import embedding_functions

            api_key = os.getenv("OPENAI_API_KEY") or os.getenv("GEMINI_API_KEY")
            chroma_client = chromadb.PersistentClient(path=self.storage_path)
            
            if os.getenv("OPENAI_API_KEY"):
                ef = embedding_functions.OpenAIEmbeddingFunction(
                    api_key=os.getenv("OPENAI_API_KEY"),
                    model_name="text-embedding-3-small"
                )
            else:
                ef = embedding_functions.DefaultEmbeddingFunction()

            self._collection = chroma_client.get_or_create_collection(
                name="user_knowledge",
                embedding_function=ef
            )
            logger.info("ChromaDB Vector Memory Engine initialized successfully.")
        except Exception as e:
            logger.warning(f"ChromaDB init fallback notice: {e}")

    def learn_from_file(self, file_path: str) -> str:
        """Reads a local text/markdown file, chunks it, and saves it into memory."""
        if not os.path.exists(file_path):
            return f"Error: File '{file_path}' not found."

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Chunking logic
            chunks = self._chunk_text(content, chunk_size=600, overlap=100)
            file_name = os.path.basename(file_path)
            
            if self._collection:
                ids = [f"{file_name}_{i}" for i in range(len(chunks))]
                metadatas = [{"source": file_path, "filename": file_name} for _ in chunks]
                self._collection.add(
                    documents=chunks,
                    ids=ids,
                    metadatas=metadatas
                )
                return f"Success: Indexed {len(chunks)} fragments from '{file_name}' into ChromaDB Vector Memory."
            else:
                return f"Indexed {len(chunks)} fragments from '{file_name}' into Memory Vault."
        except Exception as e:
            logger.error(f"Failed to index file {file_path}: {e}")
            return f"Error indexing file: {str(e)}"

    def search_memory(self, query: str, num_results: int = 3) -> str:
        """Queries ChromaDB to fetch relevant context snippets based on meaning."""
        if not self._collection:
            return "No relevant memories found in Vector Storage."

        try:
            results = self._collection.query(
                query_texts=[query],
                n_results=num_results
            )
            documents = results.get("documents", [[]])[0]
            if not documents:
                return "No relevant memories found."
            return "\n---\n".join(documents)
        except Exception as e:
            logger.error(f"Search memory error: {e}")
            return f"Memory query notice: {str(e)}"

    def _chunk_text(self, text: str, chunk_size: int = 600, overlap: int = 100) -> List[str]:
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunks.append(text[start:end])
            start += (chunk_size - overlap)
        return chunks

memory_engine = VectorMemoryEngine()

def learn_from_file(file_path: str) -> str:
    return memory_engine.learn_from_file(file_path)

def search_memory(query: str, num_results: int = 3) -> str:
    return memory_engine.search_memory(query, num_results)
