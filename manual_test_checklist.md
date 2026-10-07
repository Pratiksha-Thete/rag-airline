# SkyJet Airlines Chatbot - Manual Testing Checklist

## Flight Status Queries
- [ ] "Flight SJ101 status" - Should show current status
- [ ] "Is SJ205 on time?" - Should indicate if delayed/on time
- [ ] "SJ303 departure time" - Should show departure info
- [ ] "Flight from New York to London status" - Should find correct flight

## Booking and Reservations
- [ ] "Book flight from Boston to Miami" - Should start booking process
- [ ] "Flight prices to Chicago" - Should show fare information
- [ ] "Round trip to Seattle" - Should handle round trip queries
- [ ] "Cheapest flights to Paris" - Should find best prices

## Cancellations and Refunds
- [ ] "Cancel my flight" - Should explain cancellation process
- [ ] "Refund policy" - Should provide refund information
- [ ] "Change my booking" - Should explain modification options

## Baggage Information
- [ ] "Baggage allowance" - Should show weight/size limits
- [ ] "Extra baggage cost" - Should provide pricing
- [ ] "Lost baggage" - Should guide through reporting process

## Check-in Process
- [ ] "Online check-in" - Should explain check-in options
- [ ] "Check-in times" - Should show check-in window
- [ ] "Boarding pass" - Should explain how to get boarding pass

## Customer Service
- [ ] "Contact support" - Should provide contact methods
- [ ] "Complaint" - Should handle complaints appropriately
- [ ] "Feedback" - Should accept and acknowledge feedback

## Edge Cases
- [ ] Empty message - Should handle gracefully
- [ ] Gibberish input - Should respond appropriately
- [ ] Very long message - Should handle without errors
- [ ] Special characters - Should process correctly
- [ ] Multiple languages - Should handle or respond appropriately

## Performance Metrics
- [ ] Response time < 2 seconds
- [ ] No server errors (500)
- [ ] Consistent formatting
- [ ] Proper error messages
- [ ] Conversation context maintained