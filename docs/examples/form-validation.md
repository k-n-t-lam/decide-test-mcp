# Form Validation - Decision Table Example

This example demonstrates testing a registration form with various validation scenarios.

| Test ID | Scenario | First Name | Last Name | Email | Password | Confirm | Terms | Expected Result | Priority |
|---------|----------|-----------|----------|-------|----------|---------|-------|-----------------|----------|
| FV001 | Valid Registration | John | Doe | john@example.com | Pass123! | Pass123! | Yes | Account created | high |
| FV002 | Password Mismatch | Jane | Smith | jane@example.com | Pass123! | Pass456! | Yes | Error: Passwords don't match | high |
| FV003 | Invalid Email | Bob | Jones | bob-email | Pass123! | Pass123! | Yes | Error: Invalid email format | medium |
| FV004 | Password Too Short | Alice | Williams | alice@example.com | Pass1 | Pass1 | Yes | Error: Password too short | high |
| FV005 | Missing First Name | | Anderson | email@example.com | Pass123! | Pass123! | Yes | Error: First name required | medium |
| FV006 | Missing Last Name | Michael |  | email@example.com | Pass123! | Pass123! | Yes | Error: Last name required | medium |
| FV007 | Terms Not Accepted | Sarah | Brown | sarah@example.com | Pass123! | Pass123! | No | Error: Must accept terms | medium |
| FV008 | No Special Characters | Emily | Davis | emily@example.com | Password123 | Password123 | Yes | Error: Password requires special char | high |
| FV009 | Email Already Exists | Thomas | Miller | existing@example.com | Pass123! | Pass123! | Yes | Error: Email already registered | medium |
| FV010 | All Fields Empty |  |  |  |  |  | No | Multiple validation errors | low |
| FV011 | Whitespace Trimming | John | Doe | john@example.com | Pass123! | Pass123! | Yes | Account created | low |
| FV012 | Case Insensitive Email | Jane | Smith | JANE@EXAMPLE.COM | Pass123! | Pass123! | Yes | Account created | low |
| FV013 | Maximum Length First Name | ThisIsAVeryLongFirstNameThatExceedsTheMaximum | Doe | max@example.com | Pass123! | Pass123! | Yes | Error: Name too long | low |
| FV014 | Special Characters in Name | John-Paul | O'Brien | jp@example.com | Pass123! | Pass123! | Yes | Account created | low |
