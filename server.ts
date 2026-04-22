import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { dataService } from "./src/services/dataService";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/signup", async (req, res) => {
    const { email, password, fullName } = req.body;
    const { data: authData, error: authError } = await dataService.signUp(email, password, fullName);
    
    if (authError) {
      return res.status(400).json({ success: false, message: authError.message });
    }
    
    res.json({ success: true, message: "ثبت‌نام موفقیت‌آمیز بود. منتظر تایید مدیر بمانید." });
  });

  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    const { user, error } = await dataService.login(email, password);
    
    if (error) {
      return res.status(401).json({ success: false, message: error });
    }
    
    res.json({ success: true, user });
  });

  app.get("/api/activities", async (req, res) => {
    const logs = await dataService.getRecentActivities();
    res.json(logs);
  });

  app.get("/api/drivers", async (req, res) => {
    const drivers = await dataService.getDrivers();
    res.json(drivers);
  });

  app.get("/api/stats", async (req, res) => {
    const stats = await dataService.getStats();
    res.json(stats);
  });

  app.get("/api/cards/recent", async (req, res) => {
    const cards = await dataService.getRecentCards();
    res.json(cards);
  });

  app.get("/api/cards/:cardId", async (req, res) => {
    const result = await dataService.getCardById(req.params.cardId);
    if (result) {
      res.json({ success: true, ...result });
    } else {
      res.status(404).json({ success: false, message: "کارت یافت نشد" });
    }
  });

  app.post("/api/cards", async (req, res) => {
    const { driverId, location, userEmail } = req.body;
    const newCard = await dataService.createCard(driverId, location, userEmail || "سیستم");
    res.status(201).json(newCard);
  });

  app.post("/api/drivers", async (req, res) => {
    const { name, licensePlate, vehicleType, licenseNumber, photo, bloodType, tazkiraNumber, phoneNumber, userEmail } = req.body;
    const driver = await dataService.createDriver({ 
      name, 
      licensePlate, 
      vehicleType, 
      licenseNumber, 
      photo,
      bloodType,
      tazkiraNumber,
      phoneNumber
    }, userEmail || "سیستم");
    res.json({ success: true, driver });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
