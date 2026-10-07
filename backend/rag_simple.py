import os
import json
from typing import Dict, Any
import chromadb
from chromadb.utils import embedding_functions
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

class AirlineRAGSystem:
    def __init__(self):
        # Use Chroma's built-in embedding function (no PyTorch required)
        self.embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        
        # Initialize ChromaDB
        self.chroma_client = chromadb.PersistentClient(path="./chroma_db")
        
        # Initialize Groq
        self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.model = "mixtral-8x7b-32768"
        
        # Knowledge base (same as before, shortened for brevity)
        self.airline_knowledge = {
            "check-in": "Check-in opens 24 hours before departure...",
            "baggage": "Economy: 1 carry-on (7kg)...",
            "flight_change": "$50 change fee...",
            "cancellation": "Full refund within 24 hours...",
            "pet_policy": "Pets under 20 lbs allowed...",
            "special_assistance": "Wheelchair service available...",
            "lounge_access": "Business class passengers...",
            "meal_service": "Meals on flights over 2 hours..."
        }
    
    def initialize_knowledge_base(self):
        """Initialize the vector database"""
        collection = self.chroma_client.get_or_create_collection(
            name="airline_knowledge",
            embedding_function=self.embedding_function
        )
        
        # Add documents if collection is empty
        if collection.count() == 0:
            documents = []
            ids = []
            
            for i, (category, content) in enumerate(self.airline_knowledge.items()):
                doc = f"Category: {category}\nInformation: {content}"
                documents.append(doc)
                ids.append(f"doc_{i}")
            
            collection.add(documents=documents, ids=ids)
            print(f"Initialized with {len(documents)} documents")
        
        return "Knowledge base ready"
    
    def query(self, question: str) -> Dict[str, Any]:
        """Query the RAG system"""
        try:
            collection = self.chroma_client.get_collection("airline_knowledge")
            
            results = collection.query(
                query_texts=[question],
                n_results=3
            )
            
            if not results['documents'][0]:
                return {
                    "answer": "I don't have specific information. Please contact support.",
                    "sources": [],
                    "confidence": "low"
                }
            
            # Prepare context
            context = "\n\n".join(results['documents'][0])
            
            # Query Groq
            response = self.groq_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a helpful airline support assistant."},
                    {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}\n\nAnswer:"}
                ],
                temperature=0.1,
                max_tokens=500
            )
            
            return {
                "answer": response.choices[0].message.content,
                "sources": results['documents'][0],
                "confidence": "high" if len(results['documents'][0]) >= 2 else "medium"
            }
            
        except Exception as e:
            return {
                "answer": "I'm having technical difficulties. Please try again.",
                "sources": [],
                "confidence": "low",
                "error": str(e)
            }

# Create instance
rag_system = AirlineRAGSystem()