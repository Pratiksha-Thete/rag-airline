from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import os
import uuid
import asyncio
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client
import concurrent.futures

# Create a thread pool for CPU-intensive tasks
thread_pool = concurrent.futures.ThreadPoolExecutor(max_workers=2)

# Import your existing modules
try:
    from rag import rag_system
    from supabase_client import supabase_manager
    RAG_AVAILABLE = True
    print("✅ RAG system imported successfully")
except ImportError as e:
    print(f"⚠️  RAG module not available: {e}")
    RAG_AVAILABLE = False
    rag_system = None
    supabase_manager = None

load_dotenv()

# Initialize Supabase client for storage with service role key
supabase_url = os.getenv("SUPABASE_URL")
supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if supabase_url and supabase_service_key:
    supabase: Client = create_client(supabase_url, supabase_service_key)
    print("✅ Supabase storage client initialized with service role")
else:
    supabase = None
    print("⚠️  Supabase storage not configured - using fallback mode")

DOCUMENTS_BUCKET = "airline-documents"

# Background task for document processing
async def process_document_in_background(
    filename: str, 
    file_content: bytes, 
    content_type: str,
    session_id: str = None,
    file_url: str = None,
    storage_path: str = None
):
    """Process document in background thread to avoid blocking"""
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            thread_pool,
            rag_system.process_uploaded_document,
            filename,
            file_content,
            content_type,
            session_id,
            file_url,
            storage_path
        )
        if result.get("success"):
            print(f"✅ Background processing complete: {filename} - ID: {result.get('doc_id')}")
        else:
            print(f"⚠️ Background processing failed: {filename} - {result.get('error')}")
    except Exception as e:
        print(f"❌ Background processing error: {filename} - {e}")

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 60)
    print("🚀 SKYJET AIRLINES CHATBOT STARTING")
    print("=" * 60)
    
    api_key = os.getenv("GROQ_API_KEY")
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    
    print(f"🤖 Model: {model}")
    print(f"🔑 Groq API: {'✅ Configured' if api_key else '❌ Not configured'}")
    
    if supabase_manager and hasattr(supabase_manager, 'connected'):
        print(f"📊 Database: {'✅ Connected' if supabase_manager.connected else '⚠️  Disconnected'}")
    
    # Check/Create storage bucket
    if supabase:
        try:
            buckets = supabase.storage.list_buckets()
            bucket_names = [b.name for b in buckets]
            
            if DOCUMENTS_BUCKET not in bucket_names:
                supabase.storage.create_bucket(
                    DOCUMENTS_BUCKET,
                    options={
                        "public": True,
                        "allowed_mime_types": [
                            "application/pdf", 
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
                            "text/plain"
                        ],
                        "file_size_limit": 10485760
                    }
                )
                print(f"📦 Created storage bucket: {DOCUMENTS_BUCKET}")
            else:
                print(f"📦 Storage bucket exists: {DOCUMENTS_BUCKET}")
        except Exception as e:
            print(f"⚠️  Storage bucket check failed: {e}")
    
    print(f"🌐 Server: http://localhost:{os.getenv('PYTHON_SERVICE_PORT', 8000)}")
    print(f"📚 Docs: http://localhost:{os.getenv('PYTHON_SERVICE_PORT', 8000)}/docs")
    print("=" * 60)
    
    yield
    
    # Shutdown
    thread_pool.shutdown(wait=True)
    print("👋 Shutting down...")

