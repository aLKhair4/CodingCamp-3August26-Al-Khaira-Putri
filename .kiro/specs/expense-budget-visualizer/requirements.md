# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses, view spending distribution by category through a pie chart, and manage a list of financial transactions. All data is persisted in the browser via the Local Storage API. The application is built with HTML, CSS, and vanilla JavaScript, requires no backend, and is designed to work on modern browsers with a mobile-friendly, professional dashboard layout resembling a modern banking application. Additional features include dark/light mode toggle, custom categories, and transaction sorting.

## Glossary

- **Application**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense entry consisting of an item name, an amount, and a category.
- **Category**: A label assigned to a transaction. Built-in categories are Food, Transport, and Fun. Users may also define custom categories.
- **Transaction_List**: The UI component that displays all stored transactions.
- **Input_Form**: The UI form used to create a new transaction.
- **Balance_Display**: The UI component at the top of the dashboard that shows the total balance derived from all transactions.
- **Chart**: The pie chart component that visualises spending distribution by category, rendered using Chart.js.
- **Local_Storage**: The browser's Local Storage API used to persist transaction data between sessions.
- **Theme_Toggle**: The control that switches the Application between dark mode and light mode.
- **Sort_Control**: The control that changes the display order of transactions in the Transaction_List.

---

## Requirements

### Requirement 1: Transaction Input

**User Story:** As a user, I want to enter an expense with a name, amount, and category, so that I can record my spending.

#### Acceptance Criteria

1. THE Input_Form SHALL provide a text field for the item name (maximum 100 characters), a numeric field for the amount, and a category selector.
2. THE Input_Form SHALL include the built-in categories Food, Transport, and Fun in the category selector.
3. WHEN the user submits the Input_Form with all fields filled and a valid positive numeric amount, THE Application SHALL add the transaction to the Transaction_List and persist it to Local_Storage.
4. WHEN the user submits the Input_Form with an empty item name field, THE Input_Form SHALL display a descriptive validation error message and SHALL NOT add a transaction.
5. WHEN the user submits the Input_Form with no category selected, THE Input_Form SHALL display a descriptive validation error message and SHALL NOT add a transaction.
6. WHEN the user submits the Input_Form with a non-positive or non-numeric amount, THE Input_Form SHALL display a descriptive validation error message and SHALL NOT add a transaction.
7. WHEN the user submits the Input_Form with an amount greater than 999,999,999.99, THE Input_Form SHALL display a descriptive validation error message and SHALL NOT add a transaction.
8. WHEN a transaction is successfully added, THE Input_Form SHALL clear all fields and reset to its default state within 1 second.

---

### Requirement 2: Transaction List Display

**User Story:** As a user, I want to see a list of all my recorded transactions, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display every stored transaction, each showing the item name, amount (formatted to two decimal places), category, and date added.
2. WHEN the Application loads, THE Transaction_List SHALL render all transactions previously persisted in Local_Storage, ordered most recent first by default.
3. WHEN a new transaction is added, THE Transaction_List SHALL insert the new transaction at the top of the list without requiring a page reload.
4. WHEN no transactions exist in Local_Storage on load, THE Transaction_List SHALL display an empty state message indicating no transactions have been recorded.

---

### Requirement 3: Delete Transaction

**User Story:** As a user, I want to delete a transaction, so that I can correct mistakes or remove outdated entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL display a delete control for each transaction entry.
2. WHEN the user activates the delete control for a transaction, THE Application SHALL display a confirmation prompt identifying the transaction by its item name and amount before proceeding with deletion.
3. WHEN the user confirms the deletion, THE Application SHALL remove that transaction from the Transaction_List, remove it from Local_Storage, and update the Balance_Display and Chart to reflect the removal within 1 second.
4. IF the user cancels the confirmation prompt, THEN THE Application SHALL close the prompt and leave the Transaction_List, Local_Storage, Balance_Display, and Chart unchanged.
5. IF Local_Storage is unavailable when deletion is confirmed, THEN THE Application SHALL display an error message indicating the deletion could not be saved and leave the transaction in the Transaction_List unchanged.

---

### Requirement 4: Total Balance Display

**User Story:** As a user, I want to see my total balance at the top of the dashboard, so that I always know how much I have spent overall.

#### Acceptance Criteria

1. THE Balance_Display SHALL be positioned at the top of the dashboard and SHALL show the sum of the amounts of all transactions, formatted to two decimal places with a currency symbol.
2. WHEN a transaction is added, THE Balance_Display SHALL update to reflect the new total within 1 second.
3. WHEN a transaction is deleted, THE Balance_Display SHALL update to reflect the revised total within 1 second.
4. WHEN no transactions exist, THE Balance_Display SHALL show a balance of "0.00" with the currency symbol.
5. WHEN transactions include negative amounts, THE Balance_Display SHALL include those negative values in the sum.

---

### Requirement 5: Spending Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money goes.

#### Acceptance Criteria

