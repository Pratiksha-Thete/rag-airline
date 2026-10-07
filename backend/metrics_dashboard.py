import json
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
import glob
import os

class MetricsDashboard:
    def __init__(self):
        self.reports_dir = "."
        
    def load_latest_report(self):
        """Load the most recent classification report"""
        report_files = glob.glob(f"{self.reports_dir}/classification_report_*.json")
        if not report_files:
            print("No classification reports found!")
            return None
        
        latest_file = max(report_files, key=os.path.getctime)
        with open(latest_file, 'r') as f:
            return json.load(f)
    
    def generate_dashboard(self):
        """Generate comprehensive metrics dashboard"""
        report = self.load_latest_report()
        if not report:
            return
        
        # Create dashboard figure
        fig = plt.figure(figsize=(20, 12))
        
        # 1. Overall metrics gauge
        ax1 = plt.subplot(3, 3, 1)
        metrics = report['overall_metrics']
        self.plot_gauge(ax1, metrics['f1_score_weighted'], 'Overall F1-Score')
        
        # 2. Precision-Recall-F1 comparison
        ax2 = plt.subplot(3, 3, 2)
        self.plot_metrics_comparison(ax2, metrics)
        
        # 3. Per-class performance heatmap
        ax3 = plt.subplot(3, 3, 3)
        self.plot_class_heatmap(ax3, report['per_class_metrics'])
        
        # 4. Confusion matrix
        ax4 = plt.subplot(3, 3, (4, 6))
        self.plot_confusion_matrix_enhanced(ax4, report)
        
        # 5. Performance by class
        ax5 = plt.subplot(3, 3, 7)
        self.plot_class_performance(ax5, report['per_class_metrics'])
        
        # 6. Response time analysis
        ax6 = plt.subplot(3, 3, 8)
        self.plot_response_time(ax6, report)
        
        # 7. Confidence analysis
        ax7 = plt.subplot(3, 3, 9)
        self.plot_confidence_analysis(ax7, report)
        
        plt.suptitle(f'SkyJet Airlines Chatbot - Performance Dashboard\n{report["timestamp"]}', 
                    fontsize=16, fontweight='bold')
        plt.tight_layout()
        
        # Save dashboard
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        plt.savefig(f'dashboard_{timestamp}.png', dpi=300, bbox_inches='tight')
        plt.show()
        
        print(f"📊 Dashboard saved to: dashboard_{timestamp}.png")
    
    def plot_gauge(self, ax, value, title):
        """Plot a gauge chart for single metric"""
        # Create gauge
        theta = np.linspace(np.pi, 0, 100)
        r = [0.8] * 100
        
        # Color based on value
        if value >= 0.8:
            color = '#2ecc71'
        elif value >= 0.6:
            color = '#f39c12'
        else:
            color = '#e74c3c'
        
        # Plot gauge background
        ax.fill_between(theta, 0, r, alpha=0.3, color='gray')
        
        # Plot value
        value_idx = int(value * 100)
        ax.fill_between(theta[:value_idx], 0, r[:value_idx], alpha=0.8, color=color)
        
        # Add needle
        needle_angle = np.pi * (1 - value)
        ax.plot([0, 0.8 * np.cos(needle_angle)], 
               [0, 0.8 * np.sin(needle_angle)], 
               'k-', linewidth=3)
        
        ax.set_xlim(-1, 1)
        ax.set_ylim(0, 1)
        ax.set_aspect('equal')
        ax.set_title(f'{title}\n{value:.3f}', fontweight='bold')
        ax.axis('off')
    
    def plot_metrics_comparison(self, ax, metrics):
        """Plot comparison of key metrics"""
        names = ['Precision', 'Recall', 'F1-Score', 'Accuracy']
        values = [
            metrics['precision_weighted'],
            metrics['recall_weighted'],
            metrics['f1_score_weighted'],
            metrics['accuracy']
        ]
        colors = ['#3498db', '#2ecc71', '#9b59b6', '#e74c3c']
        
        bars = ax.bar(names, values, color=colors, alpha=0.8)
        ax.set_ylim(0, 1)
        ax.set_ylabel('Score')
        ax.set_title('Key Metrics Comparison', fontweight='bold')
        
        for bar, value in zip(bars, values):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'{value:.3f}', ha='center', va='bottom')
    
    def plot_class_heatmap(self, ax, class_metrics):
        """Plot heatmap of per-class metrics"""
        classes = []
        precisions = []
        recalls = []
        f1s = []
        
        for cls, metrics in class_metrics.items():
            if isinstance(metrics, dict) and 'precision' in metrics:
                classes.append(cls[:10])  # Truncate long names
                precisions.append(metrics['precision'])
                recalls.append(metrics['recall'])
                f1s.append(metrics['f1-score'])
        
        data = pd.DataFrame({
            'Precision': precisions,
            'Recall': recalls,
            'F1-Score': f1s
        }, index=classes)
        
        sns.heatmap(data.T, annot=True, fmt='.3f', cmap='YlOrRd', ax=ax, cbar_kws={'label': 'Score'})
        ax.set_title('Per-Class Metrics Heatmap', fontweight='bold')
        ax.set_xlabel('Intent Class')
        ax.set_ylabel('Metric')
    
    def plot_confusion_matrix_enhanced(self, ax, report):
        """Plot enhanced confusion matrix"""
        cm = np.array(report['confusion_matrix'])
        labels = report['labels']
        
        # Calculate percentages
        cm_percentage = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis] * 100
        
        # Create annotation
        annot = np.empty_like(cm).astype(str)
        for i in range(cm.shape[0]):
            for j in range(cm.shape[1]):
                annot[i, j] = f'{cm[i, j]}\n({cm_percentage[i, j]:.1f}%)'
        
        sns.heatmap(cm, annot=annot, fmt='', xticklabels=labels, yticklabels=labels,
                   cmap='Blues', ax=ax, cbar_kws={'label': 'Count'})
        ax.set_title('Confusion Matrix', fontweight='bold')
        ax.set_xlabel('Predicted')
        ax.set_ylabel('True')
    
    def plot_class_performance(self, ax, class_metrics):
        """Plot F1 scores by class"""
        classes = []
        f1_scores = []
        
        for cls, metrics in class_metrics.items():
            if isinstance(metrics, dict) and 'f1-score' in metrics:
                classes.append(cls)
                f1_scores.append(metrics['f1-score'])
        
        # Sort by F1 score
        sorted_data = sorted(zip(f1_scores, classes), reverse=True)
        f1_scores, classes = zip(*sorted_data)
        
        bars = ax.barh(classes, f1_scores, color='#3498db', alpha=0.7)
        ax.set_xlim(0, 1)
        ax.set_xlabel('F1-Score')
        ax.set_title('F1 Scores by Intent Class', fontweight='bold')
        
        for bar, score in zip(bars, f1_scores):
            width = bar.get_width()
            ax.text(width + 0.01, bar.get_y() + bar.get_height()/2.,
                   f'{score:.3f}', ha='left', va='center')
    
    def plot_response_time(self, ax, report):
        """Plot response time statistics"""
        # Extract response times from detailed results
        response_times = [r['response_time'] for r in report['detailed_results'] 
                         if 'response_time' in r]
        
        ax.hist(response_times, bins=20, color='#e74c3c', alpha=0.7, edgecolor='black')
        ax.axvline(report['overall_metrics']['avg_response_time'], 
                  color='blue', linestyle='--', 
                  label=f"Mean: {report['overall_metrics']['avg_response_time']:.3f}s")
        ax.set_xlabel('Response Time (seconds)')
        ax.set_ylabel('Frequency')
        ax.set_title('Response Time Distribution', fontweight='bold')
        ax.legend()
    
    def plot_confidence_analysis(self, ax, report):
        """Plot confidence score analysis"""
        confidences = [r['confidence'] for r in report['detailed_results'] 
                      if 'confidence' in r]
        
        ax.hist(confidences, bins=20, color='#2ecc71', alpha=0.7, edgecolor='black')
        ax.axvline(report['overall_metrics']['avg_confidence'], 
                  color='red', linestyle='--',
                  label=f"Mean: {report['overall_metrics']['avg_confidence']:.3f}")
        ax.set_xlabel('Confidence Score')
        ax.set_ylabel('Frequency')
        ax.set_title('Confidence Score Distribution', fontweight='bold')
        ax.legend()

if __name__ == "__main__":
    import numpy as np
    dashboard = MetricsDashboard()
    dashboard.generate_dashboard()