# Snap Tutor 🍎🚀

A full-stack mobile application built with **React Native**, **Tailwind CSS**, **Express.js**, and **MongoDB**.

Designed from the ground up to support modern nutrition and meal tracking, with a clean architecture prepared for future **AI Chatbot** and **Authentication** extensions.

---

## 📱 Features Included

### 1. 🏠 Home Screen (`HomeScreen.js`)
- **Daily Calorie Budget**: Interactive progress card displaying consumed vs remaining calories against your daily target.
- **Macro Breakdown**: Visual protein, carbohydrate, and fat progress bars.
- **Quick Action Grid**:
  - `+ Log Meal`: Quick meal modal launcher
  - `💧 +1 Water`: One-tap hydration logger
  - `📸 Snap Food`: Computer vision food analyzer preview
  - `💬 Ask Tutor`: AI Tutor & Nutritionist chatbot preview
- **Today's Meals Preview**: List of recently logged foods with calories and macros.
- **Streak Tracker**: Daily activity streak badge.

### 2. 🥗 Diet Screen (`DietScreen.js`)
- **Categorized Meal Logging**:
  - 🍳 **Breakfast** (recommended ~500 kcal)
  - 🥗 **Lunch** (recommended ~700 kcal)
  - 🍲 **Dinner** (recommended ~600 kcal)
  - 🍎 **Snacks & Extras** (recommended ~300 kcal)
- **Interactive Hydration Tracker**: 8-cup visual tracker with real-time `+` and `-` controls.
- **Log New Meal Modal**: Add custom food name, portion, calories, protein, carbs, and fat.
- **Meal Management**: Delete meals with instant recalculation of daily macro totals.

### 3. 👤 Profile Screen (`ProfileScreen.js`)
- **User Profile Header**: Avatar, name, email, and Pro Member status badge.
- **Physical Metrics & BMI Calculator**: Weight (kg), Height (cm), and live BMI calculation with health category indicators.
- **Nutrition Targets Editor**: Edit daily calorie goal with inline validation.
- **Dietary Style Picker**: Interactive selector for *Balanced*, *High Protein*, *Keto*, *Vegan*, *Vegetarian*, and *Low Carb*.
- **AI Tutor & Chatbot Settings**: Persona and snap sensitivity configuration.
- **Account & Security Ready**: Sign out handler and token structure ready for JWT authentication.

---

## 📂 Project Architecture

```
Snap-Tutor-app/
├── client/                     # React Native Expo Mobile App
│   ├── src/
│   │   ├── components/         # Reusable Tailwind UI components (Header, StatCard, MealModal)
│   │   ├── context/            # AuthContext (auth-readiness & global state)
│   │   ├── navigation/         # Bottom Tab navigation
│   │   ├── screens/            # HomeScreen, DietScreen, ProfileScreen
│   │   ├── services/           # Axios API service with offline fallback support
│   │   └── theme/              # Tailwind CSS configuration helper
│   ├── tailwind.config.js      # Tailwind palette and styles
│   ├── App.js                  # NavigationContainer & Tab Bar configuration
│   └── package.json
│
└── server/                     # Express.js + MongoDB Backend
    ├── src/
    │   ├── config/             # Mongoose connection with graceful offline fallback
    │   ├── controllers/        # dietController.js, userController.js
    │   ├── middleware/         # authMiddleware.js (JWT-ready)
    │   ├── models/             # User.js, Meal.js, Chat.js (Mongoose models)
    │   ├── routes/             # dietRoutes.js, userRoutes.js, healthRoutes.js, chatRoutes.js
    │   ├── seed.js             # Initial database seed script
    │   └── server.js           # Express app bootstrap
    ├── .env                    # Environment variables (PORT, MONGODB_URI)
    └── package.json
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **MongoDB**: (Optional) Local MongoDB (`mongodb://localhost:27017`) or MongoDB Atlas URI. *The server includes an in-memory fallback so you can run and test the app immediately even without MongoDB running!*

---

### 2. Start the Express Backend

```bash
cd server
npm install
npm run dev
```

The server starts at `http://localhost:5000`:
- **Health Check**: `GET http://localhost:5000/api/health`
- **Today's Diet**: `GET http://localhost:5000/api/diet/today`
- **User Profile**: `GET http://localhost:5000/api/user/profile`

*(Optional)* Seed sample data into MongoDB:
```bash
npm run seed
```

---

### 3. Start the React Native App

In a separate terminal:
```bash
cd client
npm start
```

You can now run the app on:
- **Mobile Device**: Install **Expo Go** from Google Play Store or iOS App Store, then scan the QR code displayed in the terminal.
- **Android Emulator**: Press `a` in the terminal.
- **iOS Simulator**: Press `i` in the terminal (macOS only).
- **Web Browser**: Press `w` in the terminal.

> **Tip for physical devices**: When testing via Expo Go on your physical phone, update the `API_BASE_URL` in [client/src/services/api.js](file:///d:/desktop/projects/Snap-Tutor-app/client/src/services/api.js) to your machine's Wi-Fi IP (e.g. `http://192.168.1.50:5000/api`).

---

## 🔌 Future Features Roadmap

### 🤖 Chatbot Integration
- The backend already defines [Chat.js](file:///d:/desktop/projects/Snap-Tutor-app/server/src/models/Chat.js) and [chatRoutes.js](file:///d:/desktop/projects/Snap-Tutor-app/server/src/routes/chatRoutes.js).
- To connect an LLM, plug in your OpenAI, Gemini, or Anthropic API key into `chatRoutes.js`.

### 🔐 Authentication (JWT / OAuth)
- The frontend includes [AuthContext.js](file:///d:/desktop/projects/Snap-Tutor-app/client/src/context/AuthContext.js) and the backend includes [authMiddleware.js](file:///d:/desktop/projects/Snap-Tutor-app/server/src/middleware/authMiddleware.js).
- When you are ready for authentication, add `/api/auth/register` and `/api/auth/login` and store the token in AsyncStorage / SecureStore.
