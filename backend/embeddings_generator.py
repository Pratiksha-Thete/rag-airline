import os
import sys
from dotenv import load_dotenv
from supabase import create_client
from sentence_transformers import SentenceTransformer
import json
from typing import List, Dict
import time

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.supabase_client import SupabaseManager

load_dotenv()

class EmbeddingsGenerator:
    def __init__(self):
        self.supabase = SupabaseManager()
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
    def generate_document_chunk_embeddings(self, batch_size: int = 10):
        """Generate embeddings for document chunks that don't have them yet"""
        if not self.supabase.connected:
            print("❌ Not connected to Supabase")
            return
        
        try:
            # Get chunks without embeddings
            response = self.supabase.client.table("document_chunks")\
                .select("*")\
                .is_("embedding", "null")\
                .limit(batch_size)\
                .execute()
            
            chunks = response.data
            if not chunks:
                print("✅ All document chunks already have embeddings")
                return
            
            print(f"📊 Generating embeddings for {len(chunks)} chunks...")
            
            for i, chunk in enumerate(chunks, 1):
                try:
                    # Generate embedding
                    embedding = self.embedding_model.encode(chunk['content']).tolist()
                    
                    # Update the chunk with embedding
                    self.supabase.client.table("document_chunks")\
                        .update({"embedding": embedding})\
                        .eq("id", chunk['id'])\
                        .execute()
                    
                    print(f"✅ Processed chunk {i}/{len(chunks)}: {chunk['id']}")
                    
                    # Small delay to avoid rate limiting
                    time.sleep(0.1)
                    
                except Exception as e:
                    print(f"❌ Error processing chunk {chunk['id']}: {e}")
            
            print(f"🎉 Successfully generated embeddings for {len(chunks)} chunks")
            
        except Exception as e:
            print(f"❌ Error generating embeddings: {e}")
    
    def create_chunks_from_documents(self):
        """Create chunks from airline_documents if they don't exist"""
        if not self.supabase.connected:
            print("❌ Not connected to Supabase")
            return
        
        try:
            # Get all airline documents
            response = self.supabase.client.table("airline_documents")\
                .select("*")\
                .execute()
            
            documents = response.data
            print(f"📊 Found {len(documents)} airline documents")
            
            for doc in documents:
                # Check if chunks already exist for this document
                chunk_response = self.supabase.client.table("document_chunks")\
                    .select("id")\
                    .eq("document_id", doc['id'])\
                    .limit(1)\
                    .execute()
                
                if chunk_response.data:
                    print(f"⏭️  Chunks already exist for document {doc['id']}")
                    continue
                
                # Create chunks (simple version - one chunk per document)
                chunk_data = {
                    "content": doc['content'][:1000],  # Limit to 1000 chars
                    "metadata": {
                        "category": doc['category'],
                        "subcategory": doc.get('subcategory'),
                        "document_id": doc['id'],
                        "source": "airline_knowledge_base"
                    },
                    "source": "airline_knowledge_base",
                    "document_id": doc['id'],
                    "chunk_index": 0
                }
                
                # Insert chunk
                self.supabase.client.table("document_chunks")\
                    .insert(chunk_data)\
                    .execute()
                
                print(f"✅ Created chunk for document: {doc['category']} - {doc.get('subcategory', 'N/A')}")
                
                # Small delay
                time.sleep(0.1)
            
            print("🎉 Finished creating document chunks")
            
        except Exception as e:
            print(f"❌ Error creating chunks: {e}")
    
    def run_full_pipeline(self):
        """Run the complete pipeline: create chunks and generate embeddings"""
        print("🚀 Starting embeddings generation pipeline...")
        
        # Step 1: Create chunks from documents
        print("\n📝 Step 1: Creating document chunks...")
        self.create_chunks_from_documents()
        
        # Step 2: Generate embeddings for chunks
        print("\n🔢 Step 2: Generating embeddings...")
        self.generate_document_chunk_embeddings(batch_size=20)
        
        print("\n✅ Pipeline completed successfully!")

if __name__ == "__main__":
    generator = EmbeddingsGenerator()
    
    # Run the full pipeline
    generator.run_full_pipeline()
    
    # Or run individual steps:
    # generator.create_chunks_from_documents()
    # generator.generate_document_chunk_embeddings()