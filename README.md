# UnityWorks Server (Backend)

This is the server-side of **UnityWorks**, a Social Development Events Platform where users can create, join, and manage community-driven events.

## Live Server

Hosted on: `https://unityworks-server.vercel.app/`

---

## Features

* Secure REST API with Firebase AccessToken verification
* MongoDB-based CRUD for social events
* Event filtering (search and category)
* JWT protection for sensitive routes
* User email verification on access
* Separate collections for created and joined events
* Update, delete, and view functionality for user-created events

---

## API Routes

### Public Routes:

* `GET /events` - To Get all upcoming events
* `GET /events?search=&category=` - Search and filter events

### Protected Routes:

Require Firebase `accessToken` and query param `email`

* `POST /add-event` - Create a new event
* `GET /myEvents?email=` - View events created by user
* `GET /view-event/:id` - Get single event details
* `PATCH /events/:id` - Update event by creator
* `DELETE /events/:id` - Delete user-owned event
* `POST /join-event` - Add user to joined events
* `PATCH /join-event/:id` - Increment event participant count
* `GET /joined-events?email=` - Show events user has joined

---

## Tech Stack

* **Node.js & Express**
* **MongoDB (Atlas)**
* **Firebase Admin SDK** (Token Verification)
* **dotenv** (Environment configuration)
* **cors** (Cross-Origin Resource Sharing)

---

## NPM Packages Used

* `express`
* `cors`
* `mongodb`
* `firebase-admin`
* `dotenv`

---

## Deployment Notes

* Hosted on Vercel
* Environment variables configured via Vercel dashboard
* Firebase key is stored encoded in `.env` and parsed at runtime
* MongoDB URI also stored in `.env`

---

## Security

* All routes (except public ones) require a valid Firebase ID token
* Email validation is enforced server-side for authorization
* All sensitive keys stored in `.env`

