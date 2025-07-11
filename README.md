# 🌱 CropGen Web Application Backend

The CropGen Web Application Backend powers the server-side functionality for the CropGen platform, enabling advanced crop data analysis and management using geospatial data from Google Earth Engine.

---

## 📖 Description

The CropGen Web Application Backend provides robust server-side logic to support the CropGen platform. It facilitates crop data analysis and management by leveraging geospatial information from Google Earth Engine, offering a scalable and secure backend for agricultural data processing.

---

## ✨ Features

- **User Authentication & Authorization:** Secure user management with JWT-based authentication.  
- **File Upload & Management:** Seamless file handling and storage using Cloudinary.  
- **Geospatial Data Processing:** Analyze crop data with Google Earth Engine integration.  
- **Email Notifications:** Automated email alerts powered by Nodemailer.  
- **RESTful API Endpoints:** Well-structured APIs for seamless frontend integration.  
- **Database Management:** Dual support for MongoDB (via Mongoose) and MySQL (via Sequelize).  

---

## 🛠️ Technologies Used

- **Node.js:** Runtime environment for server-side JavaScript  
- **Express.js:** Web framework for building RESTful APIs  
- **MongoDB with Mongoose:** NoSQL database for flexible data storage  
- **MySQL with Sequelize:** Relational database for structured data  
- **Google Earth Engine:** Geospatial data processing and analysis  
- **Cloudinary:** Cloud-based file upload and management  
- **Firebase:** Backend services for authentication and notifications  
- **JWT:** Secure token-based authentication  
- **Jest:** Testing framework for unit and integration tests  

---

## 📋 Prerequisites

Before setting up the project, ensure you have the following:

- Node.js (version 14 or later)  
- MongoDB (running locally on port 27017 or configured via `MONGODB_URI`)  
- MySQL (running locally or configured via environment variables)  
- Google Earth Engine account with a service account key  
- Cloudinary account with API credentials  
- Firebase project with a service account key  
- Email account for sending notifications (e.g., Gmail)  

---

## 🚀 Installation

### 1. Clone the Repository:

```bash
git clone https://github.com/[username]/cropgen-web-application-backend.git
cd cropgen-web-application-backend
