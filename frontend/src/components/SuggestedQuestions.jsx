import React from 'react';

const SuggestedQuestions = ({ onSelect }) => {
  const questions = [
    "What is the baggage allowance?",
    "How can I change my flight?",
    "What are the check-in times?",
    "Do you allow pets on board?",
    "How much does extra baggage cost?",
    "What is your cancellation policy?"
  ];

  return (
    <div className="suggested-questions">
      <h3>Quick Questions:</h3>
      <div className="questions-grid">
        {questions.map((question, index) => (
          <button
            key={index}
            className="question-chip"
            onClick={() => onSelect(question)}
          >
            {question}
          </button>
        ))}
      </div>
      <style jsx>{`
        .suggested-questions {
          margin: 30px 0;
        }
        
        .suggested-questions h3 {
          color: #444;
          margin-bottom: 15px;
          font-size: 1.1rem;
        }
        
        .questions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
        }
        
        .question-chip {
          padding: 12px 15px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          color: #374151;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.9rem;
          text-align: left;
        }
        
        .question-chip:hover {
          background: #e5e7eb;
          transform: translateY(-2px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        @media (max-width: 768px) {
          .questions-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default SuggestedQuestions;