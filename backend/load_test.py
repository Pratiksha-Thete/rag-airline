import asyncio
import aiohttp
import random
from datetime import datetime
import json

async def load_test_worker(session, worker_id, queries, base_url):
    """Simulate a user making requests"""
    results = []
    
    for i in range(10):  # Each worker makes 10 requests
        query = random.choice(queries)
        
        try:
            async with session.post(
                f"{base_url}/api/chat",
                json={"message": query}
            ) as response:
                response_time = response.elapsed.total_seconds() if hasattr(response, 'elapsed') else 0
                
                results.append({
                    "worker": worker_id,
                    "query": query,
                    "status": response.status,
                    "response_time": response_time,
                    "success": response.status == 200
                })
                
        except Exception as e:
            results.append({
                "worker": worker_id,
                "query": query,
                "status": "error",
                "response_time": 0,
                "success": False,
                "error": str(e)
            })
            
        await asyncio.sleep(random.uniform(0.1, 0.5))  # Random delay between requests
    
    return results

async def run_load_test():
    """Run concurrent load test"""
    base_url = "http://localhost:8000"
    
    # Test queries
    test_queries = [
        "Flight status SJ101",
        "Book flight to London",
        "Baggage allowance",
        "Cancel my booking",
        "Check-in online",
        "Flight prices",
        "Contact support",
        "Meal options",
        "Seat selection",
        "Delayed flight"
    ]
    
    print("=" * 60)
    print("🚀 LOAD TEST - Simulating concurrent users")
    print("=" * 60)
    
    async with aiohttp.ClientSession() as session:
        # Simulate 10 concurrent users
        tasks = []
        for i in range(10):
            task = load_test_worker(session, i, test_queries, base_url)
            tasks.append(task)
        
        all_results = await asyncio.gather(*tasks)
        
        # Flatten results
        flat_results = [item for sublist in all_results for item in sublist]
        
        # Calculate metrics
        total_requests = len(flat_results)
        successful = sum(1 for r in flat_results if r.get("success", False))
        failed = total_requests - successful
        
        response_times = [r["response_time"] for r in flat_results if "response_time" in r]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        print(f"\n📊 LOAD TEST RESULTS:")
        print(f"   Total Requests: {total_requests}")
        print(f"   Successful: {successful}")
        print(f"   Failed: {failed}")
        print(f"   Success Rate: {(successful/total_requests*100):.1f}%")
        print(f"   Avg Response Time: {avg_response_time:.3f}s")
        print(f"   Max Response Time: {max(response_times):.3f}s")
        print(f"   Min Response Time: {min(response_times):.3f}s")
        
        # Save results
        report_file = f"load_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "total_requests": total_requests,
                "successful": successful,
                "failed": failed,
                "success_rate": successful/total_requests,
                "avg_response_time": avg_response_time,
                "detailed_results": flat_results[:20]  # Save first 20 results
            }, f, indent=2)
        
        print(f"\n📁 Load test report saved to: {report_file}")

if __name__ == "__main__":
    asyncio.run(run_load_test())