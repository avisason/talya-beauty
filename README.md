# Talya Beauty - Client Management System

A beautiful and elegant CRM system built with Next.js, TypeScript, and Firebase.

## Features

- 🔐 **Google Authentication** - Secure login via Gmail
- 📊 **Lead Management** - Track all your client inquiries
- 📝 **Chronological Timeline** - Document daily interactions with clients
- 🏷️ **Status Tracking** - New, Initial Response, Follow-up, Closed
- 💰 **Payment Tracking** - Track advance payments
- 🎨 **Beautiful UI** - Elegant rose gold theme with modern design

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Firebase Setup

The Firebase configuration is already set up. Make sure to:

1. Enable Google Authentication in Firebase Console
2. Add your domain to authorized domains in Firebase Auth settings
3. Create a Firestore database in Firebase Console

### Firestore Rules

Add these rules to your Firestore database:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leads/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Data Schema

Each lead contains:
- **Full Name** - Client's name
- **Source** - Instagram, TikTok, Facebook, Email
- **Status** - New, Initial response, Follow-up, Closed
- **Inquiry Type** - Quote request, Pricing, General inquiry
- **Closed** - Yes/No
- **Advance Payment** - Yes/No
- **Additional Details** - Free text
- **Important Notes** - Notes to remember
- **Description Timeline** - Chronological entries with skip option

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Firebase** - Authentication & Firestore database
- **React Hot Toast** - Notifications
- **date-fns** - Date formatting

