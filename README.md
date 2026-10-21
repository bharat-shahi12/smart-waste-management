# Smart Waste Management System

A complete full-stack IoT Smart Waste Management System built for smart cities, featuring real-time hardware integration, comprehensive monitoring, and optimized collection routing.

## 🌟 Features
- **Real-Time IoT Integration:** Receive sensor data (Fill Level, Air Quality, Temp, Humidity, Moisture) directly from ESP32.
- **Live WebSocket Updates:** Dashboards update instantly without refreshing.
- **Smart Analytics & Alerts:** Automated overflow and air quality alerts.
- **Interactive Mapping:** Real-time dustbin monitoring using Leaflet/OSRM routing.
- **Role-Based Access:** Admin, Authority, Collector, and Public User portals.

## 🏗️ Technology Stack
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Leaflet, Recharts
- **Backend:** Java 21, Spring Boot 3.2, Spring Security (JWT), WebSocket (STOMP)
- **Database:** PostgreSQL (Neon) with Flyway Migrations
- **Hardware (Supported):** ESP32, HC-SR04, MQ-135, DHT11/22, Moisture Sensor

## 🚀 Quick Start

### 1. Database Setup (Neon PostgreSQL)
Create a `.env` file in the `backend` directory based on `.env.example`:
```env
DATABASE_URL=jdbc:postgresql://your-neon-host/db?sslmode=require
DATABASE_USERNAME=your_username
DATABASE_PASSWORD=your_password
JWT_SECRET=super_secret_jwt_key_that_should_be_long_enough
```

### 2. Backend Setup
```bash
cd backend
./mvnw clean compile
./mvnw spring-boot:run
```
*Note: Flyway will automatically run V1-V7 migrations, creating tables and inserting seed demo data.*

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 📡 ESP32 API Endpoint
The hardware can send data to the backend via HTTP POST.

**Endpoint:** `POST /api/iot/sensor-data`

**Example Payload:**
```json
{
  "deviceId": "BIN-001",
  "fillLevel": 87.5,
  "temperature": 31.4,
  "humidity": 62.5,
  "airQuality": 178.0,
  "moisture": 72.0,
  "latitude": 28.6139,
  "longitude": 77.2090,
  "batteryLevel": 91.0
}
```

## 🧑‍💻 Demo Accounts
- **Admin:** admin@example.com
- **Authority:** authority@example.com
- **Collector:** collector1@example.com
- **User:** user@example.com
- **Password:** `password` (for all)

## 📁 Project Structure
```
├── backend/                  # Spring Boot Application
│   ├── src/main/java/...     # Java Sources (Controllers, Services, IoT)
│   ├── src/main/resources/   # application.yml, db/migration
├── frontend/                 # React Application (Vite)
│   ├── src/pages/            # Dashboards, Maps, Authentication
│   ├── src/components/       # UI Components
│   └── src/context/          # React Context (Auth)
└── README.md
```

## 🛠️ Known Limitations & Future Work
- The OSRM routing is integrated in concept; a dedicated OSRM instance is needed for production route optimization.
- The moisture-based classification is an approximation and should not substitute physical waste sorting facilities.
