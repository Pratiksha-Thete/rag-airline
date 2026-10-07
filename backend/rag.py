import os
import requests
import json
import PyPDF2
import docx
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from io import BytesIO
import hashlib
from datetime import datetime
import traceback

load_dotenv()

class AirlineChatbot:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        
        if not self.api_key:
            print("⚠️  GROQ_API_KEY not found in .env file")
            self.api_key = "not_set"
        
        # Initialize Supabase client for database operations
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if self.supabase_url and self.supabase_key:
            try:
                from supabase import create_client
                self.supabase = create_client(self.supabase_url, self.supabase_key)
                print("✅ Supabase client initialized for document storage")
            except Exception as e:
                print(f"⚠️ Could not initialize Supabase: {e}")
                self.supabase = None
        else:
            self.supabase = None
            print("⚠️ Supabase not configured")
        
        # Document cache
        self._documents_cache = []
        self._documents_cache_loaded = False
        
        # Comprehensive airline knowledge
        self.knowledge = """SKYJET AIRLINES POLICIES (2024):

CHECK-IN:
• Opens 24 hours before departure
• Domestic flights: Closes 1 hour before departure
• International flights: Closes 2 hours before departure
• Online check-in: Available at skyjet.com or mobile app

BAGGAGE:
CARRY-ON:
• Economy: 1 bag (7kg max, 22x14x9 inches)
• Business: 2 bags (14kg total max)
• Personal item: 1 small bag under seat

CHECKED BAGGAGE:
• Economy: 23kg (50 lbs) included
• Business: 32kg (70 lbs) included
• Additional bag: $100 each
• Overweight fee (23-32kg): $50
• Items over 32kg not accepted

FLIGHT CHANGES:
• Domestic: $50 fee if within 24 hours of departure
• International: $100 fee if within 24 hours
• Business class: Free changes
• Same-day standby: $75 (subject to availability)

CANCELLATIONS:
• Full refund within 24 hours of booking
• Refundable tickets: $200 fee after 24 hours
• Non-refundable tickets: Travel credit for 12 months

PET POLICY:
• In-cabin pets: $125 (under 20 lbs, carrier required)
• Checked pets: $250 (health certificate required)
• Service animals: Free with documentation

SPECIAL ASSISTANCE:
• Wheelchair service: Free, request 48 hours in advance
• Unaccompanied minors (5-14 years): $150 each way
• Medical equipment: Free, notify in advance

MEALS & SERVICES:
• Flights under 2 hours: Complimentary snacks
• Flights 2+ hours: Meal service
• Special meals: Request 24h in advance (vegetarian, vegan, gluten-free)
• Wi-Fi: $10 (1 hour), $20 (full flight)

LOUNGE ACCESS:
• Business class: Complimentary access
• Day pass: $50 for economy passengers
• Amenities: WiFi, snacks, drinks, workstations

CONTACT:
• Phone: 1-800-SKYJET (1-800-759-538)
• Website: skyjet.com
• Email: support@skyjet.com
• 24/7 support available"""
    
    def load_all_documents(self):
        """Load all documents from Supabase"""
        if self._documents_cache_loaded:
            return self._documents_cache
        
        if not self.supabase:
            return []
        
        try:
            response = self.supabase.table("documents").select("*").execute()
            self._documents_cache = response.data
            self._documents_cache_loaded = True
            print(f"✅ Loaded {len(self._documents_cache)} documents from Supabase")
            return self._documents_cache
        except Exception as e:
            print(f"⚠️ Failed to load documents: {e}")
            return []
    
    def extract_text_from_pdf(self, file_content: bytes) -> str:
        """Extract text from PDF file"""
        try:
            pdf_reader = PyPDF2.PdfReader(BytesIO(file_content))
            text = ""
            total_pages = len(pdf_reader.pages)
            print(f"📄 PDF has {total_pages} pages")
            
            for i, page in enumerate(pdf_reader.pages):
                try:
                    extracted = page.extract_text()
                    if extracted and extracted.strip():
                        text += extracted + "\n\n"
                        print(f"   Page {i+1}: {len(extracted)} chars extracted")
                    else:
                        print(f"   Page {i+1}: No text extracted")
                except Exception as page_error:
                    print(f"   Page {i+1} error: {page_error}")
                    continue
            
            return text[:5000]
        except Exception as e:
            print(f"❌ PDF extraction error: {e}")
            return ""
    
    def extract_text_from_docx(self, file_content: bytes) -> str:
        """Extract text from DOCX file"""
        try:
            doc = docx.Document(BytesIO(file_content))
            text = ""
            for paragraph in doc.paragraphs:
                if paragraph.text:
                    text += paragraph.text + "\n"
                    if len(text) > 5000:
                        break
            print(f"📄 DOCX extracted: {len(text)} chars")
            return text[:5000]
        except Exception as e:
            print(f"❌ DOCX extraction error: {e}")
            return ""
    
    def save_document_to_supabase(self, filename: str, file_url: str, file_size: int, 
                                   content_type: str, storage_path: str, 
                                   extracted_text: str, session_id: str = None) -> str:
        """Save document metadata to Supabase"""
        if not self.supabase:
            return None
        
        try:
            doc_data = {
                "filename": filename,
                "file_url": file_url,
                "file_size": file_size,
                "content_type": content_type,
                "storage_path": storage_path,
                "uploaded_by": session_id or "anonymous",
                "session_id": session_id,
                "metadata": {
                    "extracted_text": extracted_text[:3000],
                    "preview": extracted_text[:300],
                    "text_length": len(extracted_text),
                    "upload_timestamp": datetime.now().isoformat()
                },
                "uploaded_at": datetime.now().isoformat(),
                "created_at": datetime.now().isoformat()
            }
            
            result = self.supabase.table("documents").insert(doc_data).execute()
            
            if result.data:
                doc_id = result.data[0]["id"]
                print(f"✅ Document saved with ID: {doc_id}")
                self._documents_cache_loaded = False
                return doc_id
            return None
            
        except Exception as e:
            print(f"❌ Failed to save document: {e}")
            return None
    
    def process_uploaded_document(self, filename: str, file_content: bytes, 
                                   content_type: str, session_id: str = None,
                                   file_url: str = None, storage_path: str = None) -> Dict[str, Any]:
        """Process document and save to Supabase"""
        
        print(f"\n📄 Processing document: {filename}")
        print(f"   Content type: {content_type}")
        print(f"   File size: {len(file_content)} bytes")
        
        # Extract text
        text = ""
        
        if content_type == "application/pdf":
            print("   Extracting text from PDF...")
            text = self.extract_text_from_pdf(file_content)
        elif content_type in ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"]:
            print("   Extracting text from DOCX...")
            text = self.extract_text_from_docx(file_content)
        elif content_type == "text/plain":
            print("   Reading text file...")
            text = file_content.decode('utf-8', errors='ignore')
        else:
            return {
                "success": False,
                "error": f"Unsupported file type: {content_type}"
            }
        
        if not text or not text.strip():
            print("❌ No text could be extracted")
            return {
                "success": False,
                "error": "No text could be extracted. File may be scanned or image-based."
            }
        
        print(f"✅ Extracted {len(text)} characters")
        
        # Save to Supabase
        doc_id = self.save_document_to_supabase(
            filename=filename,
            file_url=file_url,
            file_size=len(file_content),
            content_type=content_type,
            storage_path=storage_path,
            extracted_text=text,
            session_id=session_id
        )
        
        if not doc_id:
            return {
                "success": False,
                "error": "Failed to save document to database"
            }
        
        # Generate preview
        preview = text[:300] + "..." if len(text) > 300 else text
        
        return {
            "success": True,
            "doc_id": doc_id,
            "filename": filename,
            "summary": f"Document saved to Supabase database",
            "preview": preview,
            "chunks": len(text) // 500 + 1
        }
    
    def get_document_list(self) -> List[Dict]:
        """Get list of documents from Supabase"""
        docs = self.load_all_documents()
        result = []
        
        for doc in docs:
            result.append({
                "doc_id": doc["id"],
                "filename": doc["filename"],
                "file_size": doc.get("file_size", 0),
                "uploaded_at": doc.get("uploaded_at", ""),
                "preview": doc.get("metadata", {}).get("preview", ""),
                "chunks": len(doc.get("metadata", {}).get("extracted_text", "")) // 500 + 1
            })
        return result
    
    def clear_documents(self):
        """Clear all documents from Supabase"""
        if not self.supabase:
            return
        
        try:
            self.supabase.table("documents").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
            print("🧹 All documents cleared from Supabase")
            self._documents_cache = []
            self._documents_cache_loaded = False
        except Exception as e:
            print(f"❌ Error clearing documents: {e}")
    
    def query(self, question: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        """Answer questions using document content with Groq NLP"""
        
        # Load all documents
        docs = self.load_all_documents()
        has_documents = len(docs) > 0
        
        print(f"🔍 Question: '{question[:50]}'")
        print(f"📚 Total documents in database: {len(docs)}")
        
        # Handle document listing question
        if any(kw in question.lower() for kw in ["what document", "uploaded document", "my document", "list documents"]):
            if not has_documents:
                return {
                    "answer": "No documents have been uploaded yet. Click the upload button to add PDF, DOCX, or TXT files.",
                    "sources": [],
                    "confidence": "high",
                    "success": True,
                    "has_documents": False
                }
            
            doc_names = [doc["filename"] for doc in docs]
            doc_list = "\n".join([f"• {name}" for name in doc_names])
            
            return {
                "answer": f"You have uploaded {len(docs)} document(s):\n\n{doc_list}\n\nAsk me about the content of any document!",
                "sources": ["Uploaded Documents"],
                "confidence": "high",
                "success": True,
                "has_documents": True
            }
        
        # Build document context for NLP
        document_context = ""
        sources = ["SkyJet Airlines Policy Database"]
        
        if has_documents:
            document_context = "UPLOADED DOCUMENTS CONTENT:\n\n"
            for i, doc in enumerate(docs[:3], 1):  # Limit to first 3 documents for performance
                extracted_text = doc.get("metadata", {}).get("extracted_text", "")
                filename = doc.get("filename", "Unknown")
                if extracted_text:
                    document_context += f"--- Document {i}: {filename} ---\n{extracted_text}\n\n"
                    sources.append(f"Uploaded: {filename}")
        
        if self.api_key == "not_set":
            if has_documents:
                return {
                    "answer": f"Documents found: {', '.join([doc['filename'] for doc in docs])}\n\nAdd GROQ_API_KEY to your .env file for detailed NLP responses.",
                    "sources": sources,
                    "confidence": "medium",
                    "success": True,
                    "has_documents": True
                }
            else:
                return {
                    "answer": "⚠️ Please add GROQ_API_KEY to your .env file\nExample: GROQ_API_KEY=gsk_your_key_here",
                    "sources": [],
                    "confidence": "low",
                    "success": False,
                    "has_documents": False
                }
        
        # Build prompt for Groq NLP
        if has_documents and document_context:
            prompt = f"""You are SkyJet AI Assistant. Answer the question based on the uploaded documents FIRST, then use airline policies.

{document_context}

AIRLINE POLICIES:
{self.knowledge}

USER QUESTION: {question}

INSTRUCTIONS:
1. FIRST analyze the uploaded documents carefully
2. If documents contain relevant information, quote from them directly
3. Then supplement with airline policies if needed
4. Be specific, detailed, and helpful
5. If information is not in documents, say so clearly

ANSWER:"""
        else:
            prompt = f"""You are SkyJet AI Assistant. Answer the question based on airline policies.

AIRLINE POLICIES:
{self.knowledge}

USER QUESTION: {question}

INSTRUCTIONS:
1. Answer based on the policies above
2. Be specific about fees, weights, and time limits
3. Format clearly with bullet points if listing multiple items
4. If information is missing, say: "For specific details, please call 1-800-SKYJET"
5. Always end with: "Visit skyjet.com for more information"

ANSWER:"""
        
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            data = {
                "model": self.model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 800
            }
            
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=data,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                answer = result["choices"][0]["message"]["content"]
                
                return {
                    "answer": answer,
                    "sources": sources,
                    "confidence": "high",
                    "success": True,
                    "has_documents": has_documents
                }
            else:
                print(f"⚠️ Groq API error: {response.status_code}")
                return self._fallback_response(question, has_documents, docs)
                
        except Exception as e:
            print(f"❌ API Error: {e}")
            return self._fallback_response(question, has_documents, docs)
    
    def _fallback_response(self, question: str, has_documents: bool = False, docs: List[Dict] = None) -> Dict[str, Any]:
        """Fallback responses when Groq API fails"""
        
        if has_documents and docs:
            doc = docs[0]
            extracted = doc.get("metadata", {}).get("extracted_text", "")
            filename = doc.get("filename", "Unknown")
            preview = extracted[:300] if extracted else "No preview available"
            
            answer = f"Based on your uploaded document '{filename}':\n\n{preview}...\n\nFor complete details, please ensure Groq API is configured properly."
            sources = [f"Uploaded: {filename}"]
            confidence = "medium"
        else:
            question_lower = question.lower()
            
            if "baggage" in question_lower:
                answer = """SkyJet Airlines Baggage Policy:

• Economy Class: 1 carry-on (7kg max) + 1 personal item
• Business Class: 2 carry-ons (14kg total) + 1 personal item
• Checked Baggage: Economy - 23kg, Business - 32kg included
• Excess Fees: $50 per extra kg, $100 per extra bag

Visit skyjet.com for detailed baggage information."""
            
            elif "check-in" in question_lower:
                answer = """SkyJet Check-in Information:

• Check-in opens: 24 hours before departure
• Check-in closes: Domestic - 1 hour before, International - 2 hours before
• Options: Online (skyjet.com), Mobile app, Airport kiosk, Counter

For check-in assistance, call 1-800-SKYJET."""
            
            elif "flight change" in question_lower or "cancel" in question_lower:
                answer = """Flight Changes & Cancellations:

• Changes: $50 fee for domestic, $100 for international (within 24h)
• Cancellations: Full refund within 24h of booking
• Business class: Free changes
• Travel credit: Valid for 12 months for non-refundable tickets

Contact 1-800-SKYJET for modification assistance."""
            
            elif "pet" in question_lower:
                answer = """Pet Travel Policy:

• In-cabin pets: $125 fee (under 20 lbs, carrier required)
• Checked pets: $250 fee (health certificate needed)
• Service animals: Free with documentation

For pet reservations, call 1-800-SKYJET."""
            
            else:
                answer = f"""Thank you for your question about: {question}

For detailed information about SkyJet policies and services:

📞 Call: 1-800-SKYJET (1-800-759-538)
🌐 Visit: skyjet.com
✉️ Email: support@skyjet.com

Our customer support team is available 24/7."""
            
            sources = ["SkyJet Airlines Policy Database"]
            confidence = "medium"
        
        return {
            "answer": answer,
            "sources": sources,
            "confidence": confidence,
            "success": True,
            "has_documents": has_documents
        }

# Create instance
rag_system = AirlineChatbot()