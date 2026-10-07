import asyncio
import json
import time
from datetime import datetime
from typing import List, Dict, Tuple
import aiohttp
import numpy as np
from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix, classification_report
import matplotlib.pyplot as plt
import seaborn as sns
from collections import defaultdict
import pandas as pd
from tabulate import tabulate

class ChatbotClassificationMetrics:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.true_labels = []
        self.predicted_labels = []
        self.confidence_scores = []
        self.response_times = []
        self.detailed_results = []
        
    # Define intent categories
    INTENT_CATEGORIES = {
        "flight_status": ["status", "delay", "on time", "arrival", "departure", "flight sj"],
        "booking": ["book", "reserve", "ticket", "fare", "price", "cost", "round trip", "one way"],
        "cancellation": ["cancel", "refund", "change", "modify", "reschedule"],
        "baggage": ["baggage", "luggage", "suitcase", "carry-on", "checked bag"],
        "checkin": ["check-in", "check in", "boarding pass", "web check-in"],
        "contact": ["contact", "support", "help", "customer service", "complaint"],
        "meal": ["meal", "food", "dietary", "vegetarian", "drink"],
        "seat": ["seat", "legroom", "seat selection", "upgrade"],
        "policy": ["policy", "rule", "guideline", "restriction"],
        "general": ["hello", "hi", "thanks", "good morning", "bye"]
    }
    
    # Test cases with ground truth labels
    TEST_CASES = [
        # Flight Status Queries
        {"query": "What is the status of flight SJ101?", "true_intent": "flight_status", "subcategory": "status_check"},
        {"query": "Is flight SJ205 delayed?", "true_intent": "flight_status", "subcategory": "delay"},
        {"query": "When does flight SJ303 arrive?", "true_intent": "flight_status", "subcategory": "arrival"},
        {"query": "Show me departure time for SJ404", "true_intent": "flight_status", "subcategory": "departure"},
        {"query": "Any cancellations for SJ505 today?", "true_intent": "flight_status", "subcategory": "cancellation"},
        
        # Booking Queries
        {"query": "I want to book a flight from New York to London", "true_intent": "booking", "subcategory": "new_booking"},
        {"query": "How much is a ticket to Paris?", "true_intent": "booking", "subcategory": "pricing"},
        {"query": "Cheapest flights from Boston to Miami", "true_intent": "booking", "subcategory": "fare_search"},
        {"query": "Book round trip to Chicago", "true_intent": "booking", "subcategory": "round_trip"},
        {"query": "Any deals on flights to Tokyo?", "true_intent": "booking", "subcategory": "deals"},
        
        # Cancellation Queries
        {"query": "How do I cancel my booking?", "true_intent": "cancellation", "subcategory": "process"},
        {"query": "What's your cancellation policy?", "true_intent": "cancellation", "subcategory": "policy"},
        {"query": "Can I get a refund?", "true_intent": "cancellation", "subcategory": "refund"},
        {"query": "Change my flight date", "true_intent": "cancellation", "subcategory": "modification"},
        {"query": "Cancel my reservation ABC123", "true_intent": "cancellation", "subcategory": "specific_booking"},
        
        # Baggage Queries
        {"query": "What's the baggage allowance?", "true_intent": "baggage", "subcategory": "allowance"},
        {"query": "How much does extra baggage cost?", "true_intent": "baggage", "subcategory": "extra_cost"},
        {"query": "Lost baggage claim process", "true_intent": "baggage", "subcategory": "lost"},
        {"query": "Carry-on size limits", "true_intent": "baggage", "subcategory": "carry_on"},
        {"query": "Sports equipment baggage", "true_intent": "baggage", "subcategory": "special_items"},
        
        # Check-in Queries
        {"query": "When does check-in open?", "true_intent": "checkin", "subcategory": "timing"},
        {"query": "Can I check in online?", "true_intent": "checkin", "subcategory": "online"},
        {"query": "How to get boarding pass", "true_intent": "checkin", "subcategory": "boarding_pass"},
        {"query": "Mobile check-in app", "true_intent": "checkin", "subcategory": "mobile"},
        {"query": "Check-in counter location", "true_intent": "checkin", "subcategory": "airport"},
        
        # Contact/Support Queries
        {"query": "Customer service phone number", "true_intent": "contact", "subcategory": "phone"},
        {"query": "Email support", "true_intent": "contact", "subcategory": "email"},
        {"query": "Live chat support", "true_intent": "contact", "subcategory": "chat"},
        {"query": "Airport office location", "true_intent": "contact", "subcategory": "office"},
        {"query": "File a complaint", "true_intent": "contact", "subcategory": "complaint"},
        
        # Meal Queries
        {"query": "What meals do you serve?", "true_intent": "meal", "subcategory": "options"},
        {"query": "Vegetarian meal options", "true_intent": "meal", "subcategory": "special_diet"},
        {"query": "Can I pre-order meals?", "true_intent": "meal", "subcategory": "pre_order"},
        {"query": "Baby food on flights", "true_intent": "meal", "subcategory": "children"},
        {"query": "Allergy information", "true_intent": "meal", "subcategory": "allergies"},
        
        # Seat Queries
        {"query": "How to select seats?", "true_intent": "seat", "subcategory": "selection"},
        {"query": "Extra legroom seats", "true_intent": "seat", "subcategory": "legroom"},
        {"query": "Seat upgrade cost", "true_intent": "seat", "subcategory": "upgrade"},
        {"query": "Bulkhead seats", "true_intent": "seat", "subcategory": "bulkhead"},
        {"query": "Emergency exit seats", "true_intent": "seat", "subcategory": "exit_row"},
        
        # Policy Queries
        {"query": "Unaccompanied minor policy", "true_intent": "policy", "subcategory": "minors"},
        {"query": "Pet travel policy", "true_intent": "policy", "subcategory": "pets"},
        {"query": "Travel insurance", "true_intent": "policy", "subcategory": "insurance"},
        {"query": "Name change policy", "true_intent": "policy", "subcategory": "name_change"},
        {"query": "COVID-19 travel requirements", "true_intent": "policy", "subcategory": "health"},
        
        # General/Greeting Queries
        {"query": "Hello", "true_intent": "general", "subcategory": "greeting"},
        {"query": "Thank you", "true_intent": "general", "subcategory": "thanks"},
        {"query": "Good morning", "true_intent": "general", "subcategory": "greeting"},
        {"query": "Bye", "true_intent": "general", "subcategory": "farewell"},
        {"query": "Help", "true_intent": "general", "subcategory": "help"},
    ]
    
    def classify_intent(self, query: str, response: str) -> str:
        """Classify the predicted intent based on query and response"""
        query_lower = query.lower()
        response_lower = response.lower()
        
        # Check each category for keywords
        for intent, keywords in self.INTENT_CATEGORIES.items():
            for keyword in keywords:
                if keyword in query_lower or keyword in response_lower:
                    return intent
        
        return "unknown"
    
    def calculate_confidence(self, query: str, predicted_intent: str) -> float:
        """Calculate confidence score for the prediction"""
        query_lower = query.lower()
        
        # Count matching keywords
        if predicted_intent in self.INTENT_CATEGORIES:
            keywords = self.INTENT_CATEGORIES[predicted_intent]
            matches = sum(1 for keyword in keywords if keyword in query_lower)
            total_keywords = len(keywords)
            
            # Calculate confidence based on keyword matches
            if total_keywords > 0:
                confidence = min(matches / max(1, len(query_lower.split())), 1.0)
                return round(confidence, 3)
        
        return 0.5  # Default confidence
    
    async def test_single_query(self, session, test_case):
        """Test a single query and collect metrics"""
        start_time = time.time()
        
        try:
            async with session.post(
                f"{self.base_url}/api/chat",
                json={"message": test_case["query"]}
            ) as response:
                response_time = time.time() - start_time
                
                if response.status == 200:
                    data = await response.json()
                    bot_response = data.get("response", "")
                    
                    # Predict intent
                    predicted_intent = self.classify_intent(test_case["query"], bot_response)
                    confidence = self.calculate_confidence(test_case["query"], predicted_intent)
                    
                    # Store metrics
                    self.true_labels.append(test_case["true_intent"])
                    self.predicted_labels.append(predicted_intent)
                    self.confidence_scores.append(confidence)
                    self.response_times.append(response_time)
                    
                    result = {
                        "query": test_case["query"],
                        "true_intent": test_case["true_intent"],
                        "predicted_intent": predicted_intent,
                        "confidence": confidence,
                        "response_time": round(response_time, 3),
                        "status": "success",
                        "subcategory": test_case.get("subcategory", ""),
                        "response_preview": bot_response[:100]
                    }
                    
                else:
                    # Handle error case
                    self.true_labels.append(test_case["true_intent"])
                    self.predicted_labels.append("error")
                    self.confidence_scores.append(0.0)
                    self.response_times.append(response_time)
                    
                    result = {
                        "query": test_case["query"],
                        "true_intent": test_case["true_intent"],
                        "predicted_intent": "error",
                        "confidence": 0.0,
                        "response_time": round(response_time, 3),
                        "status": "error",
                        "status_code": response.status
                    }
                    
        except Exception as e:
            # Handle exception case
            self.true_labels.append(test_case["true_intent"])
            self.predicted_labels.append("error")
            self.confidence_scores.append(0.0)
            self.response_times.append(time.time() - start_time)
            
            result = {
                "query": test_case["query"],
                "true_intent": test_case["true_intent"],
                "predicted_intent": "error",
                "confidence": 0.0,
                "response_time": round(time.time() - start_time, 3),
                "status": "exception",
                "error": str(e)[:100]
            }
        
        self.detailed_results.append(result)
        return result
    
    async def run_evaluation(self):
        """Run complete evaluation with classification metrics"""
        print("=" * 70)
        print("🚀 SKYJET AIRLINES CHATBOT - CLASSIFICATION METRICS EVALUATION")
        print("=" * 70)
        print(f"📊 Total Test Cases: {len(self.TEST_CASES)}")
        print(f"📋 Intent Categories: {len(self.INTENT_CATEGORIES)}")
        print("-" * 70)
        
        async with aiohttp.ClientSession() as session:
            for i, test_case in enumerate(self.TEST_CASES, 1):
                print(f"\n📝 Test {i}/{len(self.TEST_CASES)}: {test_case['query'][:50]}...")
                result = await self.test_single_query(session, test_case)
                print(f"   True: {result['true_intent']:15} | Pred: {result['predicted_intent']:15} | Conf: {result['confidence']:.2f} | Time: {result['response_time']:.3f}s")
        
        return self.generate_classification_report()
    
    def generate_classification_report(self):
        """Generate comprehensive classification metrics report"""
        
        # Get unique labels
        all_labels = list(self.INTENT_CATEGORIES.keys()) + ["error", "unknown"]
        unique_labels = sorted(set(self.true_labels + self.predicted_labels))
        
        # Calculate metrics
        precision = precision_score(self.true_labels, self.predicted_labels, average='weighted', zero_division=0)
        recall = recall_score(self.true_labels, self.predicted_labels, average='weighted', zero_division=0)
        f1 = f1_score(self.true_labels, self.predicted_labels, average='weighted', zero_division=0)
        
        # Per-class metrics
        class_metrics = classification_report(
            self.true_labels, 
            self.predicted_labels, 
            labels=unique_labels,
            zero_division=0,
            output_dict=True
        )
        
        # Create confusion matrix
        cm = confusion_matrix(self.true_labels, self.predicted_labels, labels=unique_labels)
        
        print("\n" + "=" * 70)
        print("📊 CLASSIFICATION METRICS REPORT")
        print("=" * 70)
        
        # Overall metrics
        print("\n🎯 OVERALL PERFORMANCE:")
        overall_table = [
            ["Metric", "Score"],
            ["Precision (Weighted)", f"{precision:.3f}"],
            ["Recall (Weighted)", f"{recall:.3f}"],
            ["F1-Score (Weighted)", f"{f1:.3f}"],
            ["Accuracy", f"{(sum(1 for t,p in zip(self.true_labels, self.predicted_labels) if t==p)/len(self.true_labels)):.3f}"],
            ["Avg Confidence", f"{np.mean(self.confidence_scores):.3f}"],
            ["Avg Response Time", f"{np.mean(self.response_times):.3f}s"]
        ]
        print(tabulate(overall_table, headers="firstrow", tablefmt="grid"))
        
        # Per-class performance
        print("\n📈 PER-CLASS PERFORMANCE:")
        class_table = []
        for label in unique_labels:
            if label in class_metrics:
                metrics = class_metrics[label]
                class_table.append([
                    label,
                    f"{metrics['precision']:.3f}",
                    f"{metrics['recall']:.3f}",
                    f"{metrics['f1-score']:.3f}",
                    int(metrics['support'])
                ])
        
        print(tabulate(
            class_table,
            headers=["Intent", "Precision", "Recall", "F1-Score", "Support"],
            tablefmt="grid"
        ))
        
        # Plot confusion matrix
        self.plot_confusion_matrix(cm, unique_labels)
        
        # Plot metrics visualization
        self.plot_metrics_visualization(precision, recall, f1, class_metrics, unique_labels)
        
        # Misclassification analysis
        self.analyze_misclassifications()
        
        # Save detailed report
        self.save_report(precision, recall, f1, cm, unique_labels, class_metrics)
        
        return {
            "precision": precision,
            "recall": recall,
            "f1_score": f1,
            "accuracy": sum(1 for t,p in zip(self.true_labels, self.predicted_labels) if t==p)/len(self.true_labels),
            "avg_confidence": np.mean(self.confidence_scores),
            "avg_response_time": np.mean(self.response_times),
            "confusion_matrix": cm.tolist(),
            "class_metrics": class_metrics
        }
    
    def plot_confusion_matrix(self, cm, labels):
        """Plot and save confusion matrix"""
        plt.figure(figsize=(12, 10))
        
        # Calculate percentages
        cm_percentage = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis] * 100
        
        # Create annotation text with counts and percentages
        annot = np.empty_like(cm).astype(str)
        for i in range(cm.shape[0]):
            for j in range(cm.shape[1]):
                annot[i, j] = f'{cm[i, j]}\n({cm_percentage[i, j]:.1f}%)'
        
        # Plot heatmap
        sns.heatmap(cm, annot=annot, fmt='', xticklabels=labels, yticklabels=labels, 
                   cmap='Blues', cbar_kws={'label': 'Count'})
        
        plt.title('SkyJet Airlines Chatbot - Confusion Matrix', fontsize=16, fontweight='bold')
        plt.xlabel('Predicted Intent', fontsize=12)
        plt.ylabel('True Intent', fontsize=12)
        plt.xticks(rotation=45, ha='right')
        plt.yticks(rotation=0)
        plt.tight_layout()
        
        # Save plot
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        plt.savefig(f'confusion_matrix_{timestamp}.png', dpi=300, bbox_inches='tight')
        print(f"\n📊 Confusion matrix saved to: confusion_matrix_{timestamp}.png")
        plt.show()
    
    def plot_metrics_visualization(self, precision, recall, f1, class_metrics, labels):
        """Create comprehensive metrics visualization"""
        fig, axes = plt.subplots(2, 2, figsize=(14, 12))
        
        # 1. Overall metrics bar chart
        ax1 = axes[0, 0]
        metrics = ['Precision', 'Recall', 'F1-Score']
        scores = [precision, recall, f1]
        colors = ['#2ecc71', '#3498db', '#9b59b6']
        bars = ax1.bar(metrics, scores, color=colors, alpha=0.8)
        ax1.set_ylim(0, 1)
        ax1.set_ylabel('Score')
        ax1.set_title('Overall Performance Metrics', fontweight='bold')
        
        # Add value labels on bars
        for bar, score in zip(bars, scores):
            height = bar.get_height()
            ax1.text(bar.get_x() + bar.get_width()/2., height,
                    f'{score:.3f}', ha='center', va='bottom', fontweight='bold')
        
        # 2. Per-class F1 Scores
        ax2 = axes[0, 1]
        f1_scores = []
        valid_labels = []
        for label in labels:
            if label in class_metrics and isinstance(class_metrics[label], dict):
                f1_scores.append(class_metrics[label]['f1-score'])
                valid_labels.append(label)
        
        bars = ax2.barh(valid_labels, f1_scores, color='#3498db', alpha=0.7)
        ax2.set_xlim(0, 1)
        ax2.set_xlabel('F1-Score')
        ax2.set_title('Per-Class F1 Scores', fontweight='bold')
        
        # Add value labels
        for bar, score in zip(bars, f1_scores):
            width = bar.get_width()
            ax2.text(width + 0.01, bar.get_y() + bar.get_height()/2.,
                    f'{score:.3f}', ha='left', va='center')
        
        # 3. Confidence Distribution
        ax3 = axes[1, 0]
        ax3.hist(self.confidence_scores, bins=20, color='#2ecc71', alpha=0.7, edgecolor='black')
        ax3.set_xlabel('Confidence Score')
        ax3.set_ylabel('Frequency')
        ax3.set_title('Confidence Score Distribution', fontweight='bold')
        ax3.axvline(np.mean(self.confidence_scores), color='red', linestyle='--', 
                   label=f'Mean: {np.mean(self.confidence_scores):.3f}')
        ax3.legend()
        
        # 4. Response Time Distribution
        ax4 = axes[1, 1]
        ax4.hist(self.response_times, bins=20, color='#e74c3c', alpha=0.7, edgecolor='black')
        ax4.set_xlabel('Response Time (seconds)')
        ax4.set_ylabel('Frequency')
        ax4.set_title('Response Time Distribution', fontweight='bold')
        ax4.axvline(np.mean(self.response_times), color='blue', linestyle='--',
                   label=f'Mean: {np.mean(self.response_times):.3f}s')
        ax4.legend()
        
        plt.suptitle('SkyJet Airlines Chatbot - Performance Analytics', fontsize=16, fontweight='bold')
        plt.tight_layout()
        
        # Save plot
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        plt.savefig(f'metrics_visualization_{timestamp}.png', dpi=300, bbox_inches='tight')
        print(f"📊 Metrics visualization saved to: metrics_visualization_{timestamp}.png")
        plt.show()
    
    def analyze_misclassifications(self):
        """Analyze and display misclassification patterns"""
        misclassifications = []
        
        for i, (true, pred) in enumerate(zip(self.true_labels, self.predicted_labels)):
            if true != pred:
                misclassifications.append({
                    "query": self.detailed_results[i]["query"],
                    "true_intent": true,
                    "predicted_intent": pred,
                    "confidence": self.confidence_scores[i]
                })
        
        print("\n🔍 MISCLASSIFICATION ANALYSIS:")
        print(f"   Total Misclassifications: {len(misclassifications)}/{len(self.true_labels)} ({len(misclassifications)/len(self.true_labels)*100:.1f}%)")
        
        if misclassifications:
            # Group by confusion pairs
            confusion_pairs = defaultdict(int)
            for m in misclassifications:
                pair = f"{m['true_intent']} → {m['predicted_intent']}"
                confusion_pairs[pair] += 1
            
            print("\n   Top Misclassification Patterns:")
            confusion_table = []
            for pair, count in sorted(confusion_pairs.items(), key=lambda x: x[1], reverse=True)[:5]:
                confusion_table.append([pair, count, f"{count/len(misclassifications)*100:.1f}%"])
            
            print(tabulate(
                confusion_table,
                headers=["Pattern", "Count", "Percentage"],
                tablefmt="grid"
            ))
            
            # Show example misclassifications
            print("\n   Example Misclassifications:")
            for m in misclassifications[:3]:
                print(f"   • Query: {m['query'][:50]}...")
                print(f"     True: {m['true_intent']:15} → Pred: {m['predicted_intent']:15} (Conf: {m['confidence']:.2f})")
    
    def save_report(self, precision, recall, f1, cm, labels, class_metrics):
        """Save comprehensive report to file"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = f'classification_report_{timestamp}.json'
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "total_tests": len(self.true_labels),
            "overall_metrics": {
                "precision_weighted": precision,
                "recall_weighted": recall,
                "f1_score_weighted": f1,
                "accuracy": sum(1 for t,p in zip(self.true_labels, self.predicted_labels) if t==p)/len(self.true_labels),
                "avg_confidence": np.mean(self.confidence_scores),
                "avg_response_time": np.mean(self.response_times),
                "std_response_time": np.std(self.response_times)
            },
            "per_class_metrics": class_metrics,
            "confusion_matrix": cm.tolist(),
            "labels": labels,
            "detailed_results": self.detailed_results
        }
        
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"\n📁 Full classification report saved to: {report_file}")

async def main():
    # Run classification metrics evaluation
    evaluator = ChatbotClassificationMetrics()
    results = await evaluator.run_evaluation()
    
    print("\n" + "=" * 70)
    print("✅ EVALUATION COMPLETE")
    print("=" * 70)
    print(f"\n🏆 SUMMARY SCORES:")
    print(f"   Precision: {results['precision']:.3f}")
    print(f"   Recall:    {results['recall']:.3f}")
    print(f"   F1-Score:  {results['f1_score']:.3f}")
    print(f"   Accuracy:  {results['accuracy']:.3f}")
    
    # Grade the chatbot
    avg_score = (results['precision'] + results['recall'] + results['f1_score']) / 3
    
    if avg_score >= 0.90:
        grade = "A+ 🏆"
        recommendation = "Excellent! Ready for production."
    elif avg_score >= 0.80:
        grade = "A 👍"
        recommendation = "Very good, minor improvements needed."
    elif avg_score >= 0.70:
        grade = "B 📊"
        recommendation = "Good, but several areas need improvement."
    elif avg_score >= 0.60:
        grade = "C ⚠️"
        recommendation = "Fair, significant improvements needed."
    else:
        grade = "D ❌"
        recommendation = "Poor, requires major improvements."
    
    print(f"\n   Overall Grade: {grade}")
    print(f"   Recommendation: {recommendation}")

if __name__ == "__main__":
    # Install required packages if not already installed
    import subprocess
    import sys
    
    required_packages = ['aiohttp', 'numpy', 'scikit-learn', 'matplotlib', 'seaborn', 'pandas', 'tabulate']
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            print(f"Installing {package}...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
    
    asyncio.run(main())