# Automated Factory Farm Objection Generator (AFOG)

teammate please refere plan.txt for future progress

## 🚀 Project Overview

The **Automated Factory Farm Objection Generator (AFOG)** is a hackathon project designed to empower citizens and NGOs to effectively oppose factory farm planning permit applications. Our system automates the detection of mock permit filings and leverages AI to generate compelling, legally-referenced objection letters.

### Key Features:
*   **Mock Permit Detection:** Simulates the identification of new factory farm permit applications.
*   **AI-Powered Letter Generation:** Uses the Gemini API to draft persuasive objection letters, citing relevant Indian environmental and animal welfare regulations.
*   **Downloadable Letters:** Provides generated letters in a downloadable format (e.g., `.pdf`).
*   **Email Alerts (Mock):** Simulates email notifications for new permit filings.use node mailer.
*   **User-Friendly Web Interface:** A simple interface for viewing mock permits and generating letters.

## ⚙️ Tech Stack

| Component     | Technology Used               | Notes                                                              |
|---------------|-------------------------------|--------------------------------------------------------------------|
| **Frontend**  | Next.js (React), Tailwind CSS | A powerful React framework for building modern web applications with integrated styling. ESLint is configured for code quality. |
| **Backend**   | Node.js        | A web framework for handling API requests and AI integration. It serves as the brain for data processing and AI interaction. |
| **AI/LLM**    | Google Gemini API             | For generating intelligent and context-aware objection letters. This is the core AI component. |
| **Data Storage**| JSON File (Mock Database)     | Simple, file-based storage for mock permit data within the backend. No complex database setup needed for the hackathon. |
| **Email**     | Actual email comes  | use Node mailer  | For simulating email alerts . |

## 📂 Project Structure

```
Hackathon/
├── AFOG_Project/
│   ├── backend/
│   │   ├── app.py                # Flask application: Defines API endpoints for permit detection and letter generation.
│   │   ├── requirements.txt      # Python dependencies: Lists all necessary Python libraries (e.g., Flask, google-generativeai).
│   │   └── permits.json          # Mock permit data: A JSON file simulating a database of factory farm permit applications.
├── frontend/                     # Next.js application: The user-facing web interface.
│   ├── public/                   # Static assets: Images, fonts, and other static files.
│   ├── pages/                    # React components for routes: Each file here becomes a route (e.g., index.js for the homepage).
│   ├── styles/                   # Global CSS: Contains global styles and Tailwind CSS imports.
│   ├── components/               # Reusable React components: UI elements shared across different pages.
│   ├── package.json              # Node.js project dependencies: Lists all frontend libraries (e.g., React, Next.js, Tailwind CSS).
│   ├── next.config.js            # Next.js configuration: Custom settings for the Next.js build.
│   ├── tailwind.config.js        # Tailwind CSS configuration: Customizes Tailwind's utility classes.
│   └── postcss.config.js         # PostCSS configuration: Processes CSS with plugins like Autoprefixer and Tailwind CSS.
├── README.md                     # Project overview and setup instructions: This file!
└── plan.txt                      # Detailed hackathon plan and timeline: A step-by-step guide for the team.
```

## 🚀 Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

*   Python 3.8+
*   `pip` (Python package installer)
*   Node.js (LTS version recommended)
*   `npm` or `yarn` (Node.js package manager)
*   A web browser

### 1. Backend Setup

The backend is located in `AFOG_Project/backend`.

Navigate to the `backend` directory:
```bash
cd AFOG_Project/backend
```

Install the required Python packages:
```bash
pip install -r requirements.txt
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
# or yarn install
```

### 3. How to Run

To run the full application, you need to start both the backend and the frontend servers.

**Start Backend:**
Open a new terminal, navigate to `AFOG_Project/backend`, and run:
```bash
python app.py
```
The backend server will typically run on `http://127.0.0.1:5000`.

**Start Frontend:**
Open another new terminal, navigate to `frontend`, and run:
```bash
npm run dev
# or yarn dev
```
The frontend development server will typically run on `http://localhost:3000`. Open this URL in your web browser to access the application.

### 4. AI API Key (Future Step)

Once you start integrating the Gemini API, you will need an API key. This will be configured within the `AFOG_Project/backend/app.py` file. For now, the AI integration is a placeholder, but the structure is ready for it.

## 💡 How to Contribute

*   **Backend Developers:** Your primary focus is `AFOG_Project/backend/app.py`. Implement the actual Gemini API integration for letter generation, refine the logic for reading `permits.json`, and ensure the API endpoints are robust.
*   **Frontend Developers:** Your work will be in the `frontend/` directory, primarily `pages/index.js`, `components/`, and `styles/`. Enhance the user interface, improve user experience, and handle dynamic content display using React and Next.js. Ensure smooth communication with the backend API.
*   **AI Prompt Engineers:** Collaborate closely with the backend team to craft effective and legally sound prompts for the Gemini API. Your expertise will ensure the generated objection letters are persuasive and accurate.

Refer to `plan.txt` for a detailed timeline and specific tasks.

---

**"We help communities say NO to unethical farms, instantly."**
