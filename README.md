# Automated Factory Farm Objection Generator (AFOG)

## 🚀 Project Overview

The **Automated Factory Farm Objection Generator (AFOG)** is a platform designed to empower citizens and NGOs to effectively oppose factory farm planning permit applications. Our system automates the detection of permit filings and leverages AI to generate compelling, legally-referenced objection letters.

### Mission
Continue proven Mumbai C4C project. Auto-detect permit filings, generate compelling objection letters with legal citations. Scale objection capacity 100x.

### Key Features:
*   **Permit Detection:** Identifies new factory farm permit applications.
*   **AI-Powered Letter Generation:** Uses the Gemini API to draft persuasive objection letters, citing relevant Indian environmental and animal welfare regulations.
*   **Legal Citation Library:** Comprehensive database of relevant laws and regulations.
*   **Submission Tracking System:** Interface for NGOs to track their submissions.
*   **Downloadable Letters:** Provides generated letters in a downloadable format (PDF).
*   **Email Integration:** Email notifications and sending capabilities for permit submissions.
*   **User-Friendly Web Interface:** A clean interface for NGOs and citizens to generate and track objection letters.

## ⚙️ Tech Stack

| Component     | Technology Used               | Notes                                                              |
|---------------|-------------------------------|--------------------------------------------------------------------|
| **Frontend**  | Next.js (React), Tailwind CSS | A powerful React framework for building modern web applications with integrated styling. ESLint is configured for code quality. |
| **Backend**   | Node.js, Express              | A web framework for handling API requests and AI integration. It serves as the brain for data processing and AI interaction. |
| **AI/LLM**    | Google Gemini API             | For generating intelligent and context-aware objection letters. This is the core AI component. |
| **Data Storage**| JSON Files / Database         | Storage for permit data, legal citations, and submission tracking. |
| **Email**     | Nodemailer                    | For sending objection letters and notifications. |

## 📂 Project Structure
```
Automated-Factory-Farm-Objection-Generator/
├── backend/                    # Node.js/Express application
│   ├── server.js               # Main server file: Defines API endpoints for permit detection and letter generation.
│   ├── package.json            # Node.js dependencies: Lists all backend libraries (e.g., express, @google/generative-ai, nodemailer).
│   └── permits.json            # Permit data: A JSON file containing factory farm permit applications.
├── frontend/                   # Next.js application: The user-facing web interface.
│   ├── public/                 # Static assets: Images, fonts, and other static files.
│   ├── src/app/                # React components for routes: Each file here becomes a route (e.g., page.tsx for the homepage).
│   ├── package.json            # Node.js project dependencies: Lists all frontend libraries (e.g., React, Next.js, Tailwind CSS).
│   ├── next.config.ts          # Next.js configuration: Custom settings for the Next.js build.
│   ├── tailwind.config.js      # Tailwind CSS configuration: Customizes Tailwind's utility classes.
│   └── postcss.config.js       # PostCSS configuration: Processes CSS with plugins like Autoprefixer and Tailwind CSS.
├── policiesandlaws.json        # Legal data: Contains environmental and animal welfare regulations.
├── hackathon_plan.md           # Detailed hackathon plan and timeline: A step-by-step guide for the team.
└── README.md                   # Project overview and setup instructions: This file!
```

## 🚀 Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

*   Node.js (LTS version recommended)
*   `npm` or `yarn` (Node.js package manager)
*   A web browser
*   Google Gemini API Key

### 1. Backend Setup

The backend is located in `backend`.

Navigate to the `backend` directory:
```bash
cd backend
```

Install the Node.js dependencies:
```bash
npm install
```

Edit .env to include the following - you can set up a Gemini key here: https://aistudio.google.com/api-keys
```
GEMINI_API_KEY=<Set Up A Key on Gemini>
USER_EMAIL=xxx
USER_PASS=xxx
```

### 2. Frontend Setup

The Next.js frontend is located in the `frontend` directory. It has already been initialized.

Navigate to the `frontend` directory:
```bash
cd frontend
```

Install the Node.js dependencies:
```bash
npm install
```

Create .env file with the backend URL:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### 3. How to Run

To run the full application, you need to start both the backend and the frontend servers.

**Start Backend:**
Open a new terminal, navigate to `backend`, and run:
```bash
npm start
```

The backend server will typically run on `http://localhost:3001`.

**Start Frontend:**
Open another new terminal, navigate to `frontend`, and run:
```bash
npm run dev
```
The frontend development server will typically run on `http://localhost:3000`. Open this URL in your web browser to access the application.

## 💡 How to Contribute

*   **Backend Developers:** Your primary focus is `backend/server.js`. Enhance the API endpoints for permit detection, objection generation, legal citations, and submission tracking.
*   **Frontend Developers:** Your work will be in the `frontend/src/app/` directory. Enhance the user interface, improve user experience, and handle dynamic content display using React and Next.js. Ensure smooth communication with the backend API.
*   **AI/ML Engineers:** Collaborate closely with the backend team to craft effective and legally sound prompts for the Gemini API. Your expertise will ensure the generated objection letters are persuasive and accurate.
*   **Full Stack Developers:** Focus on integration between frontend and backend, ensuring the entire system works seamlessly.

Refer to `hackathon_plan.md` for a detailed timeline and specific tasks for the upcoming hackathon.

---

**"We help communities say NO to unethical farms, instantly."**