1. THE Chart SHALL render as a pie chart using the Chart.js library, showing one segment per unique expense category that has at least one transaction, with each arc sized proportionally to that category's total amount as a percentage of the overall total.
2. WHEN a transaction is added, THE Chart SHALL update to reflect the new spending distribution within 1 second without requiring a page reload.
3. WHEN a transaction is deleted, THE Chart SHALL update to reflect the revised spending distribution within 1 second without requiring a page reload.
4. WHEN no transactions exist, THE Chart SHALL hide the chart canvas and display a message indicating there is no spending data to visualise.
5. WHEN a transaction has no assigned category, THE Chart SHALL group it under an "Uncategorized" segment.

---

### Requirement 6: Data Persistence

**User Story:** As a user, I want my transactions to be saved between browser sessions, so that I do not lose my data when I close or refresh the page.

#### Acceptance Criteria

1. WHEN a transaction is added, THE Application SHALL write the updated transaction list to Local_Storage under a consistent, application-reserved key.
2. WHEN a transaction is deleted, THE Application SHALL write the updated transaction list to Local_Storage under the same application-reserved key.
3. WHEN the Application loads, THE Application SHALL read all transactions from Local_Storage and restore them to the Transaction_List, Balance_Display, and Chart within 500ms.
4. WHEN the Application loads and no transaction data exists in Local_Storage, THE Application SHALL initialize the Transaction_List to empty, the Balance_Display to zero, and the Chart to its empty state.
5. IF Local_Storage is unavailable or returns malformed data, THEN THE Application SHALL display a user-visible error message and continue operating with an empty transaction list held in memory.
6. FOR ALL transaction objects written to Local_Storage, parsing the stored JSON and serializing the resulting objects back to JSON SHALL produce an equivalent string (round-trip property).

---

### Requirement 7: Dark / Light Mode Toggle

**User Story:** As a user, I want to switch between dark mode and light mode, so that I can use the application comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Theme_Toggle SHALL be visible and accessible at viewport widths of 320 px, 768 px, and 1024 px.
2. WHEN the user activates the Theme_Toggle, THE Application SHALL switch all UI elements between dark mode and light mode within 300ms.
3. WHEN the Application loads, THE Application SHALL apply the theme last selected by the user (as persisted in Local_Storage) before rendering visible content to avoid a flash of unstyled content.
4. WHEN no theme preference is stored in Local_Storage, THE Application SHALL default to light mode before rendering visible content.

---

### Requirement 8: Custom Categories

**User Story:** As a user, I want to define my own expense categories, so that I can organise spending beyond the built-in options.

#### Acceptance Criteria

1. THE Application SHALL provide a control to create a custom category by entering a name between 1 and 50 characters containing at least one non-whitespace character.
2. WHEN the user creates a custom category, THE Input_Form category selector SHALL include the new category alongside the built-in categories within the same render cycle, without requiring a page reload.
3. WHEN the Application loads, THE Application SHALL restore all previously created custom categories from Local_Storage alongside the built-in categories so that they are available in the category selector.
4. IF the user attempts to create a category whose name matches any existing built-in or custom category (case-insensitive), THEN THE Application SHALL display an error message and SHALL NOT create a duplicate category.
5. IF Local_Storage is unavailable or returns malformed category data on load, THEN THE Application SHALL fall back to the built-in categories only and display a user-visible warning.
6. WHEN a custom category is successfully created, THE Application SHALL write the updated category list to Local_Storage.

---

### Requirement 9: Sort Transactions

**User Story:** As a user, I want to sort my transaction list by amount or by category, so that I can find and analyse transactions more easily.

#### Acceptance Criteria

1. THE Sort_Control SHALL offer exactly the following sort options: by amount ascending, by amount descending, by category ascending (A–Z), and by category descending (Z–A).
2. WHEN the user selects a sort option, THE Transaction_List SHALL reorder all displayed transactions according to the selected option within 500ms.
3. WHEN a new transaction is added while a sort option is active, THE Transaction_List SHALL display the updated list in the currently active sort order within 500ms of the addition being confirmed.
4. WHEN two or more transactions share the same amount or category under the active sort, THE Application SHALL use date descending (most recent first) as the tiebreaker to ensure a deterministic display order.
5. WHEN the Sort_Control is active and the Transaction_List is empty, THE Application SHALL retain the selected sort option and display the empty state message.

---

### Requirement 10: Responsive Layout and Browser Compatibility

**User Story:** As a user, I want the application to work well on both desktop and mobile browsers, so that I can track expenses from any device.

#### Acceptance Criteria

1. THE Application SHALL render correctly on viewport widths from 320 px to 2560 px with no clipped, overlapping, or inaccessible content.
2. THE Application SHALL function correctly — including adding transactions, deleting transactions, toggling the theme, and rendering the chart — on the current stable releases of Chrome, Firefox, Edge, and Safari.
3. THE Application SHALL use only native browser APIs (HTML, CSS, vanilla JavaScript, Local Storage API, and Chart.js) and SHALL NOT depend on any server-side runtime.
4. WHILE the Application is displayed on a viewport narrower than 768 px (down to 320 px), THE Application SHALL stack layout sections vertically and maintain full usability without horizontal scrolling.
5. WHILE the Application is displayed on a touch-enabled device, all interactive controls SHALL respond to touch events within 300ms and SHALL function equivalently to their desktop pointer counterparts.