app = FastAPI(
    title="SkyJet Airlines Chatbot API",
    description="AI-powered customer support with Supabase storage",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    sources: List[str] = []
    confidence: str = "medium"
    suggested_questions: List[str] = []
    success: bool = True
    conversation_id: Optional[str] = None
    response: Optional[str] = None
    has_documents: Optional[bool] = False

class TicketRequest(BaseModel):
    issue_type: str
    description: str
    passenger_name: str
    booking_reference: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class AuthResponse(BaseModel):
    token: str
    user: Dict[str, Any]
    message: str = "Success"

class UploadResponse(BaseModel):
    filename: str
    file_url: str
    file_size: int
    content_type: str
    message: str
    chunks_processed: Optional[int] = 0
    summary: Optional[str] = None
    doc_id: Optional[str] = None

class DocumentListResponse(BaseModel):
    documents: List[Dict[str, Any]]
    total: int

class RAGDocumentResponse(BaseModel):
    doc_id: str
    filename: str
    chunks: int
    uploaded_at: str
    preview: Optional[str] = None

# Simple authentication
users_db = {
    "admin@skyjet.com": {
        "password": "admin123",
        "name": "Admin User",
        "role": "admin"
    },
    "user@skyjet.com": {
        "password": "user123",
        "name": "Test User",
        "role": "user"
    }
}

# Health Check Endpoint
@app.get("/api/health")
async def health_check():
    api_key = bool(os.getenv("GROQ_API_KEY"))
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    storage_status = "available" if supabase else "unavailable"
    
    rag_doc_count = 0
    if RAG_AVAILABLE and rag_system and hasattr(rag_system, 'get_document_list'):
        try:
            rag_doc_count = len(rag_system.get_document_list())
        except:
            pass
    
    return {
        "status": "healthy",
        "service": "skyjet-chatbot",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "configuration": {
            "groq_configured": api_key,
            "model": model,
            "storage": storage_status,
            "rag_available": RAG_AVAILABLE,
            "rag_documents": rag_doc_count
        }
    }

# Authentication endpoints
@app.post("/api/auth/login")
async def login(login_request: LoginRequest):
    try:
        email = login_request.email
        password = login_request.password
        
        if email not in users_db:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if users_db[email]["password"] != password:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        token = f"token-{email}-{uuid.uuid4().hex[:16]}"
        
        return AuthResponse(
            token=token,
            user={
                "email": email,
                "name": users_db[email]["name"],
                "role": users_db[email]["role"]
            },
            message="Login successful"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@app.post("/api/auth/register")
async def register(register_request: RegisterRequest):
    try:
        email = register_request.email
        password = register_request.password
        name = register_request.name
        
        if not email or not password or not name:
            raise HTTPException(status_code=400, detail="Email, password, and name are required")
        
        if email in users_db:
            raise HTTPException(status_code=400, detail="User already exists")
        
        users_db[email] = {
            "password": password,
            "name": name,
            "role": "user"
        }
        
        token = f"token-{email}-{uuid.uuid4().hex[:16]}"
        
        return AuthResponse(
            token=token,
            user={
                "email": email,
                "name": name,
                "role": "user"
            },
            message="Registration successful"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

# Main Chat Endpoint - WITH TIMEOUT
@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    session_id = request.session_id or str(uuid.uuid4())
    
    try:
        if RAG_AVAILABLE and rag_system:
            # Run query with timeout using asyncio
            try:
                loop = asyncio.get_event_loop()
                result = await asyncio.wait_for(
                    loop.run_in_executor(thread_pool, rag_system.query, request.message, session_id),
                    timeout=30.0  # 30 second timeout
                )
                answer = result.get("answer", "I received your message.")
                sources = result.get("sources", [])
                confidence = result.get("confidence", "medium")
                success = result.get("success", True)
                has_documents = result.get("has_documents", False)
            except asyncio.TimeoutError:
                print(f"⚠️ Query timeout for: {request.message[:50]}")
                answer = "I'm still processing your request. Please try again in a moment."
                sources = []
                confidence = "low"
                success = False
                has_documents = False
            
            # Save conversation if supabase is available
            if supabase_manager and hasattr(supabase_manager, 'connected') and supabase_manager.connected:
                try:
                    supabase_manager.save_conversation(
                        session_id=session_id,
                        user_message=request.message,
                        bot_response=answer,
                        confidence=confidence,
                        sources=sources
                    )
                except Exception as db_error:
                    print(f"⚠️ Failed to save conversation: {db_error}")
        else:
            answer = f"I received your message: '{request.message}'. This is a fallback response from SkyJet AI."
            sources = []
            confidence = "medium"
            success = True
            has_documents = False
        
        suggestions = generate_suggestions(request.message)
        
        return ChatResponse(
            answer=answer,
            response=answer,
            sources=sources,
            confidence=confidence,
            suggested_questions=suggestions,
            success=success,
            conversation_id=session_id,
            has_documents=has_documents
        )
        
    except Exception as e:
        print(f"❌ Chat error: {e}")
        error_message = "I'm experiencing technical difficulties. Please call SkyJet support at 1-800-SKYJET."
        return ChatResponse(
            answer=error_message,
            response=error_message,
            sources=[],
            confidence="low",
            suggested_questions=[],
            success=False,
            conversation_id=session_id,
            has_documents=False
        )

# Upload Document Endpoint - WITH BACKGROUND PROCESSING
@app.post("/api/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    process_content: bool = Form(True),
    session_id: Optional[str] = Form(None),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    if not supabase:
        # Local storage fallback
        try:
            os.makedirs("uploads", exist_ok=True)
            file_path = f"uploads/{file.filename}"
            file_content = await file.read()
            
            with open(file_path, "wb") as f:
                f.write(file_content)
            
            # Process in background
            if process_content and RAG_AVAILABLE and rag_system:
                background_tasks.add_task(
                    process_document_in_background,
                    file.filename,
                    file_content,
                    file.content_type,
                    session_id,
                    f"/uploads/{file.filename}",
                    file_path
                )
            
            return UploadResponse(
                filename=file.filename,
                file_url=f"/uploads/{file.filename}",
                file_size=len(file_content),
                content_type=file.content_type,
                message="File uploaded locally (processing in background)",
                chunks_processed=0,
                summary="Processing in background...",
                doc_id=None
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Local upload failed: {str(e)}")
    
    try:
        allowed_types = [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
            "application/msword"
        ]
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file.content_type} not allowed"
            )
        
        file_content = await file.read()
        file_size = len(file_content)
        
        if file_size > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{timestamp}_{uuid.uuid4().hex[:8]}{file_extension}"
        storage_path = f"uploads/{unique_filename}"
        
        # Upload to Supabase Storage
        upload_result = supabase.storage.from_(DOCUMENTS_BUCKET).upload(
            path=storage_path,
            file=file_content,
            file_options={"content-type": file.content_type}
        )
        
        file_url = supabase.storage.from_(DOCUMENTS_BUCKET).get_public_url(storage_path)
        
        # Process in background to avoid blocking
        chunks_processed = 0
        summary = None
        doc_id = None
        
        if process_content and RAG_AVAILABLE and rag_system:
            background_tasks.add_task(
                process_document_in_background,
                file.filename,
                file_content,
                file.content_type,
                session_id,
                file_url,
                storage_path
            )
            summary = "Processing in background..."
        
        return UploadResponse(
            filename=file.filename,
            file_url=file_url,
            file_size=file_size,
            content_type=file.content_type,
            message="File uploaded successfully to Supabase Storage",
            chunks_processed=chunks_processed,
            summary=summary,
            doc_id=doc_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# RAG Document Management Endpoints
@app.get("/api/rag-documents", response_model=List[RAGDocumentResponse])
async def list_rag_documents():
    if not RAG_AVAILABLE or not rag_system:
        return []
    
    try:
        if hasattr(rag_system, 'get_document_list'):
            return rag_system.get_document_list()
        return []
    except Exception as e:
        print(f"❌ Error listing RAG documents: {e}")
        return []

@app.post("/api/rag-clear")
async def clear_rag_documents():
    if not RAG_AVAILABLE or not rag_system:
        return {"status": "error", "message": "RAG not available"}
    
    try:
        if hasattr(rag_system, 'clear_documents'):
            rag_system.clear_documents()
            return {"status": "success", "message": "All RAG documents cleared"}
        return {"status": "error", "message": "Clear method not available"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/rag-stats")
async def rag_statistics():
    if not RAG_AVAILABLE or not rag_system:
        return {"status": "unavailable", "message": "RAG not available"}
    
    try:
        doc_count = len(rag_system.get_document_list()) if hasattr(rag_system, 'get_document_list') else 0
        chunk_count = len(rag_system.document_chunks) if hasattr(rag_system, 'document_chunks') else 0
        
        return {
            "status": "available",
            "documents": doc_count,
            "chunks": chunk_count,
            "groq_model": rag_system.model
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Support Ticket Endpoint
@app.post("/api/tickets")
@app.post("/api/create-ticket")
async def create_ticket(ticket: TicketRequest):
    try:
        ticket_data = {
            "issue_type": ticket.issue_type,
            "description": ticket.description,
            "passenger_name": ticket.passenger_name,
            "booking_reference": ticket.booking_reference
        }
        
        if supabase_manager and hasattr(supabase_manager, 'create_support_ticket'):
            result = supabase_manager.create_support_ticket(ticket_data)
        else:
            ticket_id = f"SKY-{uuid.uuid4().hex[:8].upper()}"
            result = {
                "ticket_id": ticket_id,
                "status": "open",
                "message": "Ticket created successfully (local)",
                "created_at": datetime.now().isoformat()
            }
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Other endpoints (keep as they are)
@app.get("/api/knowledge")
async def search_knowledge(query: str = "", limit: int = 5):
    if supabase_manager and hasattr(supabase_manager, 'search_knowledge'):
        results = supabase_manager.search_knowledge(query, limit=limit)
        source = "supabase"
    else:
        results = [
            {"category": "baggage", "content": "Carry-on bags must not exceed 22 x 14 x 9 inches."},
            {"category": "check-in", "content": "Online check-in opens 24 hours before departure."},
            {"category": "flight", "content": "Flight changes can be made online for a fee."}
        ]
        source = "fallback"
    
    return {
        "query": query,
        "results": results[:limit],
        "count": len(results[:limit]),
        "source": source
    }

@app.get("/api/conversations/{session_id}")
async def get_conversations(session_id: str, limit: int = 20):
    if supabase_manager and hasattr(supabase_manager, 'get_conversation_history'):
        conversations = supabase_manager.get_conversation_history(session_id, limit)
    else:
        conversations = []
    
    return {
        "session_id": session_id,
        "messages": conversations,
        "total": len(conversations)
    }

@app.delete("/api/conversations/{session_id}")
async def delete_conversation(session_id: str):
    return {
        "status": "success",
        "message": "Conversation deleted",
        "session_id": session_id
    }

@app.get("/api/documents", response_model=DocumentListResponse)
async def list_documents(limit: int = 100, offset: int = 0):
    if not supabase:
        try:
            os.makedirs("uploads", exist_ok=True)
            files = os.listdir("uploads")
            documents = []
            for file in files[:limit]:
                file_path = f"uploads/{file}"
                documents.append({
                    "id": str(uuid.uuid4()),
                    "name": file,
                    "size": os.path.getsize(file_path),
                    "uploaded_at": datetime.fromtimestamp(os.path.getctime(file_path)).isoformat(),
                    "url": f"/uploads/{file}",
                    "type": "application/octet-stream"
                })
            return DocumentListResponse(documents=documents, total=len(documents))
        except:
            return DocumentListResponse(documents=[], total=0)
    
    try:
        files = supabase.storage.from_(DOCUMENTS_BUCKET).list(path="uploads/")
        documents = []
        for file in files:
            file_url = supabase.storage.from_(DOCUMENTS_BUCKET).get_public_url(f"uploads/{file['name']}")
            documents.append({
                "id": file.get("id", str(uuid.uuid4())),
                "name": file["name"],
                "size": file.get("metadata", {}).get("size", 0),
                "uploaded_at": file.get("created_at", datetime.now().isoformat()),
                "url": file_url,
                "type": file.get("metadata", {}).get("mimetype", "application/octet-stream")
            })
        
        paginated = documents[offset:offset + limit]
        return DocumentListResponse(documents=paginated, total=len(documents))
    except Exception as e:
        print(f"❌ List documents error: {e}")
        return DocumentListResponse(documents=[], total=0)

@app.delete("/api/documents/{filename}")
async def delete_document(filename: str):
    if not supabase:
        try:
            file_path = f"uploads/{filename}"
            if os.path.exists(file_path):
                os.remove(file_path)
                return {"status": "success", "message": f"Document {filename} deleted"}
            raise HTTPException(status_code=404, detail="File not found")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete: {str(e)}")
    
    try:
        supabase.storage.from_(DOCUMENTS_BUCKET).remove([f"uploads/{filename}"])
        return {"status": "success", "message": f"Document {filename} deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete: {str(e)}")

@app.post("/api/refresh")
async def refresh_knowledge():
    return {
        "status": "success",
        "message": "Knowledge base refresh endpoint",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/flight-status/{flight_number}")
async def flight_status(flight_number: str):
    flights = {
        "SK101": {"status": "On Time", "departure": "10:00 AM", "gate": "A12"},
        "SK202": {"status": "Delayed", "departure": "2:30 PM", "gate": "B07"},
        "SK303": {"status": "Boarding", "departure": "5:45 PM", "gate": "C22"}
    }
    
    if flight_number in flights:
        return {
            "flight_number": flight_number,
            **flights[flight_number],
            "last_updated": datetime.now().isoformat()
        }
    
    raise HTTPException(status_code=404, detail="Flight not found")

def generate_suggestions(question: str) -> List[str]:
    q = question.lower()
    
    if "baggage" in q:
        return ["What is the excess baggage fee?", "Can I carry sports equipment?", "What items are prohibited?"]
    elif "check" in q:
        return ["What documents do I need?", "Can I check in at the airport?", "What happens if I'm late?"]
    elif "change" in q or "cancel" in q:
        return ["How do I change my flight?", "What is your cancellation policy?", "Do you offer travel insurance?"]
    elif "pet" in q:
        return ["What documents are needed?", "Can emotional support animals fly?", "What are the carrier requirements?"]
    elif "document" in q or "upload" in q:
        return ["What documents have I uploaded?", "Summarize my uploaded documents", "Find information in my files"]
    
    return [
        "What is your baggage allowance?",
        "How early should I arrive?",
        "Can I select my seat?",
        "Do you have WiFi?",
        "What documents have I uploaded?"
    ]

if __name__ == "__main__":
    port = int(os.getenv("PYTHON_SERVICE_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=True, log_level="info")