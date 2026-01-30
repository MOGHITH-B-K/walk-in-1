# SmartPOS - Modern Walk-in Billing System

SmartPOS is a feature-rich, local-first Point of Sale (POS) application designed for cafes, small bistros, and retail shops. It combines a sleek user interface with AI-powered capabilities to streamline inventory management and customer billing.

## 🚀 Features

- **Dynamic Billing (POS):** 
  - Intuitive grid-based menu with category filtering.
  - Real-time cart calculations including automated tax (10%).
  - Manual quantity input mode for bulk orders.
  - Interactive stock validation (prevents over-selling).
- **Inventory Management (CRUD):**
  - Full Product Management: Create, Read, Update, and Delete items.
  - **AI Fill:** Uses Google Gemini API to automatically generate appetizing descriptions, suggest categories, and recommend market prices based only on the product name.
  - Image Uploads: Attach photos to products for easier identification.
  - "Save & Bill": A specialized workflow to add a new product and immediately jump to the billing screen.
- **Order History:**
  - Complete searchable log of all past transactions.
  - One-click receipt re-printing.
- **Customizable Shop Settings:**
  - Branding: Upload your shop logo and set your business address/contact details.
  - Digital Payments: Upload a Payment QR code that appears automatically on every printed receipt.
- **Local-First & Offline:** 
  - Powered by **IndexedDB**, ensuring all your data stays on your device and the app works without an active internet connection (except for AI generation).

## 🛠️ Tech Stack

- **Frontend:** React (v18), TypeScript, Tailwind CSS
- **Icons:** Lucide React
- **Database:** IndexedDB (via `idb` library)
- **AI Integration:** Google Gemini API (@google/genai)
- **Build Tool:** Vite

## ⚙️ Setup & Installation

1. **Prerequisites:**
   - Node.js (v18+)
   - A Google AI Studio API Key (from [ai.google.dev](https://aistudio.google.com/))

2. **Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   API_KEY=your_gemini_api_key_here
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Run Development Server:**
   ```bash
   npm run dev
   ```

## 🚀 Deployment

This application is a **Static Web Application**. It runs entirely in the browser. You can deploy it to any static hosting provider like Vercel, Netlify, or GitHub Pages.

### Option 1: Vercel (Recommended)
1. Push your code to a GitHub repository.
2. Go to [Vercel](https://vercel.com) and sign up/login.
3. Click **"Add New Project"** and select your repository.
4. In the **"Environment Variables"** section:
   - Key: `API_KEY`
   - Value: Your Google Gemini API Key.
5. Click **"Deploy"**.

### Option 2: Netlify
1. Push your code to GitHub.
2. Go to [Netlify](https://netlify.com) and sign up/login.
3. Click **"Add new site"** > **"Import from Git"**.
4. Select your repository.
5. Under **"Site settings"** > **"Environment variables"**:
   - Add a variable named `API_KEY` with your Gemini API key.
6. Click **"Deploy site"**.

### Option 3: Manual Build
You can build the project locally and host the files manually.
1. Run the build command:
   ```bash
   npm run build
   ```
2. This creates a `dist` folder containing `index.html` and assets.
3. Upload the contents of the `dist` folder to any standard web server (Apache, Nginx, AWS S3, etc.).

**Note:** Since this is a client-side application, your API Key will be embedded in the browser code. Ensure you set restrictions on your API Key in the Google AI Studio console (e.g., restrict by HTTP Referrer to your domain) to prevent unauthorized usage.

## 📋 Usage Tips

- **Printing Receipts:** When the "Pay & Print" button is clicked, a professional receipt is generated. Ensure your browser's "Background Graphics" setting is turned on in the print dialog to see all styling elements.
- **AI Assist:** If you're adding a common item like "Chocolate Brownie," simply type the name and click the **AI Fill** button. The system will handle the description and suggest a price for you.
- **Stock Alerts:** Products with 5 or fewer items remaining will show a red warning badge in the menu to alert staff to restock.

## 🛡️ Privacy
All business data (products, orders, settings) is stored locally in your browser's IndexedDB. No transaction data is sent to external servers. Only product names are sent to Google Gemini if you choose to use the "AI Fill" feature.

---
*Created with focus on speed, aesthetics, and user experience.*