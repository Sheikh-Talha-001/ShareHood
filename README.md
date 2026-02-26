# ShareHood 🏘️ 
**Stop Buying. Start Borrowing.**

ShareHood is a hyper-local, community-driven neighborhood sharing platform. It allows verified neighbors and university students to safely lend and borrow household items, tools, camping gear, and textbooks. 

Built as a 6th-semester Web Engineering project, ShareHood aims to reduce hyper-consumerism by building a trusted network of shared local resources.

## ✨ Core Features
* **Geo-Fenced Discovery:** Users set their home location and discover available items within a strict 2km-10km radius using map integration.
* **Neighborhood Trust Engine:** A robust trust score system built on successful exchanges, peer reviews, and multi-factor identity verification (CNIC/University ID).
* **The "Digital Handshake":** A secure, binding digital agreement interface to formalize the handover and return of borrowed items.
* **Real-Time Inventory Management:** Users can pause, edit, and track their active listings and lending history.
* **In-App Messaging:** Secure communication between borrowers and lenders prior to physical handovers.
* **Favorites & Bookmarks:** Save items for future projects.

## 🛠️ Technology Stack
**Frontend (Client)**
* React.js (via Vite)
* Tailwind CSS (v3) for utility-first styling
* Google Stitch / v0.dev for UI Component Generation

**Backend (Server & API)**
* Python 3.10+
* Django & Django REST Framework (DRF)
* JWT Authentication

**Database & Storage**
* PostgreSQL (Relational Database)
* Cloudinary (For dynamic item image hosting)

---

## 🚀 Getting Started (Local Development)

To get a local copy up and running, follow these simple steps.

### Prerequisites
Make sure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v20 LTS recommended)
* [Python](https://www.python.org/downloads/) (v3.10 or higher)
* [PostgreSQL](https://www.postgresql.org/download/)
* Git

### 1. Clone the Repository
bash
git clone [https://github.com/Sheikh-Talha-001/ShareHood.git](https://github.com/Sheikh-Talha-001/ShareHood.git)
cd ShareHood
2. Backend Setup (Django)
Open a terminal inside the main folder and run:

Bash
cd backend

# Create and activate the virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt # (Note: we will create this file soon!)
pip install django djangorestframework psycopg2-binary

# Run database migrations
python manage.py makemigrations
python manage.py migrate

# Start the Django development server (runs on [http://127.0.0.1:8000/](http://127.0.0.1:8000/))
python manage.py runserver
3. Frontend Setup (React)
Open a second terminal inside the main folder and run:

Bash
cd frontend

# Install Node dependencies
npm install

# Start the Vite development server (runs on http://localhost:5173/)
npm run dev
👥 Team Members
Muhammad Talha Arshad - Full-Stack Developer

Arslan - Full-Stack Developer

Developed for the Web Engineering course at the University of Sargodha.
