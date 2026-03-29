# ClipForge — Video Editor

Éditeur vidéo web complet : import YouTube/Instagram/Facebook, découpage, audio, sous-titres, export MP4.

---

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind |
| State | Zustand |
| Backend | Fastify + TypeScript |
| Traitement vidéo | FFmpeg (fluent-ffmpeg) |
| Download | yt-dlp |
| Conteneurs | Docker + Docker Compose |

---

## Démarrage rapide (développement local)

### Prérequis

```bash
# Windows — via winget
winget install FFmpeg
winget install yt-dlp

# ou via Scoop
scoop install ffmpeg yt-dlp

# Vérifier
ffmpeg -version
yt-dlp --version
node --version   # >= 18
```

### 1. Backend

```bash
cd backend
npm install
npm run dev
# → http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Démarrage avec Docker (production)

```bash
# Depuis la racine du projet
docker-compose up --build

# Frontend : http://localhost:5173
# Backend  : http://localhost:3001
# Redis    : localhost:6379
```

---

## Structure du projet

```
video-editor/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Entry point Fastify
│   │   ├── routes/
│   │   │   ├── download.ts       # POST /api/download (yt-dlp)
│   │   │   ├── upload.ts         # POST /api/upload (fichier local)
│   │   │   ├── process.ts        # POST /api/cut, /api/merge-audio, /api/export
│   │   │   └── subtitles.ts      # POST /api/subtitle/*
│   │   └── utils/
│   │       ├── ffmpeg.ts         # Wrappers FFmpeg (cut, audio, subs, export)
│   │       └── ytdlp.ts          # Wrapper yt-dlp
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Layout principal + routing tabs
│   │   ├── api/client.ts         # Toutes les calls API
│   │   ├── store/useStore.ts     # State global Zustand
│   │   └── components/
│   │       ├── ImportPanel/      # Import URL + upload fichier
│   │       ├── VideoPlayer/      # Player + contrôles trim
│   │       ├── AudioEditor/      # Upload audio + mix/replace
│   │       ├── SubtitleEditor/   # Éditeur SRT inline
│   │       └── ExportPanel/      # Qualité + export final
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

---

## API Reference

### Import
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/info` | Infos vidéo (sans télécharger) |
| POST | `/api/download` | Télécharger depuis URL |
| POST | `/api/upload` | Upload fichier vidéo |
| POST | `/api/upload-audio` | Upload fichier audio |

### Traitement
| Méthode | Route | Body |
|---------|-------|------|
| POST | `/api/cut` | `{ filename, startTime, endTime }` |
| POST | `/api/merge-audio` | `{ videoFilename, audioFilename, volume, replaceOriginal }` |
| POST | `/api/export` | `{ filename, quality, startTime, endTime, audioFilename, subtitleFilename }` |

### Sous-titres
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/subtitle/upload` | Upload fichier .srt |
| POST | `/api/subtitle/create` | Créer .srt depuis JSON |
| POST | `/api/subtitle/burn` | Brûler sous-titres dans vidéo |

---

## Fonctionnalités

- [x] Import vidéo via URL (YouTube, Instagram, Facebook, TikTok)
- [x] Upload vidéo locale (MP4, MOV, AVI, MKV)
- [x] Découpage (trim start/end avec slider visuel)
- [x] Preview vidéo en temps réel
- [x] Upload et mixage audio (mix ou remplacement)
- [x] Contrôle du volume audio
- [x] Éditeur de sous-titres SRT inline
- [x] Import fichier .srt existant
- [x] Export MP4 (480p / 720p / 1080p)
- [x] Brûlage des sous-titres dans la vidéo exportée

## Prochaines étapes possibles

- [ ] Transcription automatique (Whisper)
- [ ] File d'attente asynchrone (BullMQ) avec progression en temps réel
- [ ] Stockage S3 / Cloudflare R2
- [ ] Assemblage multi-clips
- [ ] Filtre couleur / LUT
- [ ] Filigrane / watermark texte

---

## Notes légales

> Télécharger des vidéos YouTube, Instagram ou Facebook peut violer leurs conditions d'utilisation.
> Utilisez cet outil uniquement pour du contenu dont vous êtes propriétaire ou que vous avez le droit d'utiliser.
