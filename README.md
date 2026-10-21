# Smart Waste Management System

A production-grade, full-stack IoT Smart Waste Management System designed for smart cities. Features real-time hardware telemetry from ESP32 microcontrollers, live WebSocket dashboard synchronization, automated overflow alerts, interactive GIS mapping, and role-based operational portals.

---

## 🌟 Key Features
- **Secure IoT Integration:** Authenticated endpoint (`POST /api/device/readings`) with per-device API key validation (`X-Device-Key`).
- **Telemetry Processing:** Fill level calculation from ultrasonic distance, temperature & humidity (DHT11), raw MQ gas sensor ADC readings, and GPS coordinates (NEO-6M).
- **Deduplicated Smart Alerts:** Automated `BIN_FULL`, `AIR_QUALITY`, and `LOW_BATTERY` alert dispatch with state-based resolution (no alert spam).
- **Live Real-Time Dashboards:** Instant WebSocket updates via STOMP/SockJS on `/topic/dustbins` and `/topic/alerts`.
- **Interactive Leaflet Maps:** Real-time dustbin fill markers with invalid coordinate filtering and routing views.
- **Role-Based Portals:** Dedicated interfaces for Administrators, City Authorities, Field Responders / Drivers, and Citizens.

---

## 🏗️ Technology Stack
- **Backend:** Java 21+ / Java 23, **Spring Boot 4.1.1**, Spring Security (Stateless JWT), Spring Data JPA, Flyway Migrations (V1–V23), WebSocket (STOMP / SockJS).
- **Database:** PostgreSQL (Neon Cloud) with connection pooling (HikariCP).
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Leaflet & React-Leaflet, Recharts, Lucide Icons, Axios.
- **Hardware Platform:** ESP32 (NodeMCU / DevKit V1), HC-SR04, DHT11, MQ Gas Sensor, NEO-6M GPS, I2C 16x2 LCD, LEDs, Active Buzzer.

---

## 🔌 Hardware Pinout & Wiring (ESP32)

Confirm the silkscreen labels on your physical board before wiring.

| Component | ESP32 Pin Connection | Telemetry / Purpose |
| :--- | :--- | :--- |
| **HC-SR04 Ultrasonic** | TRIG → **GPIO16**, ECHO → **GPIO17** | Distance measurement to waste surface |
| **DHT11 Sensor** | DATA → **GPIO19** | Temperature (°C) and Relative Humidity (%) |
| **MQ Gas Sensor** | AO (Analog Out) → **GPIO34** (ADC1) | Raw analog gas / smoke ADC reading |
| **NEO-6M GPS** | GPS TX → **GPIO4** (Hardware/Software Serial) | Latitude & Longitude *(valid satellite fix only)* |
| **I2C LCD Display** | SDA → **GPIO21**, SCL → **GPIO22** | Local status display (not a cloud source) |
| **Green LED** | **GPIO25** (via 220Ω resistor) | Local status: Bin Available / Safe |
| **Red LED** | **GPIO26** (via 220Ω resistor) | Local warning: Bin Full or Hazardous Gas |
| **Active Buzzer** | **GPIO27** (via transistor/driver if needed) | Local audible alarm on overflow or gas threshold |

> [!WARNING]
> **Electrical Safety Notice:**
> - The HC-SR04 ECHO pin outputs **5 V**, while ESP32 GPIOs tolerate a maximum of **3.3 V**. Use a simple voltage divider (e.g., 1kΩ + 2kΩ resistors) or a bidirectional logic level shifter on the ECHO line.
> - Some MQ sensor modules output up to 5 V analog signals. Ensure the analog input to GPIO34 does not exceed 3.3 V.
> - Ensure all components share a **common Ground (GND)** with the ESP32.

---

## 📡 Sensor Measurement Guidelines

- **Fill Level (%):** Calculated on the backend using the ultrasonic distance and internal bin height:
  $$\text{Fill \%} = \frac{\text{Bin Height} - \text{Distance}}{\text{Bin Height}} \times 100$$
  *(For a 100 cm bin and 18 cm distance, the fill level is 82%).*
- **Gas Sensor Readings:** The MQ sensor on GPIO34 produces a raw 12-bit ADC value ($0\text{–}4095$). In clean ambient air, typical ADC values range from $300\text{–}800$; smoke or gas presence spikes this above $2000\text{–}2500$. Do not label raw ADC readings as calibrated ppm. The backend automatically differentiates raw ADC ($\ge 1000$) from normalized ppm ($< 1000$).
- **GPS Coordinates:** Transmit latitude/longitude only when the GPS has an active satellite fix. If the module reports $(0.0, 0.0)$ or invalid fix, omit coordinates to prevent corrupting the dustbin's registered map location.
- **Omit Inactive Sensors:** If a sensor (e.g., moisture, battery gauge) is not installed, omit the field from the JSON payload. Do not transmit mock or fabricated values.

---

## 🚀 API Endpoint Reference

### `POST /api/device/readings`
*(Aliases: `/api/device/data`, `/api/device/telemetry`)*

**Authentication:** Requires the device key in the HTTP header or JSON payload.

#### Headers:
```http
Content-Type: application/json
X-Device-Key: YOUR_DEVICE_API_KEY
```

#### Request Payload:
```json
{
  "deviceId": "ESP32_101",
  "distance": 18.0,
  "binHeight": 100.0,
  "temperature": 27.2,
  "humidity": 58.0,
  "airQuality": 650.0,
  "latitude": 28.6250,
  "longitude": 77.3800
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "message": "Sensor readings processed successfully",
  "deviceId": "ESP32_101",
  "binName": "College Main Gate Bin",
  "status": "FULL",
  "fillLevel": 82.0,
  "led": "RED",
  "buzzer": true,
  "pollIntervalSeconds": 10,
  "serverTime": "2026-10-21T21:15:00+05:30"
}
```

> **Local Hardware Testing:** When testing with physical hardware, replace `localhost` with your computer's local Wi-Fi IP address (e.g., `http://192.168.1.50:8081/api/device/readings`). Ensure your laptop firewall permits inbound connections on port `8081`.

---

## 💻 Environment Setup & Run Instructions

### 1. Backend Setup
Create `backend/.env` (using `backend/.env.example` as a template):
```env
DATABASE_URL=jdbc:postgresql://YOUR_NEON_HOST/neondb?sslmode=require
DATABASE_USERNAME=neondb_owner
DATABASE_PASSWORD=YOUR_PASSWORD
JWT_SECRET=YOUR_RANDOM_LONG_SECRET_KEY
DEVICE_API_KEY=YOUR_MASTER_DEVICE_KEY
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Start the Spring Boot backend:
```bash
cd backend
./mvnw clean compile
./mvnw spring-boot:run
```

### 2. Frontend Setup
Create `frontend/.env.local` (using `frontend/.env.example` as a template):
```env
VITE_API_BASE_URL=http://localhost:8081/api
VITE_WS_URL=http://localhost:8081/ws
VITE_SERVER_URL=http://localhost:8081
```

Start the Vite development server:
```bash
cd frontend
npm install
npm run dev
```

---

## 🧑‍💻 Default Accounts & Testing
- **Admin Portal:** `admin@smartwaste.com` / `password`
- **Field Responder Portal:** `responder123@gmail.com` / `password`
- **Citizen Portal:** `bharat123@gmail.com` / `password`
