import asyncio
import json
import time
from datetime import datetime
from typing import List, Dict
import aiohttp
from tabulate import tabulate

class ChatbotTester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.results = []
        
    # Test cases covering different scenarios
    TEST_CASES = [
        # Flight status queries
        {
            "query": "What is the status of flight SJ101?",
            "category": "flight_status",
            "expected_entities": ["SJ101"],
            "min_response_length": 20
        },
        {
            "query": "Is flight SJ205 delayed?",
            "category": "flight_status",
            "expected_entities": ["SJ205"],
            "min_response_length": 20
        },
        
        # Booking queries
        {
            "query": "I want to book a flight from New York to London",
            "category": "booking",
            "expected_entities": ["New York", "London"],
            "min_response_length": 30
        },
        
        # Cancellation queries
        {
            "query": "How do I cancel my booking?",
            "category": "cancellation",
            "min_response_length": 30
        },
        {
            "query": "What is your cancellation policy?",
            "category": "policy",
            "min_response_length": 40
        },
        
        # Baggage queries
        {
            "query": "What's the baggage allowance?",
            "category": "baggage",
            "min_response_length": 30
        },
        {
            "query": "How much does extra baggage cost?",
            "category": "baggage",
            "min_response_length": 30
        },
        
        # Check-in queries
        {
            "query": "When does check-in open?",
            "category": "checkin",
            "min_response_length": 25
        },
        {
            "query": "Can I check in online?",
            "category": "checkin",
            "min_response_length": 25
        },
        
        # General information
        {
            "query": "What are your contact details?",
            "category": "contact",
            "min_response_length": 20
        },
        {
            "query": "Do you serve meals on flights?",
            "category": "services",
            "min_response_length": 30
        },
        
        # Edge cases
        {
            "query": "",  # Empty query
            "category": "edge_case",
            "expect_error": True
        },
        {
            "query": "asdfghjkl",  # Gibberish
            "category": "edge_case",
            "min_response_length": 15
        },
    ]
    
    async def test_single_query(self, session, test_case):
        """Test a single query and measure accuracy metrics"""
        start_time = time.time()
        
        try:
            async with session.post(
                f"{self.base_url}/api/chat",
                json={"message": test_case["query"]}
            ) as response:
                response_time = time.time() - start_time
                
                if response.status == 200:
                    data = await response.json()
                    result = {
                        "query": test_case["query"],
                        "category": test_case["category"],
                        "response": data.get("response", ""),
                        "status": "success",
                        "response_time": round(response_time, 3),
                        "response_length": len(data.get("response", "")),
                        "status_code": response.status
                    }
                    
                    # Check if error was expected
                    if test_case.get("expect_error", False):
                        result["accuracy_flag"] = "FAIL - Expected error but got success"
                    else:
                        # Check minimum response length
                        min_length = test_case.get("min_response_length", 20)
                        if result["response_length"] < min_length:
                            result["accuracy_flag"] = f"WARN - Response too short ({result['response_length']} < {min_length})"
                        else:
                            result["accuracy_flag"] = "PASS"
                            
                else:
                    result = {
                        "query": test_case["query"],
                        "category": test_case["category"],
                        "response": f"Error: {response.status}",
                        "status": "error",
                        "response_time": round(response_time, 3),
                        "response_length": 0,
                        "status_code": response.status,
                        "accuracy_flag": "FAIL - Request failed"
                    }
                    
        except Exception as e:
            result = {
                "query": test_case["query"],
                "category": test_case["category"],
                "response": f"Exception: {str(e)}",
                "status": "error",
                "response_time": round(time.time() - start_time, 3),
                "response_length": 0,
                "status_code": None,
                "accuracy_flag": f"FAIL - Exception: {str(e)[:50]}"
            }
            
        self.results.append(result)
        return result
    
    async def run_all_tests(self):
        """Run all test cases"""
        print("=" * 60)
        print("🚀 SKYJET AIRLINES CHATBOT ACCURACY TEST")
        print("=" * 60)
        print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Total test cases: {len(self.TEST_CASES)}")
        print("-" * 60)
        
        async with aiohttp.ClientSession() as session:
            for i, test_case in enumerate(self.TEST_CASES, 1):
                print(f"\n📝 Test {i}/{len(self.TEST_CASES)}: {test_case['query'][:50]}...")
                result = await self.test_single_query(session, test_case)
                print(f"   Response: {result['response'][:100]}...")
                print(f"   Time: {result['response_time']}s | Status: {result['accuracy_flag']}")
                
        return self.generate_report()
    
    def generate_report(self):
        """Generate detailed accuracy report"""
        successful = [r for r in self.results if r["status"] == "success"]
        failed = [r for r in self.results if r["status"] != "success"]
        
        # Calculate metrics by category
        categories = {}
        for r in self.results:
            cat = r["category"]
            if cat not in categories:
                categories[cat] = {"total": 0, "passed": 0, "total_time": 0}
            categories[cat]["total"] += 1
            categories[cat]["total_time"] += r["response_time"]
            if r.get("accuracy_flag", "").startswith("PASS"):
                categories[cat]["passed"] += 1
        
        print("\n" + "=" * 60)
        print("📊 ACCURACY TEST REPORT")
        print("=" * 60)
        
        # Overall metrics
        print(f"\n📈 OVERALL METRICS:")
        print(f"   Total Tests: {len(self.results)}")
        print(f"   Successful: {len(successful)}")
        print(f"   Failed: {len(failed)}")
        print(f"   Success Rate: {(len(successful)/len(self.results)*100):.1f}%")
        
        avg_response_time = sum(r["response_time"] for r in self.results) / len(self.results)
        print(f"   Average Response Time: {avg_response_time:.3f}s")
        
        # Category breakdown
        print(f"\n📋 CATEGORY BREAKDOWN:")
        category_table = []
        for cat, metrics in categories.items():
            pass_rate = (metrics["passed"] / metrics["total"] * 100) if metrics["total"] > 0 else 0
            avg_time = metrics["total_time"] / metrics["total"]
            category_table.append([
                cat,
                metrics["total"],
                metrics["passed"],
                f"{pass_rate:.1f}%",
                f"{avg_time:.3f}s"
            ])
        
        print(tabulate(
            category_table,
            headers=["Category", "Tests", "Passed", "Pass Rate", "Avg Time"],
            tablefmt="grid"
        ))
        
        # Detailed results
        print(f"\n🔍 DETAILED RESULTS:")
        detailed_table = []
        for r in self.results[:10]:  # Show first 10 results
            detailed_table.append([
                r["category"],
                r["query"][:30] + "...",
                r["accuracy_flag"],
                f"{r['response_time']:.3f}s",
                r["response_length"]
            ])
        
        print(tabulate(
            detailed_table,
            headers=["Category", "Query", "Result", "Time", "Length"],
            tablefmt="grid"
        ))
        
        # Recommendations
        print(f"\n💡 RECOMMENDATIONS:")
        slow_responses = [r for r in self.results if r["response_time"] > 2.0]
        if slow_responses:
            print(f"   ⚠️  {len(slow_responses)} slow responses (>2s)")
            
        short_responses = [r for r in self.results if r["response_length"] < 20 and r["status"] == "success"]
        if short_responses:
            print(f"   ⚠️  {len(short_responses)} responses too short (<20 chars)")
            
        failed_categories = set(r["category"] for r in failed)
        if failed_categories:
            print(f"   ⚠️  Failed categories: {', '.join(failed_categories)}")
        
        print("\n" + "=" * 60)
        
        # Save report to file
        report_file = f"accuracy_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "summary": {
                    "total_tests": len(self.results),
                    "successful": len(successful),
                    "failed": len(failed),
                    "success_rate": len(successful)/len(self.results),
                    "avg_response_time": avg_response_time
                },
                "detailed_results": self.results,
                "category_metrics": categories
            }, f, indent=2)
        
        print(f"📁 Detailed report saved to: {report_file}")
        
        return {
            "success_rate": len(successful)/len(self.results),
            "avg_response_time": avg_response_time,
            "total_tests": len(self.results),
            "category_metrics": categories
        }

async def main():
    tester = ChatbotTester()
    results = await tester.run_all_tests()
    
    # Overall accuracy score
    accuracy_score = results["success_rate"] * 100
    print(f"\n🎯 ACCURACY SCORE: {accuracy_score:.1f}%")
    
    if accuracy_score >= 90:
        print("🏆 Excellent accuracy! Chatbot is performing well.")
    elif accuracy_score >= 70:
        print("👍 Good accuracy, but there's room for improvement.")
    else:
        print("⚠️  Accuracy needs improvement. Consider refining the chatbot.")

if __name__ == "__main__":
    asyncio.run(main())