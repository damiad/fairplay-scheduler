# FairPlay Scheduler 🏆

A fair, transparent, and effortless way for Googlers to organize and participate in recurring group activities. This app eliminates the "fastest finger first" frustration of event sign-ups by using an intelligent, priority-based queuing system.

## ✨ Features

- **Google Authentication**: Secure sign-in restricted to `@google.com` accounts.
- **Group Management**: Users can create and manage groups for their activities.
- **Recurring Event Creation**: Organizers can set up recurring events with detailed scheduling.
- **Fair, Priority-Based Registration**: An intelligent algorithm sorts participants to give everyone a fair chance, prioritizing organizers, newcomers, and then by the longest time since last attendance.
- **Automatic Confirmed & Waiting Lists**: After a reveal deadline, lists are automatically generated and displayed.
- **Real-time Updates**: Built with Firestore for live updates on registrations and list changes.

## 🚀 Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS (via CDN)
- **Backend & Database**: Firebase (Authentication, Firestore)
- **Development Server**: Vite
- **Deployment**: No-build setup using ES Modules and `importmap`, deployable as a static site.

---

## 🛠️ Local Development Setup

Follow these steps to run the application on your local machine.

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (LTS version recommended) and npm.

### 2. Clone the Repository

```bash
git clone <your-repository-url>
cd <repository-directory>
```

### 3. Install Development Dependencies

This project uses a lightweight development server called Vite. Install it by running:

```bash
npm install
```

### 4. Firebase Configuration (Crucial Step)

This application requires a Firebase project to handle authentication and data storage.

1.  Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  In your new project, go to **Project Settings** (click the gear icon ⚙️).
3.  Under the **General** tab, scroll down to "Your apps".
4.  Click the web icon (`</>`) to create a new web app.
5.  Register the app (give it a nickname) but **skip the "Add Firebase SDK" step**. You only need the configuration object.
6.  You will see a `firebaseConfig` object. Copy it.

    ```javascript
    const firebaseConfig = {
      apiKey: "AIza...",
      authDomain: "your-project.firebaseapp.com",
      projectId: "your-project-id",
      storageBucket: "your-project.appspot.com",
      messagingSenderId: "123...",
      appId: "1:123:web:abc..."
    };
    ```

7.  Open the file `services/firebase.ts` in your code editor.
8.  **Replace the placeholder `firebaseConfig` object with the one you just copied from the Firebase console.**
9.  In the Firebase Console, navigate to **Authentication** from the left-side menu. Click **"Get started"**, then select **Google** from the list of sign-in providers and enable it.

### 5. Firestore Setup

1.  In the Firebase Console, navigate to **Firestore Database** from the left-side menu.
2.  Click **"Create database"**. Start in **test mode** for easy setup (you can secure it later). Choose a location closest to you.
3.  After the database is created, go to the **Rules** tab.
4.  **Replace the default rules with the following rules.** This is essential for securing your app's data.

    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
      
        // Helper function to check for @google.com domain
        function isGoogleUser() {
          return request.auth != null && request.auth.token.email.matches('.*@google\\.com');
        }

        // Users can only read/write their own profile
        match /users/{userId} {
          allow read: if isGoogleUser();
          allow create: if request.auth.uid == userId && isGoogleUser();
          allow update: if request.auth.uid == userId;
        }

        // Authenticated Google users can read groups
        match /groups/{groupId} {
          allow read: if isGoogleUser();
          allow create: if isGoogleUser();
          // Only owners can update the group details
          allow update: if isGoogleUser() && request.auth.uid in resource.data.ownerUids;
        }

        // Event Templates
        match /events/{eventId} {
          allow read: if isGoogleUser();
          // Only owners of the associated group can create/update event templates
          allow create, update: if isGoogleUser() && request.auth.uid in get(/databases/$(database)/documents/groups/$(request.resource.data.groupId)).data.ownerUids;
        }

        // Event Instances
        match /eventInstances/{instanceId} {
          allow read: if isGoogleUser();
          // Creating instances should ideally be a backend function, but for client-side MVP:
          allow create: if isGoogleUser() && request.auth.uid in get(/databases/$(database)/documents/groups/$(request.resource.data.groupId)).data.ownerUids;
          // Any authenticated Google user can register/resign (update participants)
          allow update: if isGoogleUser();
        }
      }
    }
    ```
5.  Click **Publish**.

### 6. Create Firestore Index (Important!)

The app needs a specific index to query events for each group. Without it, you will see the `The query requires an index` error in the developer console.

**Easiest Method (Recommended):**

1.  Run the application locally (`npm run dev`).
2.  Navigate to a group page after creating a group and at least one event.
3.  Open your browser's developer console (F12 or Ctrl+Shift+I).
4.  You will see an error message starting with `The query requires an index...`. This message contains a **direct link** to the Firebase Console to create the required index.
5.  Click that link. It will pre-fill all the necessary information for the index.
6.  Review the details and click **"Create Index"**. The index will take a few minutes to build.

**Manual Method:**

If the link doesn't work or you prefer to do it manually:

1.  In the Firebase Console, go to your **Firestore Database**.
2.  Click the **Indexes** tab at the top.
3.  Click **"Create index"**.
4.  For **Collection ID**, enter `eventInstances`.
5.  Under **Fields to index**, add the following fields in this exact order:
    - Field path: `groupId`, Order: `Ascending`
    - Field path: `eventStartDateTime`, Order: `Ascending`
6.  For **Query scopes**, select `Collection`.
7.  Click **"Create Index"**.

The index will take a few minutes to build. Once it's enabled, the error will be resolved, and events will load correctly.


### 7. Run the App

You're all set! Start the local development server:

```bash
npm run dev
```

This will open the application in your browser, typically at `http://localhost:5173`.

---

## 🌐 Deploying to GitHub Pages (Easy, No-Build Method)

This project is set up to be deployed as a static site without any build step, which makes deploying to GitHub Pages very simple.

1.  **Create a GitHub Repository**: Create a new repository on [GitHub](https://github.com/new) and push your project files to the `main` branch.

2.  **Enable GitHub Pages**:
    - In your repository on GitHub, go to the **Settings** tab.
    - In the left sidebar, click on **Pages**.
    - Under the "Build and deployment" section, for the **Source**, select **"Deploy from a branch"**.
    - Under "Branch", select `main` and `/ (root)` for the folder, then click **Save**.

That's it! GitHub will build and deploy your site. It might take a few minutes. You will find the public URL for your live site on the same settings page.