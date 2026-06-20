#  ShelfSense | Smart E-Library Portal

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase)
![Gemini AI](https://img.shields.io/badge/Gemini%20AI-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white)

ShelfSense is a modern, AI-integrated library management web portal designed to digitize and streamline library operations. It bridges the gap between physical and digital libraries by offering real-time seat tracking, automated book issuance via QR codes, and an intelligent AI Librarian powered by Google's Gemini.

##  Key Features

###  For Students
* **Digital Identity:** Auto-generated Digital Library Cards with scannable Barcodes and QR codes.
* **Interactive Seat Reservation:** A live floor plan allowing students to book desks and check in using dynamic QR scanners.
* **AI Librarian & Suggestions:** A built-in chatbot powered by Gemini API to answer queries, plus smart AI-driven book recommendations based on reading history.
* **Smart Dashboard:** Track borrowed books, upcoming due dates, and automatically calculated overdue fines (₹50/day).
* **E-Book Library:** Read PDF versions of digital resources directly within the portal.

###  For Administrators (Librarians)
* **Real-Time Seat Monitor:** A live map showing exactly which seats are occupied, reserved, or available.
* **Smart Inventory Management:** Add books manually or bulk-import via CSV. Upload and manage PDF e-books and cover images via Firebase Storage.
* **One-Click Issue/Return:** Approve student book requests and process returns seamlessly using the portal.
* **Student Database:** Manage registered students, track defaulters, and bulk-import student registries.

---

##  Tech Stack

* **Frontend:** HTML5, CSS3 (Custom Utility-First CSS), Vanilla JavaScript (ES6 Modules)
* **Backend & Database:** Firebase (Authentication, Firestore Database, Cloud Storage)
* **Artificial Intelligence:** Google Generative AI (Gemini 2.0 Flash)
* **APIs & Libraries:** * `EmailJS` (OTP Verification)
    * `html5-qrcode` & `qrcode.js` (QR Generation & Scanning)
    * `JsBarcode` (Digital ID generation)

---
