Technical Case (NestJS, MongoDB, Nuxt 3) 
1. Main Problem 
As an estate agency consultancy, one of the most critical moments for us is the process that 
begins after an agreement is reached for the sale or rental of a property. Currently, this process 
(earnest money, title deeds, payments, etc.) is largely manual and tracked using various tools. 
Once the transaction is completed, the distribution of the total service fee (commission) between 
the company and the agents is both time-consuming and prone to human error due to complex 
rules. 
We need a backend and frontend system that: 
● Automates this process 
● Ensures traceability 
● Accurately manages the value flow for all financial stakeholders 
● Provides a user interface to manage and visualize these transactions. 
2. Expected Solution 
We expect you to design and develop the core backend logic and a functional frontend of a 
system that solves the problem described above. The system should have the following 
capabilities: 
● Track the lifecycle of a transaction from start to finish 
● Automatically distribute the total service fee to agency and agents 
● Provide a clear financial breakdown for any transaction 
● Expose and consume APIs that allow interaction with the system 
You are free to decide: 
● How to structure your NestJS modules, services, controllers 
● How to organize business logic 
● How to design your data models 
● How to structure your API endpoints 
● How to architect your Nuxt 3 pages, components, and state management. 
3. Tech Stack Requirements (Mandatory) 
To ensure consistency across submissions, the following stack is required: 
Backend: 
● Node.js (LTS) 
● TypeScript 
● NestJS (mandatory) 
● MongoDB Atlas (mandatory) 
● Mongoose or MongoDB Node.js driver 
● Jest (recommended) 
Frontend: 
● Framework: Nuxt 3 
● State Management: Pinia 
● Styling: Tailwind CSS (recommended) 
4. Core Rules and Scenarios 
4.1 Transaction Stages 
A transaction goes through specific stages: agreement, earnest_money, title_deed, 
completed. 
● Track the stage of every transaction 
● Allow stage transitions 
● The frontend must provide a dashboard to visualize and trigger these transitions. 
● Optionally prevent invalid transitions (your decision — explain in DESIGN.md) 
4.2 Financial Breakdown 
The system should clearly report who earned how much for each completed transaction: 
● How much the agency earned 
● How much each agent earned 
● Why they earned that amount (listing agent / selling agent) 
You may store this breakdown: 
● Embedded in the transaction document, 
● In a dedicated collection, 
● Or compute it dynamically. 
Your DESIGN.md should justify your approach. 
4.3 Company Commission Policy 
● 50% of the total service fee belongs to the agency 
● The remaining 50% is shared among the agents involved 
Scenario 1 
If the listing agent and the selling agent are the same person, that agent receives 100% of 
the agent portion (50%). 
Scenario 2 
If the listing agent and selling agent are different, they share the agent portion equally (25% 
each). 
Your code and tests must implement these rules. 
5. Design Freedom and Responsibilities 
Within the constraints of NestJS + MongoDB Atlas and Nuxt 3, you are free to design: 
● Module organization & Service structure. 
● Database schema & Business logic separation. 
● API endpoints & Frontend Page structure. 
● Error handling & Validation structure (DTOs, pipes, etc.). 
● Frontend UI/UX: Dashboard design for tracking transactions and financial reports. 
All design choices must be explained in DESIGN.md. 
6. Deliverables 
● 6.1 Source Code (Git repository): Public Git repository containing both backend and 
frontend folders. 
● 6.2 Unit Tests: Mandatory for backend (Commission rules, stage transitions, and core 
business logic). 
● 6.3 DESIGN.md: Explain your architecture, data models, and frontend state 
management. 
● 6.4 README.md: Installation and run instructions for both projects. 
● 6.5 Deployment: Provide a Live API URL and a Live Frontend URL. Must use MongoDB 
Atlas. 
7. Evaluation Criteria 
● Problem Analysis & Data Modeling 
● System Design & Architecture 
● Code Quality & Business Logic 
● Testing & Deployment 
8. Good Luck! 
This task is more than a coding exercise — it’s an engineering and design challenge. You have 
full autonomy within the NestJS + Nuxt 3 + MongoDB Atlas stack to showcase your ability to 
build a robust, scalable, and user-centric full-stack application. 
We look forward to seeing your architectural decisions and how you handle the synergy 
between a powerful backend and a modern frontend. 
Deadline: You may choose your own deadline. However, both the time you take and the quality 
of results will influence our evaluation. 