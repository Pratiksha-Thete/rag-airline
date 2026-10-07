import os
from supabase import create_client
from dotenv import load_dotenv
from typing import List, Dict, Any
from datetime import datetime
import uuid
import json

load_dotenv()

class SupabaseManager:
    def __init__(self):
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_ANON_KEY")
        
        if not url or not key:
            print("⚠️  Supabase credentials not found in .env")
            print("ℹ️  Add SUPABASE_URL and SUPABASE_ANON_KEY to your .env file")
            self.client = None
            self.connected = False
            return
        
        try:
            # Create client without proxy parameter
            self.client = create_client(url, key)
            self.connected = True
            print("✅ Supabase connected successfully")
            
        except Exception as e:
            print(f"❌ Failed to connect to Supabase: {e}")
            self.client = None
            self.connected = False
    
    def test_connection(self):
        """Test the database connection"""
        if not self.connected:
            return False
        
        try:
            # Simple query to test connection
            response = self.client.table("airline_documents").select("id").limit(1).execute()
            print(f"📊 Database test: {len(response.data)} document(s) found")
            return True
        except Exception as e:
            print(f"⚠️  Database test failed: {e}")
            return False
    
    def search_knowledge(self, query: str, category: str = None, limit: int = 5) -> List[Dict]:
        """Search for relevant knowledge documents"""
        if not self.connected:
            return []
        
        try:
            # Build the query
            query_builder = self.client.table("airline_documents").select("*")
            
            # Add search filter if query provided
            if query and len(query.strip()) > 0:
                query_builder = query_builder.ilike("content", f"%{query}%")
            
            # Add category filter if provided
            if category:
                query_builder = query_builder.eq("category", category)
            
            # Execute query
            response = query_builder.limit(limit).execute()
            
            return response.data
            
        except Exception as e:
            print(f"❌ Search error: {e}")
            return []
    
    def save_conversation(self, session_id: str, user_message: str, bot_response: str,
                         confidence: str = None, sources: List[str] = None) -> bool:
        """Save conversation to database"""
        if not self.connected:
            return False
        
        try:
            data = {
                "session_id": session_id,
                "user_message": user_message[:500],  # Limit length
                "bot_response": bot_response[:1000],  # Limit length
                "confidence": confidence,
                "sources": sources or [],
                "created_at": datetime.now().isoformat()
            }
            
            response = self.client.table("conversations").insert(data).execute()
            return True
            
        except Exception as e:
            print(f"❌ Error saving conversation: {e}")
            return False
    
    def create_support_ticket(self, ticket_data: Dict) -> Dict:
        """Create a new support ticket"""
        if not self.connected:
            # Generate local ticket ID
            ticket_id = f"LOCAL-{uuid.uuid4().hex[:8].upper()}"
            return {
                "ticket_id": ticket_id,
                "status": "pending",
                "message": "Ticket saved locally (database offline)",
                "created_at": datetime.now().isoformat()
            }
        
        try:
            # Generate unique ticket ID
            ticket_id = f"SKY-{uuid.uuid4().hex[:8].upper()}"
            
            data = {
                "ticket_id": ticket_id,
                "issue_type": ticket_data.get("issue_type", "general"),
                "description": ticket_data.get("description", ""),
                "passenger_name": ticket_data.get("passenger_name", ""),
                "booking_reference": ticket_data.get("booking_reference"),
                "status": "open",
                "priority": "medium",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            response = self.client.table("support_tickets").insert(data).execute()
            
            return {
                "ticket_id": ticket_id,
                "status": "open",
                "message": "Ticket created successfully",
                "created_at": data["created_at"]
            }
                
        except Exception as e:
            print(f"❌ Error creating ticket: {e}")
            return {
                "ticket_id": "ERROR",
                "status": "failed",
                "message": f"Database error: {str(e)}"
            }
    
    def get_conversation_history(self, session_id: str, limit: int = 20) -> List[Dict]:
        """Get conversation history for a session"""
        if not self.connected:
            return []
        
        try:
            response = self.client.table("conversations")\
                .select("*")\
                .eq("session_id", session_id)\
                .order("created_at", desc=False)\
                .limit(limit)\
                .execute()
            
            return response.data
            
        except Exception as e:
            print(f"❌ Error getting conversation history: {e}")
            return []
    
    def add_knowledge_document(self, category: str, content: str, 
                              subcategory: str = None) -> Dict:
        """Add a new document to knowledge base"""
        if not self.connected:
            return {"success": False, "error": "Database not connected"}
        
        try:
            data = {
                "category": category,
                "subcategory": subcategory,
                "content": content,
                "updated_at": datetime.now().isoformat()
            }
            
            response = self.client.table("airline_documents").insert(data).execute()
            
            return {
                "success": True,
                "id": response.data[0]["id"] if response.data else None,
                "message": "Document added successfully"
            }
            
        except Exception as e:
            print(f"❌ Error adding document: {e}")
            return {"success": False, "error": str(e)}

# Create global instance
supabase_manager = SupabaseManager()